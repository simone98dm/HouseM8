import { getStripeClient, STRIPE_PRICES } from '~~/server/utils/stripe';
import type { StripePriceKey } from '~~/server/utils/stripe';
import {
  IT_VAT_RATE,
  vatInclusiveAmount,
} from '~~/server/utils/stripe-billing';

// Public prices change rarely; the stripe-flag middleware still runs first.
export default defineCachedEventHandler(
  async () => {
    const stripe = getStripeClient();
    const keys = (Object.keys(STRIPE_PRICES) as StripePriceKey[]).filter(
      (key) => STRIPE_PRICES[key],
    );

    const entries = await Promise.all(
      keys.map(async (key) => {
        const price = await stripe.prices.retrieve(STRIPE_PRICES[key]);
        const unitAmount = price.unit_amount ?? 0;
        return [
          key,
          {
            unit_amount: unitAmount,
            currency: price.currency,
            interval: price.recurring?.interval ?? null,
            tax_behavior: price.tax_behavior ?? 'unspecified',
            // display_amount always includes IT VAT (22% added when the price is exclusive).
            display_amount: vatInclusiveAmount(unitAmount, price.tax_behavior),
            vat_included: true,
            vat_rate: IT_VAT_RATE,
          },
        ] as const;
      }),
    );

    return { data: Object.fromEntries(entries) };
  },
  { maxAge: 60 * 60, name: 'stripe-prices', getKey: () => 'all' },
);
