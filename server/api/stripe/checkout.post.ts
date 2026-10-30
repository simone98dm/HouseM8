import { z } from 'zod';
import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { getStripeClient, STRIPE_PRICES } from '~~/server/utils/stripe';
import { requestLocale } from '~~/server/utils/stripe-billing';
import { LEGAL_POLICY_VERSION } from '~~/shared/utils/legal';

const bodySchema = z.object({
  price_key: z.enum([
    'pro_monthly',
    'pro_annual',
    'house_plus_monthly',
    'house_plus_annual',
  ]),
  // Express request for immediate start + acknowledgement of losing the
  // withdrawal right (art. 59 Codice del Consumo); the pricing page checkbox.
  withdrawal_waiver: z.literal(true),
});

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const { price_key } = await readValidatedBody(event, bodySchema.parse);

  const stripe = getStripeClient();
  const repos = getRepositories();
  const appUrl = process.env.BASE_URL ?? 'http://localhost:3000';

  const { data: subscription } = await repos.subscriptions.getByUserId(user.id);
  if (
    subscription?.stripe_subscription_id &&
    ['active', 'trialing'].includes(subscription.status)
  ) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Subscription already active',
      data: { code: 'SUBSCRIPTION_ALREADY_ACTIVE' },
    });
  }

  // Recorded before the session exists: no waiver on file, no checkout.
  // A fresh waiver per purchase, so its timestamp matches this checkout.
  const { error: consentError } = await repos.consents.recordWaiver(
    user.id,
    LEGAL_POLICY_VERSION,
  );
  if (consentError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to record consent',
    });
  }

  let customerId = subscription?.stripe_customer_id;

  if (!customerId) {
    // Idempotency key: concurrent first checkouts get the same customer back.
    const customer = await stripe.customers.create(
      { email: user.email, metadata: { user_id: user.id } },
      { idempotencyKey: `customer-create-${user.id}` },
    );
    customerId = customer.id;
    await repos.subscriptions.upsert(user.id, {
      plan: 'free',
      status: 'active',
      stripe_customer_id: customerId,
    });
  }

  // trial_used_at survives cancellation, so cancel + resubscribe gets no new trial.
  const isFirstSubscription = !subscription?.trial_used_at;

  const locale = requestLocale(event);
  const metadata = {
    user_id: user.id,
    withdrawal_waiver_version: String(LEGAL_POLICY_VERSION),
    withdrawal_waiver_at: new Date().toISOString(),
    terms_version: String(LEGAL_POLICY_VERSION),
    // The webhook has no request: it reads the email language from here.
    locale: locale ?? 'it',
  };

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: STRIPE_PRICES[price_key], quantity: 1 }],
    success_url: `${appUrl}/settings/subscription?success=1`,
    cancel_url: `${appUrl}/pricing`,
    consent_collection: { terms_of_service: 'required' },
    automatic_tax: { enabled: true },
    billing_address_collection: 'required',
    tax_id_collection: { enabled: true },
    // Required by Stripe when an existing customer is combined with automatic tax.
    customer_update: { address: 'auto', name: 'auto' },
    locale: locale ?? 'auto',
    metadata,
    subscription_data: {
      trial_period_days: isFirstSubscription ? 14 : undefined,
      metadata,
    },
  });

  return { data: { url: session.url } };
});
