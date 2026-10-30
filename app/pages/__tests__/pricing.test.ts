import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { setActivePinia, createPinia } from 'pinia';
import PricingPage from '~/pages/pricing.vue';
import { flushPromises } from '~/tests/utils';

import { useSubscriptionStore } from '~/stores/subscription';
import { useUserStore } from '~/stores/user';

vi.mock('~/stores/subscription', () => ({ useSubscriptionStore: vi.fn() }));
vi.mock('~/stores/user', () => ({ useUserStore: vi.fn() }));

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }));
mockNuxtImport('navigateTo', () => navigateToMock);

// Rendered as a real anchor so the `to` target is assertable. UiButton renders
// NuxtLink instead of <button> whenever `to` is set.
const NuxtLinkStub = {
  name: 'NuxtLink',
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
};

const G = {
  mocks: {
    $t: (k: string, p?: Record<string, string>) =>
      p ? `${k} ${Object.values(p).join(' ')}` : k,
  },
  stubs: { Icon: true, NuxtLink: NuxtLinkStub },
};

describe('Pricing Page', () => {
  let mockSubscriptionStore: {
    createCheckoutSession: ReturnType<typeof vi.fn>;
    loadPrices: ReturnType<typeof vi.fn>;
    prices: Record<string, unknown> | null;
    isPricesLoading: boolean;
    hasPricesError: boolean;
    plan: string;
  };

  const price = (display_amount: number) => ({
    unit_amount: display_amount,
    currency: 'eur',
    interval: null,
    tax_behavior: 'inclusive',
    display_amount,
    vat_included: true,
    vat_rate: 0.22,
  });

  const tickWaiver = async (
    wrapper: Awaited<ReturnType<typeof mountSuspended>>,
  ) => wrapper.find('input[type="checkbox"]').setValue(true);

  const setAuthenticated = (isAuthenticated: boolean) => {
    vi.mocked(useUserStore).mockReturnValue({
      isAuthenticated,
    } as ReturnType<typeof useUserStore>);
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    // resolves null so the click handler's `window.location.href = url`
    // branch never runs (jsdom doesn't implement navigation).
    mockSubscriptionStore = {
      createCheckoutSession: vi.fn().mockResolvedValue(null),
      loadPrices: vi.fn().mockResolvedValue(undefined),
      prices: {
        pro_annual: price(5999),
        pro_monthly: price(599),
        house_plus_annual: price(11999),
        house_plus_monthly: price(1199),
      },
      isPricesLoading: false,
      hasPricesError: false,
      plan: 'free',
    };
    vi.mocked(useSubscriptionStore).mockReturnValue(
      mockSubscriptionStore as unknown as ReturnType<
        typeof useSubscriptionStore
      >,
    );
    setAuthenticated(true);
  });

  it('renders', async () => {
    const wrapper = await mountSuspended(PricingPage, { global: G });
    expect(wrapper.exists()).toBe(true);
  });

  it('renders all three plan tiers with their prices', async () => {
    const wrapper = await mountSuspended(PricingPage, { global: G });
    const text = wrapper.text();
    expect(text).toContain('€0');
    expect(text).toContain('Pro');
    expect(text).toContain('€5.00');
    expect(text).toContain('€59.99');
    expect(text).toContain('House+');
    expect(text).toContain('€10.00');
    expect(text).toContain('€119.99');
    expect(text).toContain('€5.99');
    expect(text).not.toContain('€3.33');
    expect(mockSubscriptionStore.loadPrices).toHaveBeenCalled();
  });

  it('hides prices and offers a retry when the prices fetch fails', async () => {
    mockSubscriptionStore.prices = null;
    mockSubscriptionStore.hasPricesError = true;
    const wrapper = await mountSuspended(PricingPage, { global: G });
    expect(wrapper.text()).toContain('pricing.pricesError');
    expect(wrapper.text()).not.toMatch(/€[1-9]/);
    await tickWaiver(wrapper);
    const cta = wrapper
      .findAll('button')
      .find((b) => b.text() === 'pricing.startPro');
    expect(cta!.attributes('disabled')).toBeDefined();
    const retry = wrapper
      .findAll('button')
      .find((b) => b.text() === 'common.retry');
    await retry!.trigger('click');
    expect(mockSubscriptionStore.loadPrices).toHaveBeenCalledTimes(2);
  });

  it('keeps Subscribe enabled and flags the waiver when submitted unticked', async () => {
    const wrapper = await mountSuspended(PricingPage, { global: G });
    const cta = () =>
      wrapper.findAll('button').find((b) => b.text() === 'pricing.startPro')!;
    expect(cta().attributes('disabled')).toBeUndefined();
    await cta().trigger('click');
    await flushPromises();
    expect(mockSubscriptionStore.createCheckoutSession).not.toHaveBeenCalled();
    expect(
      wrapper.find('input[type="checkbox"]').attributes('aria-invalid'),
    ).toBe('true');
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  });

  it('clicking the Pro CTA calls createCheckoutSession with pro_annual', async () => {
    const wrapper = await mountSuspended(PricingPage, { global: G });
    const proButton = wrapper
      .findAll('button')
      .find((b) => b.text() === 'pricing.startPro');
    expect(proButton).toBeTruthy();

    await tickWaiver(wrapper);
    await proButton!.trigger('click');
    await flushPromises();

    expect(mockSubscriptionStore.createCheckoutSession).toHaveBeenCalledWith(
      'pro_annual',
      true,
    );
  });

  it('clicking the House+ CTA calls createCheckoutSession with house_plus_annual', async () => {
    const wrapper = await mountSuspended(PricingPage, { global: G });
    const housePlusButton = wrapper
      .findAll('button')
      .find((b) => b.text() === 'pricing.startHousePlus');
    expect(housePlusButton).toBeTruthy();

    await tickWaiver(wrapper);
    await housePlusButton!.trigger('click');
    await flushPromises();

    expect(mockSubscriptionStore.createCheckoutSession).toHaveBeenCalledWith(
      'house_plus_annual',
      true,
    );
  });

  it('renders the Free tier as a real link to /dashboard when authenticated', async () => {
    const wrapper = await mountSuspended(PricingPage, { global: G });
    const freeLink = wrapper
      .findAll('a')
      .find((a) => a.text() === 'pricing.goToDashboard');

    expect(freeLink).toBeTruthy();
    expect(freeLink!.attributes('href')).toBe('/dashboard');
    expect(mockSubscriptionStore.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("marks only the user's actual plan as current", async () => {
    mockSubscriptionStore.plan = 'pro';
    const wrapper = await mountSuspended(PricingPage, { global: G });
    const badges = wrapper
      .findAll('p')
      .filter((p) => p.text() === 'pricing.currentPlan');
    expect(badges).toHaveLength(1);
    expect(wrapper.text()).not.toContain('pricing.recommended');
  });

  describe('anonymous visitor', () => {
    beforeEach(() => setAuthenticated(false));

    it('points the Free tier CTA at registration instead of the dashboard', async () => {
      const wrapper = await mountSuspended(PricingPage, { global: G });
      const freeLink = wrapper
        .findAll('a')
        .find((a) => a.text() === 'auth.signUp.button');

      expect(freeLink).toBeTruthy();
      expect(freeLink!.attributes('href')).toBe('/auth/register');
    });

    it('redirects a paid CTA to registration rather than firing a checkout that can only 401', async () => {
      const wrapper = await mountSuspended(PricingPage, { global: G });
      const proButton = wrapper
        .findAll('button')
        .find((b) => b.text() === 'pricing.startPro');

      await tickWaiver(wrapper);
      await proButton!.trigger('click');
      await flushPromises();

      expect(
        mockSubscriptionStore.createCheckoutSession,
      ).not.toHaveBeenCalled();
      expect(navigateToMock).toHaveBeenCalledWith({
        path: '/auth/register',
        query: { redirect: '/pricing' },
      });
    });
  });

  it('shows the already-subscribed notice with a manage link', async () => {
    (mockSubscriptionStore as Record<string, unknown>).isAlreadySubscribed =
      true;
    const wrapper = await mountSuspended(PricingPage, { global: G });
    await flushPromises();
    expect(wrapper.text()).toContain('subscription.alreadyActive');
    expect(wrapper.find('a[href="/settings/subscription"]').exists()).toBe(
      true,
    );
  });
});
