import type Stripe from 'stripe';
import {
  getStripeClient,
  planFromPriceId,
  billingPeriodFromPriceId,
} from '~~/server/utils/stripe';
import { LEGAL_POLICY_VERSION } from '~~/shared/utils/legal';
import { getRepositories } from '~~/server/repositories/factory';
import { logger } from '~~/server/utils/logger';
import { sendSubscriptionConfirmationEmail } from '~~/server/emails';
import {
  formatMoney,
  vatInclusiveAmount,
} from '~~/server/utils/stripe-billing';
import type { BillingLocale } from '~~/server/utils/stripe-billing';

// Answering 200 after a failed write would leave the stored plan stale for
// good; a 5xx makes Stripe redeliver the event.
function failIfNotStored(error: string | null, eventId: string): void {
  if (!error) return;
  logger.error(`Stripe event ${eventId} could not be stored: ${error}`);
  throw createError({
    statusCode: 500,
    statusMessage: 'Failed to store subscription',
  });
}

// Sends the durable-medium confirmation once per checkout session. The marker
// lives on the Stripe subscription, so webhook retries cannot double-send.
async function sendConfirmationOnce(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  eventId: string,
): Promise<void> {
  const email = session.customer_details?.email;
  const subId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;
  if (session.mode !== 'subscription' || !email || !subId) return;

  const sub = await stripe.subscriptions.retrieve(subId);
  if (sub.metadata?.confirmation_email_session === session.id) return;

  const price = sub.items.data[0]?.price;
  if (!price) return;
  let planName: string;
  try {
    planName = planFromPriceId(price.id) === 'pro' ? 'Pro' : 'House Plus';
  } catch {
    logger.warn(`No confirmation email: unknown price ${price.id}`);
    return;
  }

  const meta = session.metadata ?? {};
  const locale: BillingLocale = meta.locale === 'en' ? 'en' : 'it';
  const date = (d: Date) =>
    new Intl.DateTimeFormat(locale === 'it' ? 'it-IT' : 'en-GB', {
      dateStyle: 'long',
    }).format(d);

  const result = await sendSubscriptionConfirmationEmail(email, {
    locale,
    planName,
    price: formatMoney(
      vatInclusiveAmount(price.unit_amount ?? 0, price.tax_behavior),
      price.currency,
      locale,
    ),
    interval: price.recurring?.interval ?? 'month',
    trialEnd: sub.trial_end ? date(new Date(sub.trial_end * 1000)) : null,
    waiverDate: date(new Date(meta.withdrawal_waiver_at ?? Date.now())),
    termsVersion: Number(meta.terms_version) || LEGAL_POLICY_VERSION,
  });
  if (!result.success) {
    logger.error(
      `Confirmation email failed for event ${eventId}`,
      result.error,
    );
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send confirmation',
    });
  }

  try {
    await stripe.subscriptions.update(subId, {
      metadata: { confirmation_email_session: session.id },
    });
  } catch (err) {
    // Sent already; failing the webhook now would only cause a duplicate.
    logger.error(`Could not mark confirmation sent for ${subId}`, err);
  }
}

export default defineEventHandler(async (event) => {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Webhook secret not configured',
    });
  }

  const body = await readRawBody(event);
  const signature = getRequestHeader(event, 'stripe-signature');

  if (!body || !signature) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing body or signature',
    });
  }

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret,
    );
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', err);
    throw createError({ statusCode: 400, statusMessage: 'Invalid signature' });
  }

  const repos = getRepositories();

  if (
    stripeEvent.type === 'customer.subscription.created' ||
    stripeEvent.type === 'customer.subscription.updated' ||
    stripeEvent.type === 'customer.subscription.deleted'
  ) {
    // Events can arrive out of order or be replayed, so the payload is only a
    // pointer: the state written is what Stripe says right now.
    const sub = await stripe.subscriptions.retrieve(
      (stripeEvent.data.object as Stripe.Subscription).id,
    );
    const customerId =
      typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

    const { data: subscription } =
      await repos.subscriptions.getByStripeCustomerId(customerId);
    if (!subscription) {
      logger.warn(`No subscription record for Stripe customer ${customerId}`);
      return { received: true };
    }

    if (sub.status === 'canceled') {
      // A late event for an old subscription must not wipe a newer one.
      if (
        subscription.stripe_subscription_id &&
        subscription.stripe_subscription_id !== sub.id
      ) {
        return { received: true };
      }
      const { error: upsertError } = await repos.subscriptions.upsert(
        subscription.user_id,
        {
          plan: 'free',
          status: 'canceled',
          stripe_subscription_id: null,
          billing_period: undefined,
          current_period_end: null,
        },
      );
      failIfNotStored(upsertError, stripeEvent.id);
      return { received: true };
    }

    const priceId = sub.items.data[0]?.price.id;
    if (!priceId) return { received: true };

    let plan: ReturnType<typeof planFromPriceId>;
    try {
      plan = planFromPriceId(priceId);
    } catch {
      // Ack so Stripe stops retrying an event we can never process.
      logger.warn(`Ignoring Stripe subscription with unknown price ${priceId}`);
      return { received: true };
    }

    const { error: upsertError } = await repos.subscriptions.upsert(
      subscription.user_id,
      {
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        plan,
        billing_period: billingPeriodFromPriceId(priceId),
        status: sub.status,
        trial_ends_at: sub.trial_end
          ? new Date(sub.trial_end * 1000).toISOString()
          : null,
        // Recorded once; the repository never overwrites an existing value.
        trial_used_at: sub.trial_end ? new Date().toISOString() : null,
        current_period_end: sub.items.data[0]?.current_period_end
          ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
          : null,
      },
    );
    failIfNotStored(upsertError, stripeEvent.id);
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    await sendConfirmationOnce(
      stripe,
      stripeEvent.data.object as Stripe.Checkout.Session,
      stripeEvent.id,
    );
  }

  return { received: true };
});
