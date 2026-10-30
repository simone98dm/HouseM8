import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { setActivePinia, createPinia } from 'pinia';
import PaywallModal from '../PaywallModal.vue';
import { useSubscriptionStore } from '~/stores/subscription';

vi.mock('~/stores/subscription', () => ({ useSubscriptionStore: vi.fn() }));

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

const G = {
  mocks: {
    $t: (k: string, p?: Record<string, string>) =>
      p ? `${k} ${Object.values(p).join(' ')}` : k,
  },
  stubs: { Icon: true, NuxtLink: { template: '<a><slot /></a>' } },
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

describe('PaywallModal', () => {
  let store: Record<string, any>;

  const btn = (text: string) =>
    Array.from(document.body.querySelectorAll('button')).findLast(
      (b) => b.textContent?.trim() === text,
    );
  const box = () =>
    Array.from(
      document.body.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"]',
      ),
    ).at(-1)!;

  const mountIt = () =>
    mountSuspended(PaywallModal, {
      props: { show: true, requiredPlan: 'pro' },
      global: G,
    });

  beforeEach(() => {
    document.body.innerHTML = '';
    setActivePinia(createPinia());
    store = {
      prices: {
        pro_annual: price(5999),
        pro_monthly: price(599),
        house_plus_annual: price(11999),
        house_plus_monthly: price(1199),
      },
      isPricesLoading: false,
      hasPricesError: false,
      loadPrices: vi.fn().mockResolvedValue(undefined),
      createCheckoutSession: vi.fn().mockResolvedValue(null),
    };
    vi.mocked(useSubscriptionStore).mockReturnValue(store as never);
  });

  it('renders VAT-inclusive prices from the store, not hard-coded ones', async () => {
    await mountIt();
    const text = document.body.textContent ?? '';
    expect(text).toContain('€5.00');
    expect(text).toContain('€59.99');
    expect(text).toContain('€5.99');
    expect(text).not.toContain('3.33');
  });

  it('flags the waiver when submitted unticked, then sends once ticked', async () => {
    await mountIt();
    const cta = () => btn('subscription.startAnnual')!;
    expect(cta().disabled).toBe(false);
    cta().click();
    await nextTick();
    expect(store.createCheckoutSession).not.toHaveBeenCalled();
    expect(box().getAttribute('aria-invalid')).toBe('true');
    box().click();
    box().dispatchEvent(new Event('change'));
    await nextTick();
    cta().click();
    await nextTick();
    expect(store.createCheckoutSession).toHaveBeenCalledWith(
      'pro_annual',
      true,
    );
  });

  it('hides prices and offers retry when prices fail to load', async () => {
    store.prices = null;
    store.hasPricesError = true;
    await mountIt();
    expect(document.body.textContent).toContain('pricing.pricesError');
    btn('common.retry')!.click();
    expect(store.loadPrices).toHaveBeenCalled();
    expect(btn('subscription.startAnnual')).toBeUndefined();
  });

  it('shows the already-subscribed notice with a link to manage the plan', async () => {
    store.isAlreadySubscribed = true;
    await mountIt();
    const alert = document.body.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('subscription.alreadyActive');
  });

  it('hides the already-subscribed notice by default', async () => {
    await mountIt();
    expect(document.body.textContent).not.toContain(
      'subscription.alreadyActive',
    );
  });
});
