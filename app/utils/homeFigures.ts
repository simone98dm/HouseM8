import type { Bill, Expense } from '~/types';
import { toCents, toEuro } from '~~/shared/utils/money';
import { monthlySpend } from './monthlySpend';

type ExpenseLike = Pick<Expense, 'created_by' | 'created_at'> & {
  expense_shares?: Pick<
    NonNullable<Expense['expense_shares']>[number],
    'user_id' | 'amount_due' | 'is_paid'
  >[];
};

export interface YourMonth {
  /** Your share of the recurring bills, monthly-normalised. */
  bills: number;
  /** Your share of this calendar month's shared expenses. */
  shared: number;
  total: number;
}

const STALE_AFTER_DAYS = 14;

/**
 * The home hero's one figure: what the current user's part of the house costs
 * this month. Bills are monthly-normalised (`monthly_cost` / `payment_period`) and split evenly
 * (largest share, as `monthlySpend`); shared expenses are the user's own
 * `amount_due` on expenses created in the current calendar month, paid or not.
 * Summed in cents so the parts always add up to the total shown.
 */
export const yourMonth = ({
  bills,
  expenses,
  userId,
  memberCount,
  now = new Date(),
}: {
  bills: readonly (Pick<Bill, 'active' | 'monthly_cost'> &
    Partial<Pick<Bill, 'payment_period'>>)[];
  expenses: readonly ExpenseLike[];
  userId: string | undefined;
  memberCount: number;
  now?: Date;
}): YourMonth => {
  const billsCents = toCents(monthlySpend(bills, memberCount).share);
  const sharedCents = expenses
    .filter((e) => {
      const created = new Date(e.created_at);
      return (
        created.getFullYear() === now.getFullYear() &&
        created.getMonth() === now.getMonth()
      );
    })
    .flatMap((e) => e.expense_shares ?? [])
    .filter((s) => s.user_id === userId)
    .reduce((sum, s) => sum + toCents(Number(s.amount_due)), 0);
  return {
    bills: toEuro(billsCents),
    shared: toEuro(sharedCents),
    total: toEuro(billsCents + sharedCents),
  };
};

/**
 * Expenses where a housemate (not the payer) still owes their share after
 * more than two weeks: the "balances unsettled" signal for owners and admins.
 */
export const staleUnsettledCount = (
  expenses: readonly ExpenseLike[],
  now: Date = new Date(),
): number => {
  const cutoff = now.getTime() - STALE_AFTER_DAYS * 86_400_000;
  return expenses.filter(
    (e) =>
      new Date(e.created_at).getTime() < cutoff &&
      (e.expense_shares ?? []).some(
        (s) => !s.is_paid && s.user_id !== e.created_by,
      ),
  ).length;
};
