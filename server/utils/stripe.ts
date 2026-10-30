import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    stripeClient = new Stripe(key, { apiVersion: '2026-09-30.endive' });
  }
  return stripeClient;
}

export const STRIPE_PRICES = {
  pro_monthly: process.env.STRIPE_PRICE_ID_PRO_MONTHLY!,
  pro_annual: process.env.STRIPE_PRICE_ID_PRO_ANNUAL!,
  house_plus_monthly: process.env.STRIPE_PRICE_ID_HOUSE_PLUS_MONTHLY!,
  house_plus_annual: process.env.STRIPE_PRICE_ID_HOUSE_PLUS_ANNUAL!,
} as const;

export type StripePriceKey = keyof typeof STRIPE_PRICES;

export function planFromPriceId(priceId: string): 'pro' | 'house_plus' {
  if (
    priceId === STRIPE_PRICES.pro_monthly ||
    priceId === STRIPE_PRICES.pro_annual
  )
    return 'pro';
  if (
    priceId === STRIPE_PRICES.house_plus_monthly ||
    priceId === STRIPE_PRICES.house_plus_annual
  )
    return 'house_plus';
  throw new Error(`Unknown price ID: ${priceId}`);
}

export function billingPeriodFromPriceId(
  priceId: string,
): 'monthly' | 'annual' {
  if (
    priceId === STRIPE_PRICES.pro_annual ||
    priceId === STRIPE_PRICES.house_plus_annual
  )
    return 'annual';
  return 'monthly';
}
