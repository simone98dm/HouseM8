import { DEFAULT_CONVERSION_FACTOR } from '../constants';
import type { CurrencyCode, CurrencyRates } from '../types';

/** Value of one unit of `currencyCode` in the base currency (port of CurrencyConverter.c). */
export function rateOf(rates: CurrencyRates, currencyCode: CurrencyCode): number {
  return rates[currencyCode] ?? DEFAULT_CONVERSION_FACTOR;
}

/** Multiplier that turns an amount in `fromCurrency` into `toCurrency`. */
export function conversionFactor(
  rates: CurrencyRates,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
): number {
  return rateOf(rates, fromCurrency) / rateOf(rates, toCurrency);
}

/** Rounds like the app does before deciding whether an amount is worth showing. */
export function roundToFractionDigits(amount: number, fractionDigits: number): number {
  const scale = 10 ** fractionDigits;
  return Math.round(amount * scale) / scale;
}
