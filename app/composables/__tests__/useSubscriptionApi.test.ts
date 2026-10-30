import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useApi } from '~/composables/useApi';
import {
  useSubscriptionApi,
  SubscriptionAlreadyActiveError,
} from '~/composables/useSubscriptionApi';

vi.mock('~/composables/useApi', () => ({ useApi: vi.fn() }));

describe('useSubscriptionApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.mocked(useApi).mockReturnValue({ fetch: fetchMock } as never);
  });

  it.each([
    ['getSubscription', '/api/stripe/subscription'],
    ['getPrices', '/api/stripe/prices'],
  ] as const)('%s unwraps data and returns null on error', async (fn, url) => {
    fetchMock.mockResolvedValueOnce({ data: { x: 1 } });
    expect(await useSubscriptionApi()[fn]()).toEqual({ x: 1 });
    expect(fetchMock).toHaveBeenCalledWith(url);
    fetchMock.mockRejectedValueOnce(new Error('x'));
    expect(await useSubscriptionApi()[fn]()).toBeNull();
  });

  it('withdraw POSTs and returns the outcome, or null on error', async () => {
    const result = { mode: 'immediate', access_ends_at: null };
    fetchMock.mockResolvedValueOnce({ data: result });
    expect(await useSubscriptionApi().withdraw()).toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith('/api/stripe/withdraw', {
      method: 'POST',
    });
    fetchMock.mockRejectedValueOnce(new Error('x'));
    expect(await useSubscriptionApi().withdraw()).toBeNull();
  });

  it('createCheckout sends the price key and waiver flag and returns the URL', async () => {
    fetchMock.mockResolvedValue({ data: { url: 'https://stripe.test/c' } });
    expect(await useSubscriptionApi().createCheckout('pro_monthly', true)).toBe(
      'https://stripe.test/c',
    );
    expect(fetchMock).toHaveBeenCalledWith('/api/stripe/checkout', {
      method: 'POST',
      body: { price_key: 'pro_monthly', withdrawal_waiver: true },
    });
  });

  it('createCheckout defaults the waiver to false', async () => {
    fetchMock.mockResolvedValue({ data: { url: 'u' } });
    await useSubscriptionApi().createCheckout('pro_annual');
    expect(fetchMock.mock.calls[0]![1].body.withdrawal_waiver).toBe(false);
  });

  it.each([
    ['nested', { data: { data: { code: 'SUBSCRIPTION_ALREADY_ACTIVE' } } }],
    ['flat', { data: { code: 'SUBSCRIPTION_ALREADY_ACTIVE' } }],
  ])(
    'createCheckout throws SubscriptionAlreadyActiveError (%s body)',
    async (_n, err) => {
      fetchMock.mockRejectedValue(err);
      await expect(
        useSubscriptionApi().createCheckout('pro_monthly'),
      ).rejects.toBeInstanceOf(SubscriptionAlreadyActiveError);
    },
  );

  it('createCheckout returns null for any other failure', async () => {
    fetchMock.mockRejectedValue({ data: { code: 'OTHER' } });
    expect(await useSubscriptionApi().createCheckout('pro_monthly')).toBeNull();
    fetchMock.mockRejectedValue(new Error('net'));
    expect(await useSubscriptionApi().createCheckout('pro_monthly')).toBeNull();
  });

  it('openPortal returns the URL or null on error', async () => {
    fetchMock.mockResolvedValueOnce({ data: { url: 'https://p' } });
    expect(await useSubscriptionApi().openPortal()).toBe('https://p');
    expect(fetchMock).toHaveBeenCalledWith('/api/stripe/portal', {
      method: 'POST',
    });
    fetchMock.mockRejectedValueOnce(new Error('x'));
    expect(await useSubscriptionApi().openPortal()).toBeNull();
  });
});
