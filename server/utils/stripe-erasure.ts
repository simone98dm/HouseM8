import Stripe from 'stripe';
import consola from 'consola';
import { getRepositories } from '../repositories/factory';
import { getStripeClient } from './stripe';

const DEAD_STATUSES = new Set(['canceled', 'incomplete_expired']);

const RESUMABLE_STATUSES = new Set(['active', 'trialing']);

const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

/**
 * Stop billing when a deletion is requested: the subscription ends at the
 * current period (the user keeps what they paid for during the grace period).
 * No-op without a live subscription or Stripe config. Throws when Stripe
 * fails so the caller can refuse the deletion instead of leaving billing on.
 * Returns true only when a cancellation was actually scheduled.
 */
export async function cancelSubscriptionForErasure(
  userId: string,
): Promise<boolean> {
  if (!isStripeConfigured()) return false;

  const { data: sub, error } =
    await getRepositories().subscriptions.getByUserId(userId);
  if (error) throw new Error('Could not load subscription');
  if (!sub?.stripe_subscription_id || DEAD_STATUSES.has(sub.status)) {
    return false;
  }

  // Already ending (the user cancelled it themselves): report false so that
  // cancelling the deletion never resumes billing the user chose to stop.
  const stripe = getStripeClient();
  const live = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
  if (DEAD_STATUSES.has(live.status) || live.cancel_at_period_end) return false;

  await stripe.subscriptions.update(sub.stripe_subscription_id, {
    cancel_at_period_end: true,
  });
  return true;
}

/**
 * Undo cancelSubscriptionForErasure after the user cancelled the deletion.
 * Returns true when the subscription is back to renewing, false when it had
 * already ended (nothing to resume). Throws on Stripe failure.
 */
export async function resumeSubscriptionAfterCancelledErasure(
  userId: string,
): Promise<boolean> {
  if (!isStripeConfigured()) return false;

  const { data: sub, error } =
    await getRepositories().subscriptions.getByUserId(userId);
  if (error) throw new Error('Could not load subscription');
  if (!sub?.stripe_subscription_id) return false;

  const stripe = getStripeClient();
  const live = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
  if (!RESUMABLE_STATUSES.has(live.status) || !live.cancel_at_period_end) {
    return false;
  }
  await stripe.subscriptions.update(sub.stripe_subscription_id, {
    cancel_at_period_end: false,
  });
  return true;
}

/**
 * Strip personal data from the Stripe customer when the account is
 * pseudonymised. Invoices/charges are untouched: Italian tax law requires
 * keeping them for 10 years (Art. 17(3)(b) GDPR).
 * Throws on Stripe failure so the cron can retry on the next run.
 */
export async function redactStripeCustomerForErasure(
  userId: string,
): Promise<void> {
  if (!isStripeConfigured()) return;

  const { data: sub, error } =
    await getRepositories().subscriptions.getByUserId(userId);
  if (error) throw new Error('Could not load subscription');
  if (!sub?.stripe_customer_id) return;

  try {
    // Empty string unsets a field in the Stripe API.
    await getStripeClient().customers.update(sub.stripe_customer_id, {
      email: '',
      name: '',
      phone: '',
      address: '',
      shipping: '',
      metadata: '',
    });
  } catch (err) {
    // Customer already deleted on the Stripe side: nothing left to redact.
    if (
      err instanceof Stripe.errors.StripeError &&
      err.code === 'resource_missing'
    ) {
      consola.info('Stripe customer already gone', { userId });
      return;
    }
    throw err;
  }
}
