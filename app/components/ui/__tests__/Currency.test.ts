/**
 * Currency Component Tests
 * UiCurrency delegates all formatting to useCurrency().formatAmount — these
 * tests mount the real component and assert on real rendered output.
 */

import { describe, it, expect, vi } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import Currency from '~/components/ui/Currency.vue';

const { useI18nMock } = vi.hoisted(() => ({ useI18nMock: vi.fn() }));
mockNuxtImport('useI18n', () => useI18nMock);

useI18nMock.mockReturnValue({
  t: (key: string) => key,
  locale: { value: 'en' },
});

describe('Currency Component', () => {
  it('renders EN output: symbol first, no space, dot decimal', async () => {
    const wrapper = await mountSuspended(Currency, {
      props: { amount: 12.5, currencyCode: 'EUR' },
    });
    expect(wrapper.text()).toBe('€12.50');
  });

  it('renders USD in EN locale', async () => {
    const wrapper = await mountSuspended(Currency, {
      props: { amount: 100, currencyCode: 'USD' },
    });
    expect(wrapper.text()).toBe('$100.00');
  });

  it('renders IT output: symbol last, comma decimal', async () => {
    useI18nMock.mockReturnValue({
      t: (key: string) => key,
      locale: { value: 'it' },
    });
    const wrapper = await mountSuspended(Currency, {
      props: { amount: 12.5, currencyCode: 'EUR' },
    });
    expect(wrapper.text()).toBe('12,50 €');
    useI18nMock.mockReturnValue({
      t: (key: string) => key,
      locale: { value: 'en' },
    });
  });

  it('does not throw and renders 0 for undefined amount', async () => {
    const wrapper = await mountSuspended(Currency, {
      props: { amount: undefined as unknown as number, currencyCode: 'EUR' },
    });
    expect(wrapper.text()).toBe('€0.00');
  });

  it('falls back to EUR default when currencyCode is missing/invalid', async () => {
    const wrapper = await mountSuspended(Currency, {
      props: { amount: 5 },
    });
    expect(wrapper.text()).toBe('€5.00');
  });
});
