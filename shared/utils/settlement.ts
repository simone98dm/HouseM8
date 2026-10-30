import { minimizePayments } from '#shared/split-engine';
import { toEuro } from './money';

/**
 * `from`/`to` are userIds; `amount` is major currency units (euros/USD).
 */
export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

/**
 * Turns a balance sheet (integer cents, positive = receives) into the
 * smallest payment plan that clears it, via the vendored split-engine's
 * branch-and-bound `minimizePayments` (fewest transfers; people visited
 * sorted by id, so the plan is deterministic).
 *
 * ponytail: the engine search stops after 40k iterations / 2 s and returns
 * the best plan found so far. Fine for house-sized groups (the optimum is
 * found instantly up to ~10 non-zero balances); past ~15-20 people the plan
 * may be valid but not minimal — raise `maxIterations` only if that shows up.
 */
export const settleDebts = (
  balancesInCents: Record<string, number>,
): Transfer[] => {
  let total = 0;
  for (const [userId, cents] of Object.entries(balancesInCents)) {
    if (!Number.isInteger(cents)) {
      throw new Error(`Invalid balance for ${userId}: ${cents}`);
    }
    total += cents;
  }
  if (total !== 0) {
    throw new Error(
      `Balances don't reconcile: net ${total} cents (debts and credits must match)`,
    );
  }

  // balances are in cents and the engine has no minimum unit, so every
  // transfer is already a whole number of cents; none can round to zero
  return minimizePayments(balancesInCents).map((transfer) => ({
    from: transfer.from,
    to: transfer.to,
    amount: toEuro(transfer.amount),
  }));
};
