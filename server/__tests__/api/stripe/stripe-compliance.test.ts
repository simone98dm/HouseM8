/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { getRepositories } from '~~/server/repositories/factory';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
vi.stubGlobal(
  'defineCachedEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const readValidatedBodyMock = vi.fn();
vi.stubGlobal('readValidatedBody', readValidatedBodyMock);
const readRawBodyMock = vi.fn();
vi.stubGlobal('readRawBody', readRawBodyMock);
vi.stubGlobal('getRequestHeader', (_e: unknown, name: string) =>
  name === 'accept-language' ? 'en-US,en;q=0.9' : 'sig',
);
vi.stubGlobal('createError', (o: object) => Object.assign(new Error(), o));

vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi.fn().mockResolvedValue({ id: 'u-1', email: 'a@b.com' }),
}));
vi.mock('~~/server/utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
const logSecurityEvent = vi.fn();
vi.mock('~~/server/utils/security-events', () => ({
  logSecurityEvent: (...a: unknown[]) => logSecurityEvent(...a),
}));
const sendConfirmation = vi.fn().mockResolvedValue({ success: true });
const sendWithdrawal = vi.fn().mockResolvedValue({ success: true });
vi.mock('~~/server/emails', () => ({
  sendSubscriptionConfirmationEmail: (...a: unknown[]) =>
    sendConfirmation(...a),
  sendSubscriptionWithdrawalEmail: (...a: unknown[]) => sendWithdrawal(...a),
}));

const sessionsCreate = vi.fn().mockResolvedValue({ url: 'https://stripe/x' });
const constructEvent = vi.fn();
const subsRetrieve = vi.fn();
const subsUpdate = vi.fn().mockResolvedValue({});
const subsCancel = vi.fn().mockResolvedValue({});
const pricesRetrieve = vi.fn();
vi.mock('~~/server/utils/stripe', () => ({
  getStripeClient: () => ({
    checkout: { sessions: { create: sessionsCreate } },
    customers: { create: vi.fn() },
    webhooks: { constructEvent },
    subscriptions: {
      retrieve: subsRetrieve,
      update: subsUpdate,
      cancel: subsCancel,
    },
    prices: { retrieve: pricesRetrieve },
  }),
  STRIPE_PRICES: { pro_monthly: 'price_pro', pro_annual: 'price_pro_y' },
  planFromPriceId: (id: string) => {
    if (id.startsWith('price_pro')) return 'pro';
    throw new Error('Unknown');
  },
  billingPeriodFromPriceId: () => 'monthly',
}));

const ev = {} as never;
const run = async (path: string) =>
  ((await import(path)).default as Function)(ev);

beforeEach(() => vi.clearAllMocks());

describe('checkout compliance', () => {
  const grant = vi.fn().mockResolvedValue({ data: {}, error: null });
  beforeEach(() => {
    vi.mocked(getRepositories).mockReturnValue({
      consents: { recordWaiver: grant },
      subscriptions: {
        getByUserId: vi
          .fn()
          .mockResolvedValue({ data: { stripe_customer_id: 'cus_1' } }),
      },
    } as never);
    readValidatedBodyMock.mockResolvedValue({
      price_key: 'pro_monthly',
      withdrawal_waiver: true,
    });
  });

  it('rejects a body without the waiver', async () => {
    const mod = await import('../../../api/stripe/checkout.post');
    expect(mod.default).toBeTypeOf('function');
    // The schema is private to the handler: assert through the real parser.
    readValidatedBodyMock.mockImplementationOnce(
      (_e: unknown, parse: (b: unknown) => unknown) =>
        parse({ price_key: 'pro_monthly' }),
    );
    await expect(
      run('../../../api/stripe/checkout.post'),
    ).rejects.toBeInstanceOf(z.ZodError);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it('records the waiver before creating the session, with compliance params', async () => {
    await run('../../../api/stripe/checkout.post');
    expect(grant).toHaveBeenCalledWith('u-1', 2);
    expect(grant.mock.invocationCallOrder[0]).toBeLessThan(
      sessionsCreate.mock.invocationCallOrder[0]!,
    );
    const params = sessionsCreate.mock.calls[0]![0];
    expect(params).toMatchObject({
      consent_collection: { terms_of_service: 'required' },
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      tax_id_collection: { enabled: true },
      customer_update: { address: 'auto', name: 'auto' },
      locale: 'en',
      metadata: {
        user_id: 'u-1',
        withdrawal_waiver_version: '2',
        terms_version: '2',
      },
    });
    expect(params.subscription_data.metadata.user_id).toBe('u-1');
  });

  it('does not create a session when the waiver cannot be stored', async () => {
    grant.mockResolvedValueOnce({ data: null, error: 'db' });
    await expect(
      run('../../../api/stripe/checkout.post'),
    ).rejects.toMatchObject({ statusCode: 500 });
    expect(sessionsCreate).not.toHaveBeenCalled();
  });
});

describe('prices', () => {
  it('adds 22% VAT to exclusive prices and keeps inclusive ones', async () => {
    pricesRetrieve
      .mockResolvedValueOnce({
        unit_amount: 300,
        currency: 'eur',
        recurring: { interval: 'month' },
        tax_behavior: 'exclusive',
      })
      .mockResolvedValueOnce({
        unit_amount: 3000,
        currency: 'eur',
        recurring: { interval: 'year' },
        tax_behavior: 'inclusive',
      });
    const { data } = await run('../../../api/stripe/prices.get');
    expect(data.pro_monthly).toMatchObject({
      unit_amount: 300,
      display_amount: 366,
      vat_included: true,
      vat_rate: 0.22,
      tax_behavior: 'exclusive',
      interval: 'month',
    });
    expect(data.pro_annual.display_amount).toBe(3000);
  });

  it('is gated by the stripe flag middleware', async () => {
    vi.doMock('~~/server/utils/feature-flags', () => ({
      isFeatureEnabled: vi.fn().mockResolvedValue(false),
    }));
    const { assertStripeEnabled } =
      await import('~~/server/utils/stripe-guard');
    await expect(assertStripeEnabled()).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('webhook confirmation email', () => {
  const session = {
    id: 'cs_1',
    mode: 'subscription',
    subscription: 'sub_1',
    customer_details: { email: 'a@b.com' },
    metadata: {
      locale: 'en',
      terms_version: '2',
      withdrawal_waiver_at: '2026-10-26T10:00:00.000Z',
    },
  };
  const fire = async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
    readRawBodyMock.mockResolvedValue('{}');
    constructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: { object: session },
    });
    vi.mocked(getRepositories).mockReturnValue({} as never);
    return run('../../../api/stripe/webhook.post');
  };
  const sub = (metadata = {}) => ({
    trial_end: 1_900_000_000,
    metadata,
    items: {
      data: [
        {
          price: {
            id: 'price_pro',
            unit_amount: 300,
            currency: 'eur',
            tax_behavior: 'exclusive',
            recurring: { interval: 'month' },
          },
        },
      ],
    },
  });

  it('sends the email once with VAT-inclusive price, then marks the subscription', async () => {
    subsRetrieve.mockResolvedValue(sub());
    await fire();
    expect(sendConfirmation).toHaveBeenCalledTimes(1);
    const [to, props] = sendConfirmation.mock.calls[0]!;
    expect(to).toBe('a@b.com');
    expect(props).toMatchObject({
      locale: 'en',
      planName: 'Pro',
      interval: 'month',
      termsVersion: 2,
    });
    expect(props.price).toContain('3.66');
    expect(subsUpdate).toHaveBeenCalledWith('sub_1', {
      metadata: { confirmation_email_session: 'cs_1' },
    });
  });

  it('does not resend on a webhook retry', async () => {
    subsRetrieve.mockResolvedValue(sub({ confirmation_email_session: 'cs_1' }));
    await fire();
    expect(sendConfirmation).not.toHaveBeenCalled();
  });

  it('answers 500 when the email fails so Stripe retries', async () => {
    subsRetrieve.mockResolvedValue(sub());
    sendConfirmation.mockResolvedValueOnce({ success: false, error: 'x' });
    await expect(fire()).rejects.toMatchObject({ statusCode: 500 });
    expect(subsUpdate).not.toHaveBeenCalled();
  });
});

describe('withdraw', () => {
  const upsert = vi.fn().mockResolvedValue({ data: {}, error: null });
  const setup = (stripeSub: object) => {
    vi.mocked(getRepositories).mockReturnValue({
      subscriptions: {
        getByUserId: vi.fn().mockResolvedValue({
          data: { stripe_subscription_id: 'sub_1', plan: 'pro' },
        }),
        upsert,
      },
    } as never);
    subsRetrieve.mockResolvedValue({
      id: 'sub_1',
      items: {
        data: [
          { price: { id: 'price_pro' }, current_period_end: 1_900_000_000 },
        ],
      },
      ...stripeSub,
    });
  };
  const daysAgo = (d: number) => Math.floor(Date.now() / 1000) - d * 86400;

  it('cancels immediately during the trial', async () => {
    setup({ status: 'trialing', created: daysAgo(3) });
    const res = await run('../../../api/stripe/withdraw.post');
    expect(subsCancel).toHaveBeenCalledWith('sub_1');
    expect(subsUpdate).not.toHaveBeenCalled();
    expect(upsert.mock.calls[0]![1]).toMatchObject({
      plan: 'free',
      status: 'canceled',
    });
    expect(res.data.mode).toBe('immediate');
    expect(sendWithdrawal.mock.calls[0]![1]).toMatchObject({
      mode: 'immediate',
      locale: 'en',
    });
    expect(logSecurityEvent).toHaveBeenCalledWith(
      'subscription_withdrawn',
      expect.objectContaining({ userId: 'u-1' }),
    );
  });

  it('cancels immediately within 14 days of creation', async () => {
    setup({ status: 'active', created: daysAgo(10) });
    const res = await run('../../../api/stripe/withdraw.post');
    expect(res.data.mode).toBe('immediate');
  });

  it('cancels at period end after 14 days', async () => {
    setup({ status: 'active', created: daysAgo(40) });
    const res = await run('../../../api/stripe/withdraw.post');
    expect(subsCancel).not.toHaveBeenCalled();
    expect(subsUpdate).toHaveBeenCalledWith('sub_1', {
      cancel_at_period_end: true,
    });
    expect(upsert).not.toHaveBeenCalled();
    expect(res.data).toEqual({
      mode: 'period_end',
      access_ends_at: new Date(1_900_000_000 * 1000).toISOString(),
    });
    expect(sendWithdrawal.mock.calls[0]![1].mode).toBe('period_end');
    expect(logSecurityEvent).toHaveBeenCalled();
  });

  it('400 when there is nothing to cancel', async () => {
    setup({ status: 'canceled', created: daysAgo(40) });
    await expect(
      run('../../../api/stripe/withdraw.post'),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
