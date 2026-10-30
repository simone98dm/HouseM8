import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import {
  useSubscriptionApi,
  SubscriptionAlreadyActiveError,
} from '~/composables/useSubscriptionApi';
import { useNotificationStore } from '~/stores/notifications';
import { useSubscriptionStore } from '~/stores/subscription';

import { useFeatureFlags } from '~/composables/useFeatureFlags';

vi.mock('~/composables/useSubscriptionApi', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('~/composables/useSubscriptionApi')
  >()),
  useSubscriptionApi: vi.fn(),
}));
vi.mock('~/stores/notifications', () => ({ useNotificationStore: vi.fn() }));
vi.mock('~/composables/useFeatureFlags', () => ({
  useFeatureFlags: vi.fn().mockReturnValue({
    isEnabled: vi.fn().mockReturnValue(true),
    getFlag: vi.fn(),
    flags: { value: { showStripe: true } },
  }),
}));

const mockFreeSubscription = {
  plan: 'free' as const,
  status: 'active' as const,
  billing_period: null,
  trial_ends_at: null,
  current_period_end: null,
};

const mockProSubscription = {
  plan: 'pro' as const,
  status: 'active' as const,
  billing_period: 'annual' as const,
  trial_ends_at: null,
  current_period_end: '2027-05-12T00:00:00Z',
};

describe('useSubscriptionStore', () => {
  let mockApi: {
    getSubscription: ReturnType<typeof vi.fn>;
    createCheckout: ReturnType<typeof vi.fn>;
    openPortal: ReturnType<typeof vi.fn>;
    getPrices: ReturnType<typeof vi.fn>;
    withdraw: ReturnType<typeof vi.fn>;
  };
  let mockNotification: { addNotification: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    setActivePinia(createPinia());
    mockApi = {
      getSubscription: vi.fn(),
      createCheckout: vi.fn(),
      openPortal: vi.fn(),
      getPrices: vi.fn(),
      withdraw: vi.fn(),
    };
    mockNotification = { addNotification: vi.fn() };
    vi.mocked(useSubscriptionApi).mockReturnValue(mockApi as any);
    vi.mocked(useNotificationStore).mockReturnValue(mockNotification as any);
  });

  afterEach(() => vi.clearAllMocks());

  describe('initial state', () => {
    it('starts with null subscription', () => {
      const store = useSubscriptionStore();
      expect(store.subscription).toBeNull();
    });

    it('plan defaults to free when subscription is null', () => {
      const store = useSubscriptionStore();
      expect(store.plan).toBe('free');
    });
  });

  describe('computed: isPro', () => {
    it('returns false for free plan', async () => {
      mockApi.getSubscription.mockResolvedValue(mockFreeSubscription);
      const store = useSubscriptionStore();
      await store.loadSubscription();
      expect(store.isPro).toBe(false);
    });

    it('returns true for pro plan', async () => {
      mockApi.getSubscription.mockResolvedValue(mockProSubscription);
      const store = useSubscriptionStore();
      await store.loadSubscription();
      expect(store.isPro).toBe(true);
    });

    it('returns true for house_plus plan', async () => {
      mockApi.getSubscription.mockResolvedValue({
        ...mockProSubscription,
        plan: 'house_plus',
      });
      const store = useSubscriptionStore();
      await store.loadSubscription();
      expect(store.isPro).toBe(true);
    });
  });

  describe('computed: isHousePlus', () => {
    it('returns false for pro plan', async () => {
      mockApi.getSubscription.mockResolvedValue(mockProSubscription);
      const store = useSubscriptionStore();
      await store.loadSubscription();
      expect(store.isHousePlus).toBe(false);
    });

    it('returns true for house_plus plan', async () => {
      mockApi.getSubscription.mockResolvedValue({
        ...mockProSubscription,
        plan: 'house_plus',
      });
      const store = useSubscriptionStore();
      await store.loadSubscription();
      expect(store.isHousePlus).toBe(true);
    });
  });

  describe('loadSubscription', () => {
    it('sets subscription from API', async () => {
      mockApi.getSubscription.mockResolvedValue(mockProSubscription);
      const store = useSubscriptionStore();
      await store.loadSubscription();
      expect(store.subscription).toEqual(mockProSubscription);
    });

    it('sets isLoading false after load', async () => {
      mockApi.getSubscription.mockResolvedValue(mockFreeSubscription);
      const store = useSubscriptionStore();
      await store.loadSubscription();
      expect(store.isLoading).toBe(false);
    });

    it('skips API call when showStripe flag is off', async () => {
      vi.mocked(useFeatureFlags).mockReturnValueOnce({
        isEnabled: vi.fn().mockReturnValue(false),
        getFlag: vi.fn(),
        flags: { value: {} } as any,
      });

      const store = useSubscriptionStore();
      await store.loadSubscription();

      expect(mockApi.getSubscription).not.toHaveBeenCalled();
      expect(store.subscription).toBeNull();
    });

    it('calls API when showStripe flag is on', async () => {
      mockApi.getSubscription.mockResolvedValue(mockFreeSubscription);

      const store = useSubscriptionStore();
      await store.loadSubscription();

      expect(mockApi.getSubscription).toHaveBeenCalledOnce();
    });
  });

  describe('createCheckoutSession', () => {
    it('returns checkout URL on success', async () => {
      mockApi.createCheckout.mockResolvedValue(
        'https://checkout.stripe.com/pay/cs_test_123',
      );
      const store = useSubscriptionStore();
      const url = await store.createCheckoutSession('pro_annual');
      expect(url).toBe('https://checkout.stripe.com/pay/cs_test_123');
    });

    it('notifies error and returns null on failure', async () => {
      mockApi.createCheckout.mockResolvedValue(null);
      const store = useSubscriptionStore();
      const url = await store.createCheckoutSession('pro_annual');
      expect(url).toBeNull();
      expect(mockNotification.addNotification).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('createCheckoutSession already subscribed (409)', () => {
    it('flags isAlreadySubscribed without a generic error toast', async () => {
      mockApi.createCheckout.mockRejectedValue(
        new SubscriptionAlreadyActiveError(),
      );
      const store = useSubscriptionStore();
      expect(await store.createCheckoutSession('pro_annual')).toBeNull();
      expect(store.isAlreadySubscribed).toBe(true);
      expect(mockNotification.addNotification).not.toHaveBeenCalled();
    });

    it('clears the flag on the next attempt', async () => {
      mockApi.createCheckout
        .mockRejectedValueOnce(new SubscriptionAlreadyActiveError())
        .mockResolvedValueOnce('https://x');
      const store = useSubscriptionStore();
      await store.createCheckoutSession('pro_annual');
      await store.createCheckoutSession('pro_annual');
      expect(store.isAlreadySubscribed).toBe(false);
    });

    it('clears the flag on reset()', async () => {
      mockApi.createCheckout.mockRejectedValue(
        new SubscriptionAlreadyActiveError(),
      );
      const store = useSubscriptionStore();
      await store.createCheckoutSession('pro_annual');
      store.reset();
      expect(store.isAlreadySubscribed).toBe(false);
    });

    it('rethrows unexpected errors', async () => {
      mockApi.createCheckout.mockRejectedValue(new Error('boom'));
      await expect(
        useSubscriptionStore().createCheckoutSession('pro_annual'),
      ).rejects.toThrow('boom');
    });
  });

  describe('createCheckoutSession waiver', () => {
    it('forwards the withdrawal waiver flag to the API', async () => {
      mockApi.createCheckout.mockResolvedValue('https://x');
      await useSubscriptionStore().createCheckoutSession('pro_annual', true);
      expect(mockApi.createCheckout).toHaveBeenCalledWith('pro_annual', true);
    });
  });

  describe('loadPrices', () => {
    it('stores prices from the API', async () => {
      const prices = { pro_annual: { display_amount: 5999 } };
      mockApi.getPrices.mockResolvedValue(prices);
      const store = useSubscriptionStore();
      await store.loadPrices();
      expect(store.prices).toEqual(prices);
      expect(store.hasPricesError).toBe(false);
      expect(store.isPricesLoading).toBe(false);
    });

    it('flags an error and keeps no prices when the API fails', async () => {
      mockApi.getPrices.mockResolvedValue(null);
      const store = useSubscriptionStore();
      await store.loadPrices();
      expect(store.prices).toBeNull();
      expect(store.hasPricesError).toBe(true);
    });
  });

  describe('withdraw', () => {
    it('returns the outcome and refreshes the subscription', async () => {
      const result = { mode: 'immediate', access_ends_at: '2027-01-01' };
      mockApi.withdraw.mockResolvedValue(result);
      mockApi.getSubscription.mockResolvedValue(mockFreeSubscription);
      const store = useSubscriptionStore();
      expect(await store.withdraw()).toEqual(result);
      expect(mockApi.getSubscription).toHaveBeenCalled();
    });

    it('notifies and returns null on failure', async () => {
      mockApi.withdraw.mockResolvedValue(null);
      const store = useSubscriptionStore();
      expect(await store.withdraw()).toBeNull();
      expect(mockNotification.addNotification).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        'errors.withdrawFailed',
        expect.any(Object),
      );
    });
  });

  describe('canWithdraw', () => {
    it('is true for an active paid plan and false for free', async () => {
      const store = useSubscriptionStore();
      mockApi.getSubscription.mockResolvedValue(mockProSubscription);
      await store.loadSubscription();
      expect(store.canWithdraw).toBe(true);
      mockApi.getSubscription.mockResolvedValue(mockFreeSubscription);
      await store.loadSubscription();
      expect(store.canWithdraw).toBe(false);
    });
  });

  describe('openBillingPortal', () => {
    it('returns portal URL on success', async () => {
      mockApi.openPortal = vi
        .fn()
        .mockResolvedValue('https://billing.stripe.com/portal/123');
      vi.mocked(useSubscriptionApi).mockReturnValue(mockApi as any);
      const store = useSubscriptionStore();
      const url = await store.openBillingPortal();
      expect(url).toBe('https://billing.stripe.com/portal/123');
    });

    it('notifies error and returns null when portal URL is null', async () => {
      mockApi.openPortal = vi.fn().mockResolvedValue(null);
      vi.mocked(useSubscriptionApi).mockReturnValue(mockApi as any);
      const store = useSubscriptionStore();
      const url = await store.openBillingPortal();
      expect(url).toBeNull();
      expect(mockNotification.addNotification).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('reset clears subscription', async () => {
      mockApi.getSubscription.mockResolvedValue({
        plan: 'pro',
        status: 'active',
      });
      const store = useSubscriptionStore();
      await store.loadSubscription();
      expect(store.subscription).not.toBeNull();
      store.reset();
      expect(store.subscription).toBeNull();
    });
  });
});
