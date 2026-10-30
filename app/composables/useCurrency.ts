import type { Currency } from '~/types';

export const useCurrency = () => {
  const { locale } = useI18n();

  // Currency symbols mapping
  const currencySymbols: Record<Currency, string> = {
    USD: '$',
    EUR: '€',
  };

  // Currency names for display
  const currencyNames: Record<Currency, string> = {
    USD: 'US Dollar',
    EUR: 'Euro',
  };

  // Default currency
  const DEFAULT_CURRENCY: Currency = 'EUR';

  // Get currency symbol for a given currency code
  const getCurrencySymbol = (currency: Currency): string => {
    return currencySymbols[currency] || '€';
  };

  // Get currency name for a given currency code
  const getCurrencyName = (currency: Currency): string => {
    return currencyNames[currency] || 'Euro';
  };

  // Validate currency code
  const isValidCurrency = (currency: string): currency is Currency => {
    return ['USD', 'EUR'].includes(currency);
  };

  // Format amount as locale-aware currency, e.g. "€12.50" (en) / "12,50 €" (it).
  // Non-numeric amount (undefined/null/NaN) falls back to 0 rather than
  // throwing, since this crashed a page render before (amount.toFixed on
  // undefined). Unknown/invalid currency codes fall back to DEFAULT_CURRENCY
  // for the same reason: Intl.NumberFormat throws on an invalid ISO code.
  const formatAmount = (
    amount: number | null | undefined,
    currency: Currency,
  ): string => {
    const safeAmount =
      typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
    const safeCurrency = isValidCurrency(currency)
      ? currency
      : DEFAULT_CURRENCY;

    return new Intl.NumberFormat(locale.value, {
      style: 'currency',
      currency: safeCurrency,
    }).format(safeAmount);
  };

  // Get list of supported currencies
  const getSupportedCurrencies = (): Array<{
    code: Currency;
    name: string;
    symbol: string;
  }> => {
    return [
      { code: 'USD', name: currencyNames.USD, symbol: currencySymbols.USD },
      { code: 'EUR', name: currencyNames.EUR, symbol: currencySymbols.EUR },
    ];
  };

  return {
    getCurrencySymbol,
    getCurrencyName,
    formatAmount,
    isValidCurrency,
    getSupportedCurrencies,
    DEFAULT_CURRENCY,
  };
};
