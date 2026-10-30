import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';

vi.stubGlobal('defineEventHandler', (fn: (...a: unknown[]) => unknown) => fn);
const readRawBody = vi.fn();
const sigHeader = vi.fn();
vi.stubGlobal('readRawBody', readRawBody);
vi.stubGlobal('getRequestHeader', () => sigHeader());
vi.stubGlobal('createError', (o: object) => Object.assign(new Error(), o));

vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
const sendConfirmation = vi.fn();
vi.mock('~~/server/emails', () => ({
  sendSubscriptionConfirmationEmail: (...a: unknown[]) =>
    sendConfirmation(...a),
}));
const constructEvent = vi.fn();
const subsRetrieve = vi.fn();
const subsUpdate = vi.fn();
vi.mock('~~/server/utils/stripe', () => ({
  getStripeClient: () => ({
    webhooks: { constructEvent },
    subscriptions: { retrieve: subsRetrieve, update: subsUpdate },
  }),
  planFromPriceId: (id: string) => {
    if (id === 'price_pro') return 'pro';
    if (id === 'price_plus') return 'house_plus';
    throw new Error('unknown');
  },
  billingPeriodFromPriceId: () => 'monthly',
}));

const load = async () =>
  (await import('../../../api/stripe/webhook.post')).default;
const ev = {} as never;

describe('stripe webhook events', () => {
  const getByStripeCustomerId = vi.fn();
  const upsert = vi.fn();
  const fire = (type: string, object: unknown = { id: 'sub_1' }) => {
    constructEvent.mockReturnValue({ id: 'evt_1', type, data: { object } });
    return load().then((h) => h(ev));
  };
  const stripeSub = (over: Record<string, unknown> = {}) => ({
    id: 'sub_1',
    customer: 'cus_1',
    status: 'active',
    trial_end: null,
    items: {
      data: [{ price: { id: 'price_pro' }, current_period_end: 1_900_000_000 }],
    },
    ...over,
  });

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec');
    readRawBody.mockResolvedValue('{}');
    sigHeader.mockReturnValue('sig');
    vi.mocked(getRepositories).mockReturnValue({
      subscriptions: { getByStripeCustomerId, upsert },
    } as never);
    getByStripeCustomerId.mockResolvedValue({
      data: { user_id: 'u1', stripe_subscription_id: 'sub_1' },
    });
    upsert.mockResolvedValue({ error: null });
    subsRetrieve.mockResolvedValue(stripeSub());
  });
  afterEach(() => vi.unstubAllEnvs());

  it('500 when the webhook secret is not configured', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    await expect(fire('x')).rejects.toMatchObject({ statusCode: 500 });
  });

  it.each([
    ['body', () => readRawBody.mockResolvedValue('')],
    ['signature', () => sigHeader.mockReturnValue(undefined)],
  ])('400 when %s is missing', async (_n, setup) => {
    setup();
    await expect(fire('x')).rejects.toMatchObject({ statusCode: 400 });
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it('400 when the signature is invalid and nothing is processed', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('bad sig');
    });
    await expect(load().then((h) => h(ev))).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('stores state fetched from Stripe (not the payload) on subscription.updated', async () => {
    subsRetrieve.mockResolvedValue(stripeSub({ trial_end: 1_800_000_000 }));
    await expect(
      fire('customer.subscription.updated', {
        id: 'sub_1',
        status: 'canceled',
      }),
    ).resolves.toEqual({ received: true });
    expect(subsRetrieve).toHaveBeenCalledWith('sub_1');
    expect(upsert).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        plan: 'pro',
        status: 'active',
        billing_period: 'monthly',
        stripe_subscription_id: 'sub_1',
        trial_ends_at: new Date(1_800_000_000_000).toISOString(),
        trial_used_at: expect.any(String),
        current_period_end: new Date(1_900_000_000_000).toISOString(),
      }),
    );
  });

  it('leaves trial_used_at / trial_ends_at null and accepts customer objects when there is no trial', async () => {
    subsRetrieve.mockResolvedValue(
      stripeSub({
        customer: { id: 'cus_1' },
        items: { data: [{ price: { id: 'price_plus' } }] },
      }),
    );
    await fire('customer.subscription.created');
    expect(getByStripeCustomerId).toHaveBeenCalledWith('cus_1');
    expect(upsert.mock.calls[0]![1]).toMatchObject({
      plan: 'house_plus',
      trial_ends_at: null,
      trial_used_at: null,
      current_period_end: null,
    });
  });

  it('acks without writing when no subscription record exists for the customer', async () => {
    getByStripeCustomerId.mockResolvedValue({ data: null });
    await expect(fire('customer.subscription.updated')).resolves.toEqual({
      received: true,
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('downgrades to free when the subscription is canceled', async () => {
    subsRetrieve.mockResolvedValue(stripeSub({ status: 'canceled' }));
    await fire('customer.subscription.deleted');
    expect(upsert).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        plan: 'free',
        status: 'canceled',
        stripe_subscription_id: null,
        current_period_end: null,
      }),
    );
  });

  it('downgrades when the stored subscription id is empty', async () => {
    getByStripeCustomerId.mockResolvedValue({
      data: { user_id: 'u1', stripe_subscription_id: null },
    });
    subsRetrieve.mockResolvedValue(stripeSub({ status: 'canceled' }));
    await fire('customer.subscription.deleted');
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it('ignores a late cancel for an old subscription (does not wipe the newer one)', async () => {
    getByStripeCustomerId.mockResolvedValue({
      data: { user_id: 'u1', stripe_subscription_id: 'sub_NEW' },
    });
    subsRetrieve.mockResolvedValue(stripeSub({ status: 'canceled' }));
    await expect(fire('customer.subscription.deleted')).resolves.toEqual({
      received: true,
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('500 (so Stripe retries) when the canceled state cannot be stored', async () => {
    subsRetrieve.mockResolvedValue(stripeSub({ status: 'canceled' }));
    upsert.mockResolvedValue({ error: 'db' });
    await expect(fire('customer.subscription.deleted')).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it('500 when the active state cannot be stored', async () => {
    upsert.mockResolvedValue({ error: 'db' });
    await expect(fire('customer.subscription.updated')).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it('acks without writing when the subscription has no price', async () => {
    subsRetrieve.mockResolvedValue(stripeSub({ items: { data: [] } }));
    await expect(fire('customer.subscription.updated')).resolves.toEqual({
      received: true,
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('acks (no retry loop) for an unknown price id', async () => {
    subsRetrieve.mockResolvedValue(
      stripeSub({ items: { data: [{ price: { id: 'price_other' } }] } }),
    );
    await expect(fire('customer.subscription.updated')).resolves.toEqual({
      received: true,
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('ignores unrelated event types', async () => {
    await expect(fire('invoice.paid')).resolves.toEqual({ received: true });
    expect(subsRetrieve).not.toHaveBeenCalled();
  });

  describe('checkout.session.completed edge cases', () => {
    const session = (over: Record<string, unknown> = {}) => ({
      id: 'cs_1',
      mode: 'subscription',
      subscription: 'sub_1',
      customer_details: { email: 'a@b.c' },
      metadata: {},
      ...over,
    });
    const priced = (over: Record<string, unknown> = {}) => ({
      metadata: {},
      trial_end: null,
      items: {
        data: [
          {
            price: {
              id: 'price_pro',
              unit_amount: 300,
              currency: 'eur',
              tax_behavior: 'inclusive',
              recurring: null,
            },
          },
        ],
      },
      ...over,
    });
    beforeEach(() => {
      sendConfirmation.mockResolvedValue({ success: true });
      subsUpdate.mockResolvedValue({});
    });

    it.each([
      ['non-subscription mode', { mode: 'payment' }],
      ['no email', { customer_details: null }],
      ['no subscription id', { subscription: null }],
    ])('sends nothing for %s', async (_n, over) => {
      await fire('checkout.session.completed', session(over));
      expect(subsRetrieve).not.toHaveBeenCalled();
      expect(sendConfirmation).not.toHaveBeenCalled();
    });

    it('accepts an expanded subscription object and defaults to Italian / month / current terms', async () => {
      subsRetrieve.mockResolvedValue(priced());
      await fire(
        'checkout.session.completed',
        session({ subscription: { id: 'sub_9' } }),
      );
      expect(subsRetrieve).toHaveBeenCalledWith('sub_9');
      expect(sendConfirmation.mock.calls[0]![1]).toMatchObject({
        locale: 'it',
        interval: 'month',
        trialEnd: null,
        planName: 'Pro',
      });
    });

    it('labels the house_plus plan', async () => {
      subsRetrieve.mockResolvedValue(
        priced({
          items: { data: [{ price: { id: 'price_plus', currency: 'eur' } }] },
        }),
      );
      await fire('checkout.session.completed', session());
      expect(sendConfirmation.mock.calls[0]![1].planName).toBe('House Plus');
    });

    it('sends nothing when the subscription has no price', async () => {
      subsRetrieve.mockResolvedValue(priced({ items: { data: [] } }));
      await fire('checkout.session.completed', session());
      expect(sendConfirmation).not.toHaveBeenCalled();
    });

    it('sends nothing for an unknown price', async () => {
      subsRetrieve.mockResolvedValue(
        priced({ items: { data: [{ price: { id: 'price_zzz' } }] } }),
      );
      await expect(
        fire('checkout.session.completed', session()),
      ).resolves.toEqual({ received: true });
      expect(sendConfirmation).not.toHaveBeenCalled();
    });

    it('still acks when marking the email as sent fails (avoids a duplicate on retry)', async () => {
      subsRetrieve.mockResolvedValue(priced());
      subsUpdate.mockRejectedValue(new Error('stripe down'));
      await expect(
        fire('checkout.session.completed', session()),
      ).resolves.toEqual({ received: true });
      expect(sendConfirmation).toHaveBeenCalledTimes(1);
    });
  });
});
