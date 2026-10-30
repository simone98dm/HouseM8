import type { Bill } from '~/types';
import { splitEvenly, toCents, toEuro } from '~~/shared/utils/money';

export interface MonthlySpend {
  /** Sum of every active bill's monthly cost. */
  total: number;
  /** The current user's even share of `total`; 0 when nobody is in the house. */
  share: number;
}

/**
 * What the house, and the current user, pay in recurring bills each month.
 * `monthly_cost` is the amount of one payment (the column name is legacy) and
 * `payment_period` the months between payments, so a quarterly bill counts
 * a third per month. Summed in cents so many bills
 * never drift, and the share is the largest even split, so it rounds up by a
 * cent rather than promising less than the user will actually pay.
 */
export const monthlySpend = (
  bills: readonly (Pick<Bill, 'active' | 'monthly_cost'> &
    Partial<Pick<Bill, 'payment_period'>>)[],
  memberCount: number,
): MonthlySpend => {
  const totalCents = bills
    .filter((bill) => bill.active)
    .reduce(
      (sum, bill) =>
        sum +
        Math.round(
          toCents(Number(bill.monthly_cost)) / (bill.payment_period || 1),
        ),
      0,
    );
  const [shareCents = 0] = splitEvenly(totalCents, memberCount);
  return { total: toEuro(totalCents), share: toEuro(shareCents) };
};

/**
 * The current user's even share of ONE payment of a bill (`monthly_cost` is
 * the amount per period). Largest even split, so it never promises less than
 * the user will pay; the whole cost when the house has one member or none.
 */
export const billShare = (cost: number, memberCount: number): number => {
  const [shareCents] = splitEvenly(toCents(Number(cost)), memberCount);
  return toEuro(shareCents ?? toCents(Number(cost)));
};
