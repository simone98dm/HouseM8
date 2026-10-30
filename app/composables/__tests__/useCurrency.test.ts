/**
 * useCurrency Composable Tests
 *
 * useCurrency calls useI18n() internally (to drive locale-aware formatting),
 * which requires a real Vue i18n plugin — the global useI18n test-double in
 * app/tests/setup.ts is not picked up here because Nuxt's auto-import
 * transform resolves `useI18n` to the real vue-i18n import. We wrap each
 * call in a minimal Vue app with createI18n, same pattern as
 * useBillDetails.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { createApp, defineComponent } from 'vue';
import { createI18n } from 'vue-i18n';
import { useCurrency } from '~/composables/useCurrency';

/** Run the composable inside a mounted Vue + i18n app and return its API. */
function getCurrency(
  locale: 'en' | 'it' = 'en',
): ReturnType<typeof useCurrency> {
  let api!: ReturnType<typeof useCurrency>;

  const i18n = createI18n({
    legacy: false,
    locale,
    messages: { en: {}, it: {} },
  });

  const app = createApp(
    defineComponent({
      setup() {
        api = useCurrency();
        return () => {};
      },
    }),
  );

  app.use(i18n);
  app.mount(document.createElement('div'));

  return api;
}

describe('useCurrency', () => {
  describe('getCurrencySymbol', () => {
    it('returns $ for USD', () => {
      const { getCurrencySymbol } = getCurrency();
      expect(getCurrencySymbol('USD')).toBe('$');
    });

    it('returns € for EUR', () => {
      const { getCurrencySymbol } = getCurrency();
      expect(getCurrencySymbol('EUR')).toBe('€');
    });

    it('returns default € for unknown currency', () => {
      const { getCurrencySymbol } = getCurrency();
      // @ts-expect-error Testing unknown currency
      expect(getCurrencySymbol('GBP')).toBe('€');
    });
  });

  describe('getCurrencyName', () => {
    it('returns US Dollar for USD', () => {
      const { getCurrencyName } = getCurrency();
      expect(getCurrencyName('USD')).toBe('US Dollar');
    });

    it('returns Euro for EUR', () => {
      const { getCurrencyName } = getCurrency();
      expect(getCurrencyName('EUR')).toBe('Euro');
    });

    it('returns default Euro for unknown currency', () => {
      const { getCurrencyName } = getCurrency();
      // @ts-expect-error Testing unknown currency
      expect(getCurrencyName('GBP')).toBe('Euro');
    });
  });

  describe('formatAmount', () => {
    it('formats USD with symbol before amount (en locale)', () => {
      const { formatAmount } = getCurrency('en');
      expect(formatAmount(100, 'USD')).toBe('$100.00');
    });

    it('formats EUR with symbol before amount, no space (en locale)', () => {
      const { formatAmount } = getCurrency('en');
      expect(formatAmount(12.5, 'EUR')).toBe('€12.50');
    });

    it('always shows two decimal places', () => {
      const { formatAmount } = getCurrency('en');
      expect(formatAmount(100.5, 'USD')).toBe('$100.50');
      expect(formatAmount(100.5, 'EUR')).toBe('€100.50');
    });

    it('handles zero amounts', () => {
      const { formatAmount } = getCurrency('en');
      expect(formatAmount(0, 'USD')).toBe('$0.00');
      expect(formatAmount(0, 'EUR')).toBe('€0.00');
    });

    it('handles negative amounts', () => {
      const { formatAmount } = getCurrency('en');
      expect(formatAmount(-50.25, 'USD')).toBe('-$50.25');
      expect(formatAmount(-45.2, 'EUR')).toBe('-€45.20');
    });

    it('formats EUR with comma decimal and trailing symbol (it locale)', () => {
      const { formatAmount } = getCurrency('it');
      // Intl inserts a non-breaking space (U+00A0) between amount and symbol.
      expect(formatAmount(12.5, 'EUR')).toBe('12,50 €');
      expect(formatAmount(0, 'EUR')).toBe('0,00 €');
      expect(formatAmount(-45.2, 'EUR')).toBe('-45,20 €');
    });

    it('falls back to 0 for undefined amount instead of throwing', () => {
      const { formatAmount } = getCurrency('en');
      expect(() => formatAmount(undefined, 'EUR')).not.toThrow();
      expect(formatAmount(undefined, 'EUR')).toBe('€0.00');
    });

    it('falls back to 0 for null amount instead of throwing', () => {
      const { formatAmount } = getCurrency('en');
      expect(formatAmount(null, 'EUR')).toBe('€0.00');
    });

    it('falls back to 0 for NaN amount instead of throwing', () => {
      const { formatAmount } = getCurrency('en');
      expect(formatAmount(NaN, 'USD')).toBe('$0.00');
    });

    it('falls back to DEFAULT_CURRENCY for an invalid currency code', () => {
      const { formatAmount } = getCurrency('en');
      // @ts-expect-error Testing invalid currency code
      expect(() => formatAmount(5, 'N/A')).not.toThrow();
      // @ts-expect-error Testing invalid currency code
      expect(formatAmount(5, 'N/A')).toBe('€5.00');
    });

    it('formats a non-EUR currency (USD) correctly', () => {
      const { formatAmount } = getCurrency('en');
      expect(formatAmount(1234.5, 'USD')).toBe('$1,234.50');
    });
  });

  describe('isValidCurrency', () => {
    it('returns true for USD', () => {
      const { isValidCurrency } = getCurrency();
      expect(isValidCurrency('USD')).toBe(true);
    });

    it('returns true for EUR', () => {
      const { isValidCurrency } = getCurrency();
      expect(isValidCurrency('EUR')).toBe(true);
    });

    it('returns false for unsupported currency', () => {
      const { isValidCurrency } = getCurrency();
      expect(isValidCurrency('GBP')).toBe(false);
    });

    it('is case-sensitive', () => {
      const { isValidCurrency } = getCurrency();
      expect(isValidCurrency('usd')).toBe(false);
      expect(isValidCurrency('eur')).toBe(false);
    });

    it('returns false for empty string', () => {
      const { isValidCurrency } = getCurrency();
      expect(isValidCurrency('')).toBe(false);
    });
  });

  describe('getSupportedCurrencies', () => {
    it('returns list with USD and EUR', () => {
      const { getSupportedCurrencies } = getCurrency();
      const supported = getSupportedCurrencies();

      expect(supported).toHaveLength(2);
      expect(supported).toEqual([
        { code: 'USD', name: 'US Dollar', symbol: '$' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
      ]);
    });
  });

  describe('DEFAULT_CURRENCY', () => {
    it('has EUR as default', () => {
      const { DEFAULT_CURRENCY } = getCurrency();
      expect(DEFAULT_CURRENCY).toBe('EUR');
    });
  });
});
