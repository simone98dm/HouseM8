import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Stripe from 'stripe';
import { getRepositories } from '~~/server/repositories/factory';
import {
  cancelSubscriptionForErasure,
  redactStripeCustomerForErasure,
  resumeSubscriptionAfterCancelledErasure,
} from '~~/server/utils/stripe-erasure';

const subscriptionsUpdate = vi.fn();
const customersUpdate = vi.fn();
const subscriptionsRetrieve = vi.fn();
vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/stripe', () => ({
  getStripeClient: () => ({
    subscriptions: {
      update: subscriptionsUpdate,
      retrieve: subscriptionsRetrieve,
    },
    customers: { update: customersUpdate },
  }),
}));

const repo = (data: object | null, error: string | null = null) =>
  vi.mocked(getRepositories).mockReturnValue({
    subscriptions: { getByUserId: vi.fn().mockResolvedValue({ data, error }) },
  } as never);

describe('stripe-erasure edge cases', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test');
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ['cancel', cancelSubscriptionForErasure],
    ['resume', resumeSubscriptionAfterCancelledErasure],
    ['redact', redactStripeCustomerForErasure],
  ])(
    '%s throws when the subscription cannot be loaded (never silently skips)',
    async (_n, fn) => {
      repo(null, 'db down');
      await expect(fn('u-1')).rejects.toThrow('Could not load subscription');
      expect(subscriptionsUpdate).not.toHaveBeenCalled();
      expect(customersUpdate).not.toHaveBeenCalled();
    },
  );

  it('cancel returns false when Stripe says the subscription already ended', async () => {
    repo({ stripe_subscription_id: 'sub_1', status: 'active' });
    subscriptionsRetrieve.mockResolvedValue({
      status: 'incomplete_expired',
      cancel_at_period_end: false,
    });
    expect(await cancelSubscriptionForErasure('u-1')).toBe(false);
    expect(subscriptionsUpdate).not.toHaveBeenCalled();
  });

  it('cancel treats incomplete_expired locally stored status as dead', async () => {
    repo({ stripe_subscription_id: 'sub_1', status: 'incomplete_expired' });
    expect(await cancelSubscriptionForErasure('u-1')).toBe(false);
    expect(subscriptionsRetrieve).not.toHaveBeenCalled();
  });

  it('resume is a no-op without Stripe config', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    expect(await resumeSubscriptionAfterCancelledErasure('u-1')).toBe(false);
    expect(getRepositories).not.toHaveBeenCalled();
  });

  it('resume is a no-op without a stripe subscription id', async () => {
    repo({ stripe_subscription_id: null });
    expect(await resumeSubscriptionAfterCancelledErasure('u-1')).toBe(false);
    expect(subscriptionsRetrieve).not.toHaveBeenCalled();
  });

  it('resume also works for trialing subscriptions', async () => {
    repo({ stripe_subscription_id: 'sub_1' });
    subscriptionsRetrieve.mockResolvedValue({
      status: 'trialing',
      cancel_at_period_end: true,
    });
    expect(await resumeSubscriptionAfterCancelledErasure('u-1')).toBe(true);
  });

  it('resume does not touch past_due subscriptions', async () => {
    repo({ stripe_subscription_id: 'sub_1' });
    subscriptionsRetrieve.mockResolvedValue({
      status: 'past_due',
      cancel_at_period_end: true,
    });
    expect(await resumeSubscriptionAfterCancelledErasure('u-1')).toBe(false);
  });

  it('redact is a no-op without Stripe config', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    await redactStripeCustomerForErasure('u-1');
    expect(getRepositories).not.toHaveBeenCalled();
  });

  it('redact swallows resource_missing (customer already deleted)', async () => {
    repo({ stripe_customer_id: 'cus_1' });
    customersUpdate.mockRejectedValue(
      new Stripe.errors.StripeError({
        type: 'invalid_request_error',
        code: 'resource_missing',
        message: 'gone',
      } as never),
    );
    await expect(
      redactStripeCustomerForErasure('u-1'),
    ).resolves.toBeUndefined();
  });

  it('redact rethrows other Stripe errors so the cron retries', async () => {
    repo({ stripe_customer_id: 'cus_1' });
    customersUpdate.mockRejectedValue(
      new Stripe.errors.StripeError({
        type: 'api_error',
        code: 'rate_limit',
        message: 'slow',
      } as never),
    );
    await expect(redactStripeCustomerForErasure('u-1')).rejects.toThrow('slow');
  });
});
