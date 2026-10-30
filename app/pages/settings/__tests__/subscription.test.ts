import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { setActivePinia, createPinia } from 'pinia';
import SubscriptionPage from '~/pages/settings/subscription.vue';

import { useSubscriptionStore } from '~/stores/subscription';

vi.mock('~/stores/subscription', () => ({ useSubscriptionStore: vi.fn() }));

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

const G = {
  mocks: { $t: (k: string) => k },
  stubs: {
    Icon: true,
  },
};

describe('Subscription Page', () => {
  let mockSubscriptionStore: {
    plan: string;
    isTrialing: boolean;
    isPro: boolean;
    canWithdraw: boolean;
    withdraw: ReturnType<typeof vi.fn>;
    loadSubscription: ReturnType<typeof vi.fn>;
    openBillingPortal: ReturnType<typeof vi.fn>;
  };
  let originalLocation: Location;

  beforeEach(() => {
    setActivePinia(createPinia());
    mockSubscriptionStore = {
      plan: 'free',
      isTrialing: false,
      isPro: false,
      canWithdraw: false,
      withdraw: vi.fn().mockResolvedValue(null),
      loadSubscription: vi.fn().mockResolvedValue(undefined),
      openBillingPortal: vi.fn().mockResolvedValue(null),
    };
    vi.mocked(useSubscriptionStore).mockReturnValue(
      mockSubscriptionStore as unknown as ReturnType<
        typeof useSubscriptionStore
      >,
    );

    originalLocation = window.location;
    // ponytail: happy-dom's window.location isn't directly assignable;
    // redefine it per-test so we can assert on href without real navigation.
    // href must stay a valid URL: Nuxt's prefetch scheduler uses it as a base.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: originalLocation.href },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('mounts successfully', async () => {
    const wrapper = await mountSuspended(SubscriptionPage, { global: G });
    expect(wrapper.exists()).toBe(true);
  });

  it('calls loadSubscription on mount', async () => {
    await mountSuspended(SubscriptionPage, { global: G });
    expect(mockSubscriptionStore.loadSubscription).toHaveBeenCalled();
  });

  it('renders "Free" as the plan label by default', async () => {
    const wrapper = await mountSuspended(SubscriptionPage, { global: G });
    expect(wrapper.text()).toContain('Free');
  });

  it('renders the "House+" plan label for house_plus plan', async () => {
    mockSubscriptionStore.plan = 'house_plus';
    const wrapper = await mountSuspended(SubscriptionPage, { global: G });
    expect(wrapper.text()).toContain('House+');
  });

  it('renders the trialing message only when isTrialing is true', async () => {
    mockSubscriptionStore.isTrialing = true;
    const wrapper = await mountSuspended(SubscriptionPage, { global: G });
    expect(wrapper.text()).toContain('settings.subscription.trialing');
  });

  it('does not render the trialing message when isTrialing is false', async () => {
    const wrapper = await mountSuspended(SubscriptionPage, { global: G });
    expect(wrapper.text()).not.toContain('settings.subscription.trialing');
  });

  it('shows the Upgrade button (not Manage Billing) when not pro', async () => {
    const wrapper = await mountSuspended(SubscriptionPage, { global: G });
    expect(wrapper.text()).toContain('settings.subscription.upgrade');
    expect(wrapper.text()).not.toContain('settings.subscription.manageBilling');
    // UiButton renders a NuxtLink when `to` is set, so the Upgrade control is
    // a real link to /pricing rather than an inert <button to="...">.
    const upgradeLink = wrapper
      .findAll('a')
      .find((a) => a.text() === 'settings.subscription.upgrade');
    expect(upgradeLink).toBeTruthy();
    expect(upgradeLink!.attributes('href')).toBe('/pricing');
  });

  it('shows the Manage Billing button (not Upgrade) when pro', async () => {
    mockSubscriptionStore.isPro = true;
    const wrapper = await mountSuspended(SubscriptionPage, { global: G });
    expect(wrapper.text()).toContain('settings.subscription.manageBilling');
    expect(wrapper.text()).not.toContain('settings.subscription.upgrade');
  });

  it('openPortal navigates to the returned URL on click', async () => {
    mockSubscriptionStore.isPro = true;
    mockSubscriptionStore.openBillingPortal.mockResolvedValue(
      'https://billing.stripe.com/session/abc',
    );
    const wrapper = await mountSuspended(SubscriptionPage, { global: G });
    await wrapper.find('button').trigger('click');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockSubscriptionStore.openBillingPortal).toHaveBeenCalled();
    expect(window.location.href).toBe('https://billing.stripe.com/session/abc');
  });

  it('openPortal does not navigate when the store returns no URL', async () => {
    mockSubscriptionStore.isPro = true;
    mockSubscriptionStore.openBillingPortal.mockResolvedValue(null);
    const wrapper = await mountSuspended(SubscriptionPage, { global: G });
    await wrapper.find('button').trigger('click');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(window.location.href).toBe(originalLocation.href);
  });

  it('bug: isPortalLoading is stuck true forever if openBillingPortal rejects', async () => {
    mockSubscriptionStore.isPro = true;
    mockSubscriptionStore.openBillingPortal.mockRejectedValue(
      new Error('network error'),
    );
    const wrapper = await mountSuspended(SubscriptionPage, { global: G });
    const vm = wrapper.vm as unknown as { isPortalLoading: boolean };
    // openPortal() has no try/finally, so a rejection leaves isPortalLoading
    // stuck at true — the button spins forever with no error surfaced.
    await expect(
      (
        wrapper.vm as unknown as { openPortal: () => Promise<void> }
      ).openPortal(),
    ).rejects.toThrow('network error');
    expect(vm.isPortalLoading).toBe(true);
  });

  describe('cancel / withdraw', () => {
    // UiModal teleports to <body>, so dialog controls live outside the wrapper.
    const findBtn = (wrapper: { element: Element }, text: string) => {
      const roots = [wrapper.element, document.body];
      const el = roots
        .flatMap((r) => Array.from(r.querySelectorAll('button')))
        .findLast((b) => b.textContent?.trim() === text);
      return {
        exists: !!el,
        trigger: async () => {
          el!.click();
          await nextTick();
        },
      };
    };

    beforeEach(() => {
      mockSubscriptionStore.isPro = true;
      mockSubscriptionStore.canWithdraw = true;
    });

    it('hides the cancel button when there is nothing to withdraw from', async () => {
      mockSubscriptionStore.canWithdraw = false;
      const wrapper = await mountSuspended(SubscriptionPage, { global: G });
      expect(
        findBtn(wrapper, 'settings.subscription.cancel.button').exists,
      ).toBe(false);
    });

    it('does not withdraw until the dialog is confirmed', async () => {
      const wrapper = await mountSuspended(SubscriptionPage, { global: G });
      await findBtn(wrapper, 'settings.subscription.cancel.button').trigger();
      expect(document.body.textContent).toContain(
        'settings.subscription.cancel.title',
      );
      expect(mockSubscriptionStore.withdraw).not.toHaveBeenCalled();
    });

    it.each([
      ['immediate', 'settings.subscription.cancel.doneImmediate'],
      ['period_end', 'settings.subscription.cancel.donePeriodEnd'],
    ])('shows the %s outcome after confirming', async (mode, key) => {
      mockSubscriptionStore.withdraw.mockResolvedValue({
        mode,
        access_ends_at: '2027-01-15T00:00:00Z',
      });
      const wrapper = await mountSuspended(SubscriptionPage, { global: G });
      await findBtn(wrapper, 'settings.subscription.cancel.button').trigger();
      await findBtn(wrapper, 'settings.subscription.cancel.confirm').trigger();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockSubscriptionStore.withdraw).toHaveBeenCalledOnce();
      const status = wrapper.find('[role="status"]');
      expect(status.exists()).toBe(true);
      expect(status.text()).toContain('settings.subscription.cancel.doneTitle');
      expect(wrapper.text()).toContain(key);
    });

    it('keeps the dialog and the button when withdraw fails', async () => {
      const wrapper = await mountSuspended(SubscriptionPage, { global: G });
      await findBtn(wrapper, 'settings.subscription.cancel.button').trigger();
      await findBtn(wrapper, 'settings.subscription.cancel.confirm').trigger();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(wrapper.find('[role="status"]').exists()).toBe(false);
      expect(document.body.textContent).toContain(
        'settings.subscription.cancel.confirm',
      );
    });
  });
});
