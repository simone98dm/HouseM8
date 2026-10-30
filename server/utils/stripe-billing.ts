import type { H3Event } from 'h3';

export const IT_VAT_RATE = 0.22;

export type BillingLocale = 'it' | 'en';

/** Locale from Accept-Language (users have no stored locale); null when unknown. */
export function requestLocale(event: H3Event): BillingLocale | null {
  const header = getRequestHeader(event, 'accept-language');
  const tag = header?.split(',')[0]?.trim().toLowerCase().slice(0, 2);
  return tag === 'it' || tag === 'en' ? tag : null;
}

/** Amount in minor units as shown to the consumer: always VAT-inclusive (IT 22%). */
export function vatInclusiveAmount(
  unitAmount: number,
  taxBehavior: string | null | undefined,
): number {
  return taxBehavior === 'inclusive'
    ? unitAmount
    : Math.round(unitAmount * (1 + IT_VAT_RATE));
}

export function formatMoney(
  minor: number,
  currency: string,
  locale: BillingLocale,
): string {
  return new Intl.NumberFormat(locale === 'it' ? 'it-IT' : 'en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(minor / 100);
}
