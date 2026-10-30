import type { Pool } from 'pg';
import type {
  IExpenseRepository,
  Expense,
  ExpenseShare,
  ExpenseCreateData,
  ExpenseUpdateData,
  ExpenseShareUpdateData,
  ExpenseFilterOptions,
  Settlement,
  SettlementListItem,
  RecordSettlementResult,
} from '../interfaces/IExpenseRepository';
import type {
  RepositoryResponse,
  PaginatedResponse,
  PaginationParams,
} from '../interfaces/IBaseRepository';
import { repoQuery } from './utils';
import { computeSettlementPlan } from './PostgresBalanceRepository';
import { sharesForExpense } from '#shared/utils/balance';
import { toCents, toEuro } from '#shared/utils/money';

function normalizeExpense(expense: Expense): Expense {
  return {
    ...expense,
    total_amount:
      typeof expense.total_amount === 'string'
        ? Number.parseFloat(expense.total_amount)
        : expense.total_amount,
  };
}

function normalizeExpenseShare(share: ExpenseShare): ExpenseShare {
  return {
    ...share,
    amount_due:
      share.amount_due && typeof share.amount_due === 'string'
        ? Number.parseFloat(share.amount_due)
        : share.amount_due,
  };
}

/**
 * Serialises every write that moves a house's balances (plan payments, share
 * pay/unpay, undo, expense delete). Transaction-scoped: released on COMMIT or
 * ROLLBACK. Always taken BEFORE any row lock, so the order is the same on every
 * path and cannot deadlock.
 */
const LOCK_HOUSE_SQL = `SELECT pg_advisory_xact_lock(hashtext('settlements:' || $1::text))`;

export class PostgresExpenseRepository implements IExpenseRepository {
  constructor(private readonly pool: Pool) {}

  async getById(expenseId: string): Promise<RepositoryResponse<Expense>> {
    return repoQuery(async () => {
      const expenseResult = await this.pool.query<Expense>(
        `SELECT e.*,
          json_build_object(
            'id', u.id,
            'email', u.email,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'avatar_url', u.avatar_url
          ) as creator
         FROM expenses e
         LEFT JOIN users u ON e.created_by = u.id
         WHERE e.id = $1`,
        [expenseId],
      );

      if (!expenseResult.rows.length) throw new Error('Expense not found');
      const expense = expenseResult.rows[0]!;

      const sharesResult = await this.pool.query<ExpenseShare>(
        `SELECT es.*,
          json_build_object(
            'id', u.id,
            'email', u.email,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'avatar_url', u.avatar_url
          ) as users
         FROM expense_shares es
         LEFT JOIN users u ON es.user_id = u.id
         WHERE es.expense_id = $1
         ORDER BY u.first_name, u.last_name`,
        [expenseId],
      );

      expense.expense_shares = sharesResult.rows.map(normalizeExpenseShare);
      expense.shares = sharesResult.rows.map(normalizeExpenseShare);
      return normalizeExpense(expense);
    });
  }

  async getByHouse(
    houseId: string,
    pagination: PaginationParams,
    filters?: ExpenseFilterOptions,
  ): Promise<PaginatedResponse<Expense>> {
    const offset = (pagination.page - 1) * pagination.limit;

    const result = await repoQuery<PaginatedResponse<Expense>>(async () => {
      const conditions = ['e.house_id = $1'];
      const params: unknown[] = [houseId];
      let paramCount = 2;

      if (filters?.user_id) {
        conditions.push(`EXISTS (
          SELECT 1 FROM expense_shares es
          WHERE es.expense_id = e.id AND es.user_id = $${paramCount}
        )`);
        params.push(filters.user_id);
        paramCount++;
      }

      if (filters?.status === 'pending') {
        conditions.push(`EXISTS (
          SELECT 1 FROM expense_shares es
          WHERE es.expense_id = e.id AND es.is_paid = false
        )`);
      } else if (filters?.status === 'settled') {
        conditions.push(`NOT EXISTS (
          SELECT 1 FROM expense_shares es
          WHERE es.expense_id = e.id AND es.is_paid = false
        )`);
      }

      if (filters?.from) {
        conditions.push(`e.created_at >= $${paramCount}`);
        params.push(filters.from);
        paramCount++;
      }

      if (filters?.to) {
        conditions.push(`e.created_at <= $${paramCount}`);
        params.push(filters.to);
        paramCount++;
      }

      const whereClause = conditions.join(' AND ');

      const countResult = await this.pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM expenses e WHERE ${whereClause}`,
        params,
      );
      const total = Number.parseInt(countResult.rows[0]?.count || '0');

      params.push(pagination.limit, offset);

      const expensesResult = await this.pool.query<Expense>(
        `SELECT e.*,
          json_build_object(
            'id', u.id,
            'email', u.email,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'avatar_url', u.avatar_url
          ) as creator
         FROM expenses e
         LEFT JOIN users u ON e.created_by = u.id
         WHERE ${whereClause}
         ORDER BY e.created_at DESC
         LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        params,
      );

      const expenses = expensesResult.rows;

      if (expenses.length > 0) {
        const expenseIds = expenses.map((e) => e.id);
        const sharesResult = await this.pool.query<
          ExpenseShare & { expense_id: string }
        >(
          `SELECT es.*,
            json_build_object(
              'id', u.id,
              'email', u.email,
              'first_name', u.first_name,
              'last_name', u.last_name,
              'avatar_url', u.avatar_url
            ) as users
           FROM expense_shares es
           LEFT JOIN users u ON es.user_id = u.id
           WHERE es.expense_id = ANY($1)
           ORDER BY u.first_name, u.last_name`,
          [expenseIds],
        );

        const sharesByExpense = new Map<string, ExpenseShare[]>();
        sharesResult.rows.forEach((share) => {
          const expenseShares = sharesByExpense.get(share.expense_id) || [];
          expenseShares.push(share);
          sharesByExpense.set(share.expense_id, expenseShares);
        });

        expenses.forEach((expense) => {
          const shares = sharesByExpense.get(expense.id) || [];
          expense.expense_shares = shares.map(normalizeExpenseShare);
          expense.shares = shares.map(normalizeExpenseShare);
        });
      }

      return {
        data: expenses.map(normalizeExpense),
        error: null,
        total,
        limit: pagination.limit,
        offset,
      };
    });

    if (result.error || !result.data) {
      return {
        data: [],
        error: result.error,
        total: 0,
        limit: pagination.limit,
        offset,
      };
    }
    return result.data;
  }

  async create(data: ExpenseCreateData): Promise<RepositoryResponse<Expense>> {
    return repoQuery(async () => {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');

        const expenseResult = await client.query<Expense>(
          `INSERT INTO expenses (
            house_id, created_by, description, total_amount, currency,
            due_date, recurring, recurring_period, categories,
            created_at, updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
           RETURNING *`,
          [
            data.house_id,
            data.created_by,
            data.description,
            data.total_amount,
            data.currency,
            data.due_date || null,
            data.recurring || false,
            data.recurring_period || null,
            data.categories ?? [],
          ],
        );

        const expense = expenseResult.rows[0];
        if (!expense) throw new Error('Failed to create expense');

        // Reject share recipients who aren't active members of this house —
        // without this, any authenticated caller could attach expense
        // shares (debts) to arbitrary user_ids from anywhere in the system.
        const membershipResult = await client.query<{ user_id: string }>(
          `SELECT user_id FROM house_members
           WHERE house_id = $1 AND user_id = ANY($2) AND left_at IS NULL`,
          [data.house_id, data.user_ids],
        );
        const memberIds = new Set(membershipResult.rows.map((r) => r.user_id));
        const invalidUserIds = data.user_ids.filter((id) => !memberIds.has(id));
        if (invalidUserIds.length > 0) {
          throw new Error(
            `Cannot split expense with non-member user_ids: ${invalidUserIds.join(', ')}`,
          );
        }

        // Deterministic-rotation integer-cent split: leftover cents rotate
        // across expenses (offset = creation timestamp) instead of always
        // landing on the first participant.
        const offset = new Date(expense.created_at).getTime();
        const shareAmounts = sharesForExpense(
          data.total_amount,
          data.user_ids.length,
          offset,
        ).map((cents) => toEuro(cents));

        const shareValues = data.user_ids
          .map(
            (_, index) =>
              `($1, $${index + 2}, $${data.user_ids.length + index + 2}, false, NULL)`,
          )
          .join(', ');

        await client.query(
          `INSERT INTO expense_shares (expense_id, user_id, amount_due, is_paid, paid_at)
           VALUES ${shareValues}`,
          [expense.id, ...data.user_ids, ...shareAmounts],
        );

        await client.query('COMMIT');

        const result = await this.getById(expense.id);
        if (result.error) throw new Error(result.error);
        return result.data!;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    });
  }

  async update(
    expenseId: string,
    data: ExpenseUpdateData,
  ): Promise<RepositoryResponse<Expense>> {
    return repoQuery(async () => {
      const updates: string[] = ['updated_at = NOW()'];
      const values: unknown[] = [];
      let paramCount = 1;

      if (data.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(data.description);
      }
      if (data.total_amount !== undefined) {
        updates.push(`total_amount = $${paramCount++}`);
        values.push(data.total_amount);
      }
      if (data.due_date !== undefined) {
        updates.push(`due_date = $${paramCount++}`);
        values.push(data.due_date);
      }
      if (data.recurring !== undefined) {
        updates.push(`recurring = $${paramCount++}`);
        values.push(data.recurring);
      }
      if (data.recurring_period !== undefined) {
        updates.push(`recurring_period = $${paramCount++}`);
        values.push(data.recurring_period);
      }
      if (data.categories !== undefined) {
        updates.push(`categories = $${paramCount++}`);
        values.push(data.categories);
      }

      values.push(expenseId);

      const result = await this.pool.query<Expense>(
        `UPDATE expenses
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}
         RETURNING *`,
        values,
      );

      if (!result.rows.length) throw new Error('Expense not found');

      const updated = await this.getById(expenseId);
      if (updated.error) throw new Error(updated.error);
      return updated.data!;
    });
  }

  async delete(expenseId: string): Promise<RepositoryResponse<void>> {
    return repoQuery(async () => {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        // Same house lock as the payment paths, so a delete cannot interleave
        // with a settle-up computed from the expense being removed.
        await client.query(
          `SELECT pg_advisory_xact_lock(hashtext('settlements:' || house_id::text))
             FROM expenses WHERE id = $1`,
          [expenseId],
        );
        // A 'share' payment only exists because of its share; drop it with the
        // expense so the debt and its payment vanish together (plan settlements
        // stay: they were real money moved).
        await client.query(
          `DELETE FROM settlements
            WHERE kind = 'share'
              AND share_id IN (SELECT id FROM expense_shares WHERE expense_id = $1)`,
          [expenseId],
        );
        await client.query('DELETE FROM expenses WHERE id = $1', [expenseId]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    });
  }

  async getShares(
    expenseId: string,
  ): Promise<RepositoryResponse<ExpenseShare[]>> {
    return repoQuery(async () => {
      const result = await this.pool.query<ExpenseShare>(
        `SELECT es.*,
          json_build_object(
            'id', u.id,
            'email', u.email,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'avatar_url', u.avatar_url
          ) as users
         FROM expense_shares es
         LEFT JOIN users u ON es.user_id = u.id
         WHERE es.expense_id = $1
         ORDER BY u.first_name, u.last_name`,
        [expenseId],
      );
      return result.rows.map(normalizeExpenseShare);
    });
  }

  async getShareById(
    shareId: string,
  ): Promise<
    RepositoryResponse<
      ExpenseShare & { expense?: { id: string; house_id: string } }
    >
  > {
    return repoQuery(async () => {
      const result = await this.pool.query<
        ExpenseShare & { expense?: { id: string; house_id: string } }
      >(
        `SELECT es.*,
          json_build_object(
            'id', u.id,
            'email', u.email,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'avatar_url', u.avatar_url
          ) as users,
          json_build_object(
            'id', e.id,
            'house_id', e.house_id
          ) as expense
         FROM expense_shares es
         LEFT JOIN users u ON es.user_id = u.id
         LEFT JOIN expenses e ON es.expense_id = e.id
         WHERE es.id = $1`,
        [shareId],
      );

      if (!result.rows.length) throw new Error('Share not found');
      return normalizeExpenseShare(result.rows[0]!);
    });
  }

  async updateShare(
    shareId: string,
    data: ExpenseShareUpdateData,
  ): Promise<RepositoryResponse<ExpenseShare>> {
    return repoQuery(async () => {
      if (data.is_paid === undefined) {
        // only paid_at: nothing that touches the payments ledger
        const result = await this.pool.query<ExpenseShare>(
          data.paid_at === undefined
            ? 'SELECT * FROM expense_shares WHERE id = $1'
            : 'UPDATE expense_shares SET paid_at = $2 WHERE id = $1 RETURNING *',
          data.paid_at === undefined ? [shareId] : [shareId, data.paid_at],
        );
        if (!result.rows.length) throw new Error('Share not found');
        return normalizeExpenseShare(result.rows[0]!);
      }

      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        // House lock first (see LOCK_HOUSE_SQL); house_id never changes, so
        // reading it unlocked is safe. The share row is re-read locked below.
        const houseRow = await client.query(
          `SELECT pg_advisory_xact_lock(hashtext('settlements:' || e.house_id::text))
             FROM expense_shares es
             JOIN expenses e ON e.id = es.expense_id
            WHERE es.id = $1`,
          [shareId],
        );
        if (!houseRow.rows.length) throw new Error('Share not found');
        const found = await client.query<{
          house_id: string;
          created_by: string;
          user_id: string;
          amount_due: string;
          is_paid: boolean;
          settlement_id: string | null;
        }>(
          `SELECT e.house_id, e.created_by, es.user_id, es.amount_due,
                  es.is_paid, es.settlement_id
             FROM expense_shares es
             JOIN expenses e ON e.id = es.expense_id
            WHERE es.id = $1
            FOR UPDATE OF es`,
          [shareId],
        );
        const share = found.rows[0];
        if (!share) throw new Error('Share not found');

        if (data.is_paid && !share.is_paid) {
          if (share.user_id !== share.created_by) {
            await this.insertSharePayment(client, shareId, share);
          }
        } else if (!data.is_paid && share.is_paid) {
          if (share.settlement_id) throw new Error('SHARE_PAID_BY_SETTLEMENT');
          await client.query(
            `UPDATE settlements SET undone_at = NOW()
              WHERE share_id = $1 AND kind = 'share' AND undone_at IS NULL`,
            [shareId],
          );
        }

        const updated = await client.query<ExpenseShare>(
          `UPDATE expense_shares
              SET is_paid = $2, paid_at = $3
            WHERE id = $1
            RETURNING *`,
          [
            shareId,
            data.is_paid,
            data.is_paid ? (data.paid_at ?? new Date().toISOString()) : null,
          ],
        );
        await client.query('COMMIT');
        return normalizeExpenseShare(updated.rows[0]!);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    });
  }

  private async insertSharePayment(
    client: { query: Pool['query'] },
    shareId: string,
    share: {
      house_id: string;
      created_by: string;
      user_id: string;
      amount_due: string;
    },
  ): Promise<void> {
    if (!(Number.parseFloat(share.amount_due) > 0)) return;
    await client.query(
      `INSERT INTO settlements
         (house_id, from_user_id, to_user_id, amount, kind, share_id, created_by)
       VALUES ($1, $2, $3, $4, 'share', $5, $2)`,
      [
        share.house_id,
        share.user_id,
        share.created_by,
        share.amount_due,
        shareId,
      ],
    );
  }

  async markSharesAsPaid(
    shareIds: string[],
  ): Promise<RepositoryResponse<void>> {
    return repoQuery(async () => {
      // One statement = atomic: flag the still-unpaid shares and record their
      // payments (the creator's own share has nobody to pay).
      await this.pool.query(
        `WITH upd AS (
           UPDATE expense_shares
              SET is_paid = true, paid_at = NOW()
            WHERE id = ANY($1::uuid[]) AND is_paid = false
            RETURNING id, expense_id, user_id, amount_due
         )
         INSERT INTO settlements
           (house_id, from_user_id, to_user_id, amount, kind, share_id, created_by)
         SELECT e.house_id, upd.user_id, e.created_by, upd.amount_due,
                'share', upd.id, upd.user_id
           FROM upd
           JOIN expenses e ON e.id = upd.expense_id
          WHERE upd.user_id <> e.created_by AND upd.amount_due > 0`,
        [shareIds],
      );
    });
  }

  async recordSettlement(
    houseId: string,
    fromUserId: string,
    toUserId: string,
    createdBy: string,
  ): Promise<RepositoryResponse<RecordSettlementResult>> {
    return repoQuery(async () => {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        // Plan check + insert are one atomic step per house: a concurrent
        // request for the same pair waits here, then recomputes the plan with
        // this payment already counted and gets NOT_IN_PLAN.
        await client.query(LOCK_HOUSE_SQL, [houseId]);

        const plan = await computeSettlementPlan(client, houseId);
        const transfer = plan.find(
          (t) => t.from === fromUserId && t.to === toUserId,
        );
        if (!transfer) throw new Error('NOT_IN_PLAN');
        const amount = transfer.amount;

        const inserted = await client.query<{ id: string }>(
          `INSERT INTO settlements
             (house_id, from_user_id, to_user_id, amount, kind, created_by)
           VALUES ($1, $2, $3, $4, 'settlement', $5)
           RETURNING id`,
          [houseId, fromUserId, toUserId, amount, createdBy],
        );
        const settlementId = inserted.rows[0]!.id;

        // Display-only allocation, oldest due/created first. Whole shares only;
        // a remainder smaller than the next share stays unallocated.
        const candidates = await client.query<{
          id: string;
          amount_due: string;
        }>(
          `SELECT es.id, es.amount_due
             FROM expense_shares es
             JOIN expenses e ON e.id = es.expense_id
            WHERE e.house_id = $1
              AND es.user_id = $2 AND e.created_by = $3
              AND es.is_paid = false
            ORDER BY COALESCE(e.due_date, e.created_at::date), e.created_at, es.id
            FOR UPDATE OF es`,
          [houseId, fromUserId, toUserId],
        );

        let remaining = toCents(amount);
        const allocate: string[] = [];
        for (const row of candidates.rows) {
          const cents = toCents(Number.parseFloat(row.amount_due));
          if (cents > remaining) break;
          remaining -= cents;
          allocate.push(row.id);
        }

        if (allocate.length > 0) {
          await client.query(
            `UPDATE expense_shares
                SET is_paid = true, paid_at = NOW(), settlement_id = $2
              WHERE id = ANY($1::uuid[])`,
            [allocate, settlementId],
          );
        }

        await client.query('COMMIT');
        return { settlementId, allocatedCount: allocate.length, amount };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    });
  }

  async getSettlement(
    houseId: string,
    settlementId: string,
  ): Promise<RepositoryResponse<Settlement | null>> {
    return repoQuery(async () => {
      const result = await this.pool.query<Settlement>(
        `SELECT id, house_id, from_user_id, to_user_id, amount::float8 AS amount,
                kind, created_by, created_at, undone_at
           FROM settlements
          WHERE id = $1 AND house_id = $2`,
        [settlementId, houseId],
      );
      return result.rows[0] ?? null;
    });
  }

  async listSettlements(
    houseId: string,
    limit: number,
  ): Promise<RepositoryResponse<SettlementListItem[]>> {
    return repoQuery(async () => {
      const result = await this.pool.query<SettlementListItem>(
        `SELECT s.id, s.house_id, s.from_user_id, s.to_user_id,
                s.amount::float8 AS amount, s.kind, s.created_by,
                s.created_at, s.undone_at,
                json_build_object('id', fu.id, 'first_name', fu.first_name, 'avatar_url', fu.avatar_url) AS from_user,
                json_build_object('id', tu.id, 'first_name', tu.first_name, 'avatar_url', tu.avatar_url) AS to_user
           FROM settlements s
           LEFT JOIN users fu ON fu.id = s.from_user_id
           LEFT JOIN users tu ON tu.id = s.to_user_id
          WHERE s.house_id = $1
          ORDER BY s.created_at DESC
          LIMIT $2`,
        [houseId, limit],
      );
      return result.rows;
    });
  }

  async undoSettlement(
    houseId: string,
    settlementId: string,
  ): Promise<RepositoryResponse<{ count: number }>> {
    return repoQuery(async () => {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(LOCK_HOUSE_SQL, [houseId]);

        // The guard on undone_at makes a double or concurrent undo a no-op.
        const stamped = await client.query(
          `UPDATE settlements SET undone_at = NOW()
            WHERE id = $1 AND house_id = $2 AND undone_at IS NULL`,
          [settlementId, houseId],
        );
        if ((stamped.rowCount ?? 0) === 0) {
          const exists = await client.query(
            `SELECT 1 FROM settlements WHERE id = $1 AND house_id = $2`,
            [settlementId, houseId],
          );
          throw new Error(
            exists.rows.length ? 'ALREADY_UNDONE' : 'SETTLEMENT_NOT_FOUND',
          );
        }

        const reverted = await client.query(
          `UPDATE expense_shares
              SET is_paid = false, paid_at = NULL, settlement_id = NULL
            WHERE settlement_id = $1 AND is_paid = true`,
          [settlementId],
        );

        await client.query('COMMIT');
        return { count: reverted.rowCount ?? 0 };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    });
  }

  async getPendingForUser(
    userId: string,
    houseId: string,
  ): Promise<RepositoryResponse<Expense[]>> {
    return repoQuery(async () => {
      const result = await this.pool.query<Expense>(
        `SELECT DISTINCT e.*,
          json_build_object(
            'id', u.id,
            'email', u.email,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'avatar_url', u.avatar_url
          ) as creator
         FROM expenses e
         LEFT JOIN users u ON e.created_by = u.id
         INNER JOIN expense_shares es ON e.id = es.expense_id
         WHERE e.house_id = $1
           AND es.user_id = $2
           AND es.is_paid = false
         ORDER BY e.due_date ASC NULLS LAST, e.created_at DESC`,
        [houseId, userId],
      );

      const expenses = result.rows;

      if (expenses.length > 0) {
        const expenseIds = expenses.map((e) => e.id);
        const sharesResult = await this.pool.query<
          ExpenseShare & { expense_id: string }
        >(
          `SELECT es.*,
            json_build_object(
              'id', u.id,
              'email', u.email,
              'first_name', u.first_name,
              'last_name', u.last_name,
              'avatar_url', u.avatar_url
            ) as users
           FROM expense_shares es
           LEFT JOIN users u ON es.user_id = u.id
           WHERE es.expense_id = ANY($1)`,
          [expenseIds],
        );

        const sharesByExpense = new Map<string, ExpenseShare[]>();
        sharesResult.rows.forEach((share) => {
          const expenseShares = sharesByExpense.get(share.expense_id) || [];
          expenseShares.push(share);
          sharesByExpense.set(share.expense_id, expenseShares);
        });

        expenses.forEach((expense) => {
          const shares = sharesByExpense.get(expense.id) || [];
          expense.expense_shares = shares.map(normalizeExpenseShare);
          expense.shares = shares.map(normalizeExpenseShare);
        });
      }

      return expenses.map(normalizeExpense);
    });
  }

  async getHouseIdsWithExpensesBetween(
    from: string,
    to: string,
  ): Promise<RepositoryResponse<string[]>> {
    return repoQuery(async () => {
      const result = await this.pool.query<{ house_id: string }>(
        `SELECT DISTINCT house_id FROM expenses WHERE created_at >= $1 AND created_at <= $2`,
        [from, to],
      );
      return result.rows.map((r) => r.house_id);
    });
  }

  async isCreator(expenseId: string, userId: string): Promise<boolean> {
    const result = await repoQuery(async () => {
      const r = await this.pool.query<{ exists: boolean }>(
        `SELECT EXISTS(
          SELECT 1 FROM expenses e
          JOIN house_members hm
            ON hm.house_id = e.house_id AND hm.user_id = e.created_by AND hm.left_at IS NULL
          WHERE e.id = $1 AND e.created_by = $2
        )`,
        [expenseId, userId],
      );
      return r.rows[0]?.exists ?? false;
    });
    return result.data ?? false;
  }
}
