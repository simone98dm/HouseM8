import {
  MAX_SEARCH_ITERATIONS,
  SEARCH_TIME_BUDGET_MS,
  SETTLED_BALANCE_EPSILON,
  TIME_CHECK_INTERVAL,
  TIME_CHECK_MIN_ITERATIONS,
} from '../constants';
import type { Balances, PersonId } from '../types';

/** A raw transfer found by the search, in the balances' currency. */
export interface Transfer {
  readonly from: PersonId;
  readonly to: PersonId;
  readonly amount: number;
}

interface Account {
  readonly personId: PersonId;
  /** Positive for creditors, negative for debtors; moves toward 0 as transfers are applied. */
  readonly remaining: number;
}

export interface MinimizerOptions {
  /** Clock used for the time budget; injectable for tests. */
  readonly now?: () => number;
  readonly maxIterations?: number;
  readonly timeBudgetMs?: number;
}

/** Shared across the whole recursion: stops the search when it takes too long. */
class SearchBudget {
  private iterations = 0;
  private readonly startedAt: number;

  constructor(
    private readonly now: () => number,
    private readonly maxIterations: number,
    private readonly timeBudgetMs: number,
  ) {
    this.startedAt = now();
  }

  countIteration(): void {
    this.iterations += 1;
  }

  isExhausted(): boolean {
    if (this.iterations > this.maxIterations) return true;
    return (
      this.iterations >= TIME_CHECK_MIN_ITERATIONS &&
      this.iterations % TIME_CHECK_INTERVAL === 0 &&
      this.now() - this.startedAt > this.timeBudgetMs
    );
  }
}

const isOpen = (account: Account): boolean => Math.abs(account.remaining) > SETTLED_BALANCE_EPSILON;

function withRemaining(accounts: readonly Account[], index: number, remaining: number): Account[] {
  return accounts.map((account, i) => (i === index ? { ...account, remaining } : account));
}

/**
 * Depth-first branch-and-bound: try every (debtor → creditor) transfer of the
 * largest possible amount, recurse, and keep the shortest plan that uses
 * fewer than `paymentLimit` transfers. Returns null when no such plan exists.
 */
function searchShortestPlan(
  creditors: readonly Account[],
  debtors: readonly Account[],
  paymentLimit: number,
  budget: SearchBudget,
): Transfer[] | null {
  const openCreditors = creditors.filter(isOpen).length;
  const openDebtors = debtors.filter(isOpen).length;
  if (openCreditors + openDebtors <= 1) return [];
  // Every open account needs at least one transfer, so this branch can't beat the limit.
  if (Math.max(openCreditors, openDebtors) >= paymentLimit) return null;

  let bestPlan: Transfer[] | null = null;
  for (const [debtorIndex, debtor] of debtors.entries()) {
    if (!isOpen(debtor)) continue;
    for (const [creditorIndex, creditor] of creditors.entries()) {
      if (!isOpen(creditor)) continue;
      // A single transfer can't be beaten; otherwise stop if we ran out of budget.
      if ((bestPlan !== null && bestPlan.length <= 1) || budget.isExhausted()) return bestPlan;

      const amount = Math.min(Math.abs(debtor.remaining), Math.abs(creditor.remaining));
      const limitForRest = (bestPlan?.length ?? paymentLimit) - 1;
      budget.countIteration();
      const rest = searchShortestPlan(
        withRemaining(creditors, creditorIndex, creditor.remaining - amount),
        withRemaining(debtors, debtorIndex, debtor.remaining + amount),
        limitForRest,
        budget,
      );
      if (rest !== null && rest.length < limitForRest) {
        bestPlan = [{ from: debtor.personId, to: creditor.personId, amount }, ...rest];
      }
    }
  }
  return bestPlan;
}

/**
 * Finds a short list of transfers that settles all balances
 * (port of PaymentsMinimizer.a/b). People are visited sorted by id, so the
 * result is deterministic as long as the time budget is not hit.
 */
export function minimizePayments(balances: Balances, options: MinimizerOptions = {}): Transfer[] {
  const accounts = Object.keys(balances)
    .sort()
    .map((personId) => ({ personId, remaining: balances[personId] ?? 0 }));
  const creditors = accounts.filter((account) => account.remaining > 0);
  const debtors = accounts.filter((account) => account.remaining <= 0);

  const budget = new SearchBudget(
    options.now ?? Date.now,
    options.maxIterations ?? MAX_SEARCH_ITERATIONS,
    options.timeBudgetMs ?? SEARCH_TIME_BUDGET_MS,
  );
  const plan = searchShortestPlan(creditors, debtors, accounts.length, budget);
  if (plan === null) {
    // The first greedy descent always yields a plan, so this means a logic bug.
    throw new Error('Payments could not be calculated');
  }
  return plan;
}
