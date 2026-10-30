import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

const mockSub = (sub: object | null) =>
  vi.mocked(getRepositories).mockReturnValue({
    subscriptions: {
      getByUserId: vi.fn().mockResolvedValue({ data: sub, error: null }),
    },
  } as never);

describe('stripe-erasure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('cancels at period end', async () => {
    mockSub({ stripe_subscription_id: 'sub_1', status: 'active' });
    subscriptionsRetrieve.mockResolvedValue({
      status: 'active',
      cancel_at_period_end: false,
    });
    expect(await cancelSubscriptionForErasure('u-1')).toBe(true);
    expect(subscriptionsUpdate).toHaveBeenCalledWith('sub_1', {
      cancel_at_period_end: true,
    });
  });

  it('does not claim a cancellation the user already scheduled (no resume later)', async () => {
    mockSub({ stripe_subscription_id: 'sub_1', status: 'active' });
    subscriptionsRetrieve.mockResolvedValue({
      status: 'active',
      cancel_at_period_end: true,
    });
    expect(await cancelSubscriptionForErasure('u-1')).toBe(false);
    expect(subscriptionsUpdate).not.toHaveBeenCalled();
  });

  it('resume turns cancel_at_period_end back off for a live subscription', async () => {
    mockSub({ stripe_subscription_id: 'sub_1', status: 'active' });
    subscriptionsRetrieve.mockResolvedValue({
      status: 'active',
      cancel_at_period_end: true,
    });
    expect(await resumeSubscriptionAfterCancelledErasure('u-1')).toBe(true);
    expect(subscriptionsUpdate).toHaveBeenCalledWith('sub_1', {
      cancel_at_period_end: false,
    });
  });

  it.each([
    ['already ended', { status: 'canceled', cancel_at_period_end: false }],
    [
      'not scheduled to cancel',
      { status: 'active', cancel_at_period_end: false },
    ],
  ])('resume does nothing when %s', async (_n, live) => {
    mockSub({ stripe_subscription_id: 'sub_1', status: 'active' });
    subscriptionsRetrieve.mockResolvedValue(live);
    expect(await resumeSubscriptionAfterCancelledErasure('u-1')).toBe(false);
    expect(subscriptionsUpdate).not.toHaveBeenCalled();
  });

  it('resume propagates Stripe failures', async () => {
    mockSub({ stripe_subscription_id: 'sub_1', status: 'active' });
    subscriptionsRetrieve.mockRejectedValueOnce(new Error('boom'));
    await expect(
      resumeSubscriptionAfterCancelledErasure('u-1'),
    ).rejects.toThrow('boom');
  });

  it.each([
    ['no subscription', null],
    ['no stripe id', { stripe_subscription_id: null, status: 'active' }],
    [
      'already canceled',
      { stripe_subscription_id: 'sub_1', status: 'canceled' },
    ],
  ])('cancel is a no-op with %s', async (_n, sub) => {
    mockSub(sub);
    expect(await cancelSubscriptionForErasure('u-1')).toBe(false);
    expect(subscriptionsUpdate).not.toHaveBeenCalled();
  });

  it('cancel is a no-op when Stripe is not configured', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    mockSub({ stripe_subscription_id: 'sub_1', status: 'active' });
    await cancelSubscriptionForErasure('u-1');
    expect(subscriptionsUpdate).not.toHaveBeenCalled();
  });

  it('cancel propagates Stripe failures', async () => {
    mockSub({ stripe_subscription_id: 'sub_1', status: 'active' });
    subscriptionsUpdate.mockRejectedValueOnce(new Error('boom'));
    await expect(cancelSubscriptionForErasure('u-1')).rejects.toThrow('boom');
  });

  it('redacts customer PII', async () => {
    mockSub({ stripe_customer_id: 'cus_1' });
    await redactStripeCustomerForErasure('u-1');
    expect(customersUpdate).toHaveBeenCalledWith('cus_1', {
      email: '',
      name: '',
      phone: '',
      address: '',
      shipping: '',
      metadata: '',
    });
  });

  it('redact is a no-op without a customer', async () => {
    mockSub({ stripe_customer_id: null });
    await redactStripeCustomerForErasure('u-1');
    expect(customersUpdate).not.toHaveBeenCalled();
  });

  it('redact propagates Stripe failures', async () => {
    mockSub({ stripe_customer_id: 'cus_1' });
    customersUpdate.mockRejectedValueOnce(new Error('boom'));
    await expect(redactStripeCustomerForErasure('u-1')).rejects.toThrow('boom');
  });
});
