import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { getStripeClient, planFromPriceId } from '~~/server/utils/stripe';
import { requestLocale } from '~~/server/utils/stripe-billing';
import { logSecurityEvent } from '~~/server/utils/security-events';
import { sendSubscriptionWithdrawalEmail } from '~~/server/emails';
import { logger } from '~~/server/utils/logger';

const WITHDRAWAL_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const repos = getRepositories();

  const { data: local } = await repos.subscriptions.getByUserId(user.id);
  if (!local?.stripe_subscription_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No active subscription found',
    });
  }

  const stripe = getStripeClient();
  const sub = await stripe.subscriptions.retrieve(local.stripe_subscription_id);
  if (sub.status !== 'active' && sub.status !== 'trialing') {
    throw createError({
      statusCode: 400,
      statusMessage: 'No active subscription found',
    });
  }

  const isImmediate =
    sub.status === 'trialing' ||
    Date.now() - sub.created * 1000 < WITHDRAWAL_WINDOW_MS;
  const periodEnd = sub.items.data[0]?.current_period_end;
  const accessEndsAt = isImmediate
    ? new Date()
    : new Date((periodEnd ?? 0) * 1000);

  if (isImmediate) {
    await stripe.subscriptions.cancel(sub.id);
    // Same write as the customer.subscription.deleted webhook (idempotent).
    const { error } = await repos.subscriptions.upsert(user.id, {
      plan: 'free',
      status: 'canceled',
      stripe_subscription_id: null,
      billing_period: undefined,
      current_period_end: null,
    });
    if (error) logger.error(`Withdraw: local update failed: ${error}`);
  } else {
    // The subscription.updated webhook keeps the local row in sync.
    await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
  }

  await logSecurityEvent('subscription_withdrawn', { userId: user.id, event });

  const locale = requestLocale(event) ?? 'it';
  let planName = local.plan === 'pro' ? 'Pro' : 'House Plus';
  const priceId = sub.items.data[0]?.price.id;
  if (priceId) {
    try {
      planName = planFromPriceId(priceId) === 'pro' ? 'Pro' : 'House Plus';
    } catch {
      // keep the name from the local row
    }
  }
  const mail = await sendSubscriptionWithdrawalEmail(user.email, {
    locale,
    planName,
    mode: isImmediate ? 'immediate' : 'period_end',
    accessEndsAt: new Intl.DateTimeFormat(locale === 'it' ? 'it-IT' : 'en-GB', {
      dateStyle: 'long',
    }).format(accessEndsAt),
  });
  if (!mail.success)
    logger.error('Withdraw acknowledgement email failed', mail.error);

  return {
    data: {
      mode: isImmediate ? 'immediate' : 'period_end',
      access_ends_at: accessEndsAt.toISOString(),
    },
  };
});
