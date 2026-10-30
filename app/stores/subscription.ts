import { defineStore } from 'pinia';
import type { Subscription } from '~/types';
import type { Prices, WithdrawResult } from '~/composables/useSubscriptionApi';
import { SubscriptionAlreadyActiveError } from '~/composables/useSubscriptionApi';

export const useSubscriptionStore = defineStore('subscription', () => {
  const subscriptionApi = useSubscriptionApi();
  const notificationStore = useNotificationStore();

  const subscription = ref<Subscription | null>(null);
  const isLoading = ref(false);
  const prices = ref<Prices | null>(null);
  const isPricesLoading = ref(false);
  const hasPricesError = ref(false);
  // Set when checkout is refused because a live subscription already exists.
  const isAlreadySubscribed = ref(false);

  const plan = computed(() => subscription.value?.plan ?? 'free');
  const isTrialing = computed(() => subscription.value?.status === 'trialing');
  const isPro = computed(() => ['pro', 'house_plus'].includes(plan.value));
  // Withdrawal applies to any live subscription, including a trial.
  const canWithdraw = computed(
    () =>
      isPro.value &&
      ['active', 'trialing'].includes(subscription.value?.status ?? ''),
  );
  const isHousePlus = computed(() => plan.value === 'house_plus');

  async function loadSubscription(): Promise<void> {
    const { isEnabled } = useFeatureFlags();
    if (!isEnabled('showStripe')) return;

    isLoading.value = true;
    try {
      const data = await subscriptionApi.getSubscription();
      subscription.value = data;
    } finally {
      isLoading.value = false;
    }
  }

  async function loadPrices(): Promise<void> {
    isPricesLoading.value = true;
    hasPricesError.value = false;
    try {
      const data = await subscriptionApi.getPrices();
      prices.value = data;
      // Never fall back to stale/hard-coded prices: an error hides them.
      hasPricesError.value = !data || Object.keys(data).length === 0;
    } finally {
      isPricesLoading.value = false;
    }
  }

  async function withdraw(): Promise<WithdrawResult | null> {
    const result = await subscriptionApi.withdraw();
    if (!result) {
      notificationStore.addNotification(
        'error',
        'errors.generic',
        'errors.withdrawFailed',
        { i18n: true },
      );
      return null;
    }
    await loadSubscription();
    return result;
  }

  async function createCheckoutSession(
    priceKey: string,
    withdrawalWaiver = false,
  ): Promise<string | null> {
    isAlreadySubscribed.value = false;
    let url: string | null;
    try {
      url = await subscriptionApi.createCheckout(priceKey, withdrawalWaiver);
    } catch (error) {
      if (!(error instanceof SubscriptionAlreadyActiveError)) throw error;
      isAlreadySubscribed.value = true;
      return null;
    }
    if (!url) {
      notificationStore.addNotification(
        'error',
        'errors.generic',
        'errors.checkoutFailed',
        { i18n: true },
      );
    }
    return url;
  }

  async function openBillingPortal(): Promise<string | null> {
    const url = await subscriptionApi.openPortal();
    if (!url) {
      notificationStore.addNotification(
        'error',
        'errors.generic',
        'errors.portalFailed',
        { i18n: true },
      );
    }
    return url;
  }

  function reset(): void {
    subscription.value = null;
    prices.value = null;
    isAlreadySubscribed.value = false;
  }

  return {
    subscription,
    isLoading,
    prices,
    isPricesLoading,
    hasPricesError,
    isAlreadySubscribed,
    canWithdraw,
    plan,
    isTrialing,
    isPro,
    isHousePlus,
    loadSubscription,
    loadPrices,
    withdraw,
    createCheckoutSession,
    openBillingPortal,
    reset,
  };
});
