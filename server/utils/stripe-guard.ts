import { isFeatureEnabled } from './feature-flags';

/** Throws 404 when the showStripe flag is off. Call before any Stripe/DB work. */
export async function assertStripeEnabled(): Promise<void> {
  if (!(await isFeatureEnabled('showStripe'))) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' });
  }
}
