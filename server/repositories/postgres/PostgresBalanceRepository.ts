import { toSafeErrorMessage } from './utils';
/**
 * PostgreSQL Balance Repository Implementation
 *
 * SQL here is retrieval-only: raw expenses + expense_shares rows, scoped by
 * house_id. All money math (net balances, minimal settlement transfers)
 * happens in TS via `shared/utils/balance` + `shared/utils/settlement`, in
 * integer cents, so it can't drift the way `Number.parseFloat(SUM(...))`
 * does and always sums to exactly zero.
 */

import type { Pool } from 'pg';
import type {
  IBalanceRepository,
  HouseBalance,
  UserBalance,
  UserToUserBalance,
} from '~~/server/repositories/interfaces/IBalanceRepository';
import type { RepositoryResponse } from '~~/server/repositories/interfaces/IBaseRepository';
import type { User } from '~~/server/repositories/interfaces/IUserRepository';
import {
  calculateBalancesInCents,
  type BalanceExpenseInput,
  type BalancePaymentInput,
} from '#shared/utils/balance';
import { settleDebts } from '#shared/utils/settlement';
import { toCents, toEuro } from '#shared/utils/money';

interface HouseLedger {
  expenses: BalanceExpenseInput[];
  /** Non-undone settlements rows: real payments that reduce what is owed. */
  payments: BalancePaymentInput[];
  roster: string[];
  users: Map<string, User>;
  /** expense id -> due date ('YYYY-MM-DD'), only for expenses that have one. */
  dueDates: Map<string, string>;
}

/** A pool or a transaction client: lets the ledger be read inside a transaction. */
type Queryable = Pick<Pool, 'query'>;

/**
 * The current settle-up plan as plain transfers. Exported so a repository can
 * recompute it inside its own transaction (under the house lock) instead of
 * trusting a plan read earlier.
 */
export async function computeSettlementPlan(
  db: Queryable,
  houseId: string,
): Promise<{ from: string; to: string; amount: number }[]> {
  const ledger = await fetchHouseLedger(db, houseId);
  return settleDebts(
    calculateBalancesInCents(ledger.expenses, ledger.roster, ledger.payments),
  );
}

export class PostgresBalanceRepository implements IBalanceRepository {
  constructor(private readonly pool: Pool) {}

  async getHouseBalance(
    houseId: string,
  ): Promise<RepositoryResponse<HouseBalance>> {
    try {
      const ledger = await fetchHouseLedger(this.pool, houseId);

      let totalExpensesCents = 0;
      let totalPaidCents = 0;
      let totalPendingCents = 0;
      for (const expense of ledger.expenses) {
        totalExpensesCents += expense.totalAmountCents;
        for (const share of expense.shares) {
          if (share.isPaid) totalPaidCents += share.amountDueCents;
          else totalPendingCents += share.amountDueCents;
        }
      }

      const houseBalance: HouseBalance = {
        house_id: houseId,
        total_expenses: toEuro(totalExpensesCents),
        total_paid: toEuro(totalPaidCents),
        total_pending: toEuro(totalPendingCents),
        user_balances: this.buildUserBalances(ledger),
        user_to_user_balances: this.buildSettlementTransfers(ledger),
      };

      return { data: houseBalance, error: null };
    } catch (error) {
      return {
        data: null,
        error: toSafeErrorMessage(error),
      };
    }
  }

  async getUserBalance(
    houseId: string,
    userId: string,
  ): Promise<RepositoryResponse<UserBalance>> {
    try {
      const ledger = await fetchHouseLedger(this.pool, houseId);
      const existing = this.buildUserBalances(ledger).find(
        (b) => b.user_id === userId,
      );
      if (existing) return { data: existing, error: null };

      // User has no expenses in this house: zero balance, but still resolve
      // their profile for display.
      let user = ledger.users.get(userId);
      if (!user) {
        const userResult = await this.pool.query<User>(
          'SELECT id, email, first_name, last_name, avatar_url FROM users WHERE id = $1',
          [userId],
        );
        user = userResult.rows[0];
      }

      return {
        data: {
          user_id: userId,
          user,
          total_owed: 0,
          total_owed_to_user: 0,
          net_balance: 0,
          pending_expenses_count: 0,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: toSafeErrorMessage(error),
      };
    }
  }

  async getUserToUserBalance(
    houseId: string,
    fromUserId: string,
    toUserId: string,
  ): Promise<RepositoryResponse<UserToUserBalance>> {
    try {
      const ledger = await fetchHouseLedger(this.pool, houseId);

      let amountCents = 0;
      let expenseCount = 0;
      for (const expense of ledger.expenses) {
        if (expense.createdBy !== toUserId) continue;
        for (const share of expense.shares) {
          if (share.isPaid || share.userId !== fromUserId) continue;
          amountCents += share.amountDueCents;
          expenseCount += 1;
        }
      }

      return {
        data: {
          from_user_id: fromUserId,
          to_user_id: toUserId,
          from_user: ledger.users.get(fromUserId),
          to_user: ledger.users.get(toUserId),
          amount: toEuro(amountCents),
          expense_count: expenseCount,
          due_date: null,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: toSafeErrorMessage(error),
      };
    }
  }

  async getAllUserToUserBalances(
    houseId: string,
  ): Promise<RepositoryResponse<UserToUserBalance[]>> {
    try {
      const ledger = await fetchHouseLedger(this.pool, houseId);
      return { data: this.buildSettlementTransfers(ledger), error: null };
    } catch (error) {
      return {
        data: null,
        error: toSafeErrorMessage(error),
      };
    }
  }

  /**
   * Per-user balance rows for currently active house members. `total_owed`
   * / `total_owed_to_user` are the magnitudes; `net_balance` is sourced from
   * the exact same `calculateBalancesInCents` pass so the two can never
   * disagree. Owed amounts are derived from the net position (shares minus
   * payments), so a netted settle-up zeroes them even when no single share
   * could be allocated.
   */
  private buildUserBalances(ledger: HouseLedger): UserBalance[] {
    const netCents = calculateBalancesInCents(
      ledger.expenses,
      ledger.roster,
      ledger.payments,
    );

    return ledger.roster.map((userId) => {
      let pendingCount = 0;
      for (const expense of ledger.expenses) {
        for (const share of expense.shares) {
          if (share.isPaid || share.userId === expense.createdBy) continue;
          if (share.userId === userId) pendingCount += 1;
        }
      }
      const net = netCents[userId] ?? 0;

      return {
        user_id: userId,
        user: ledger.users.get(userId),
        total_owed: toEuro(Math.max(0, -net)),
        total_owed_to_user: toEuro(Math.max(0, net)),
        net_balance: toEuro(net),
        pending_expenses_count: pendingCount,
      };
    });
  }

  /**
   * Minimal-transfer settlement plan (<= n-1 transfers) covering every
   * outstanding cent, including house members who have since left — their
   * historical debts must still settle, not vanish.
   */
  private buildSettlementTransfers(ledger: HouseLedger): UserToUserBalance[] {
    const netCents = calculateBalancesInCents(
      ledger.expenses,
      ledger.roster,
      ledger.payments,
    );

    // ponytail: a settled transfer isn't 1:1 with a source expense (it can
    // net several), so expense_count approximates it with the debtor's own
    // pending-share count rather than trying to attribute it exactly.
    const pendingCountByUser = new Map<string, number>();
    for (const expense of ledger.expenses) {
      for (const share of expense.shares) {
        if (share.isPaid || share.userId === expense.createdBy) continue;
        pendingCountByUser.set(
          share.userId,
          (pendingCountByUser.get(share.userId) ?? 0) + 1,
        );
      }
    }

    // due_date of a transfer: the earliest due date among the debtor's unpaid
    // shares on expenses the creditor created (what they directly owe). When
    // the plan nets across people there are none, so fall back to the earliest
    // among all the debtor's unpaid shares; null if no expense has a date.
    // 'YYYY-MM-DD' strings sort chronologically, so plain comparison is enough.
    const earliest = (a: string | null, b: string | undefined) =>
      b && (!a || b < a) ? b : a;
    const dueByDebtor = new Map<string, string | null>();
    const dueByPair = new Map<string, string | null>();
    for (const expense of ledger.expenses) {
      const due = ledger.dueDates.get(expense.id);
      if (!due) continue;
      for (const share of expense.shares) {
        if (share.isPaid || share.userId === expense.createdBy) continue;
        dueByDebtor.set(
          share.userId,
          earliest(dueByDebtor.get(share.userId) ?? null, due),
        );
        const pair = `${share.userId}>${expense.createdBy}`;
        dueByPair.set(pair, earliest(dueByPair.get(pair) ?? null, due));
      }
    }

    return settleDebts(netCents).map((transfer) => ({
      from_user_id: transfer.from,
      to_user_id: transfer.to,
      from_user: ledger.users.get(transfer.from),
      to_user: ledger.users.get(transfer.to),
      amount: transfer.amount,
      expense_count: pendingCountByUser.get(transfer.from) ?? 0,
      due_date:
        dueByPair.get(`${transfer.from}>${transfer.to}`) ??
        dueByDebtor.get(transfer.from) ??
        null,
    }));
  }
}

/**
 * Raw, un-aggregated read of every expense + share in the house, plus the
 * currently active roster and every user referenced (including members
 * who have since left the house).
 */
async function fetchHouseLedger(
  db: Queryable,
  houseId: string,
): Promise<HouseLedger> {
  const rowsResult = await db.query<{
    expense_id: string;
    created_by: string;
    total_amount: string;
    share_user_id: string | null;
    amount_due: string | null;
    is_paid: boolean | null;
    due_date: string | null;
  }>(
    `SELECT e.id as expense_id, e.created_by, e.total_amount,
        es.user_id as share_user_id, es.amount_due, es.is_paid,
        to_char(e.due_date, 'YYYY-MM-DD') as due_date
       FROM expenses e
       LEFT JOIN expense_shares es ON es.expense_id = e.id
       WHERE e.house_id = $1`,
    [houseId],
  );

  const expenseMap = new Map<string, BalanceExpenseInput>();
  const dueDates = new Map<string, string>();
  for (const row of rowsResult.rows) {
    let expense = expenseMap.get(row.expense_id);
    if (!expense) {
      expense = {
        id: row.expense_id,
        createdBy: row.created_by,
        totalAmountCents: toCents(Number.parseFloat(row.total_amount)),
        shares: [],
      };
      expenseMap.set(row.expense_id, expense);
      if (row.due_date) dueDates.set(row.expense_id, row.due_date);
    }
    if (row.share_user_id) {
      expense.shares.push({
        userId: row.share_user_id,
        amountDueCents: toCents(Number.parseFloat(row.amount_due ?? '0')),
        isPaid: row.is_paid ?? false,
      });
    }
  }

  const paymentsResult = await db.query<{
    from_user_id: string;
    to_user_id: string;
    amount: string;
  }>(
    `SELECT from_user_id, to_user_id, amount
       FROM settlements
      WHERE house_id = $1 AND undone_at IS NULL`,
    [houseId],
  );
  const payments: BalancePaymentInput[] = paymentsResult.rows.map((r) => ({
    fromUserId: r.from_user_id,
    toUserId: r.to_user_id,
    amountCents: toCents(Number.parseFloat(r.amount)),
  }));

  const rosterResult = await db.query<{ user_id: string }>(
    `SELECT user_id FROM house_members WHERE house_id = $1 AND left_at IS NULL`,
    [houseId],
  );
  const roster = rosterResult.rows.map((r) => r.user_id);

  const allUserIds = new Set<string>(roster);
  for (const payment of payments) {
    allUserIds.add(payment.fromUserId);
    allUserIds.add(payment.toUserId);
  }
  for (const expense of expenseMap.values()) {
    allUserIds.add(expense.createdBy);
    for (const share of expense.shares) allUserIds.add(share.userId);
  }

  const users = new Map<string, User>();
  if (allUserIds.size > 0) {
    const usersResult = await db.query<User>(
      `SELECT id, email, first_name, last_name, avatar_url FROM users WHERE id = ANY($1)`,
      [[...allUserIds]],
    );
    for (const user of usersResult.rows) users.set(user.id, user);
  }

  return {
    expenses: [...expenseMap.values()],
    payments,
    roster,
    users,
    dueDates,
  };
}
