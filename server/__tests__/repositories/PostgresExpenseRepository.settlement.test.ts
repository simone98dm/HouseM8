import { describe, it, expect, vi } from 'vitest';
import type { Pool } from 'pg';
import { PostgresExpenseRepository } from '../../repositories/postgres/PostgresExpenseRepository';

type Handler = (sql: string, params?: unknown[]) => unknown;

const makeRepo = (handler: Handler) => {
  const clientQuery = vi.fn(async (sql: string, params?: unknown[]) => {
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return { rows: [] };
    return handler(sql, params) ?? { rows: [], rowCount: 0 };
  });
  const client = { query: clientQuery, release: vi.fn() };
  const poolQuery = vi.fn();
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: poolQuery,
  } as unknown as Pool;
  return {
    repo: new PostgresExpenseRepository(pool),
    clientQuery,
    client,
    poolQuery,
  };
};

const sqlsOf = (q: ReturnType<typeof vi.fn>) =>
  q.mock.calls.map(([sql]) => String(sql));

/**
 * Answers the ledger reads behind the settle-up plan: u-b paid two expenses,
 * u-a owes 10.10 + 5.20 = 15.30 minus the live payments in `payments`.
 */
const ledgerRows = (payments: { amount: string }[]) => (sql: string) => {
  if (sql.includes('FROM expenses e'))
    return {
      rows: [
        ['e-1', '20.20', '10.10'],
        ['e-2', '10.40', '5.20'],
      ].flatMap(([id, total, due]) => [
        {
          expense_id: id,
          created_by: 'u-b',
          total_amount: total,
          share_user_id: 'u-a',
          amount_due: due,
          is_paid: false,
          due_date: null,
        },
        {
          expense_id: id,
          created_by: 'u-b',
          total_amount: total,
          share_user_id: 'u-b',
          amount_due: due,
          is_paid: false,
          due_date: null,
        },
      ]),
    };
  if (sql.includes('FROM settlements') && sql.includes('undone_at IS NULL'))
    return {
      rows: payments.map((p) => ({
        from_user_id: 'u-a',
        to_user_id: 'u-b',
        amount: p.amount,
      })),
    };
  if (sql.includes('FROM house_members'))
    return { rows: [{ user_id: 'u-a' }, { user_id: 'u-b' }] };
  if (sql.includes('FROM users')) return { rows: [] };
};

describe('PostgresExpenseRepository.recordSettlement', () => {
  // oldest first, as the ORDER BY returns them
  const candidates = {
    rows: [
      { id: 's-1', amount_due: '10.10' },
      { id: 's-2', amount_due: '5.20' },
      { id: 's-3', amount_due: '7.00' },
    ],
  };
  // `paid` = already-recorded payments, which shrink the plan (15.30 - paid)
  const handlerFor =
    (paid: string[] = []) =>
    (sql: string) => {
      if (sql.includes('INSERT INTO settlements'))
        return { rows: [{ id: 'set-1' }] };
      if (sql.includes('FOR UPDATE')) return candidates;
      return ledgerRows(paid.map((amount) => ({ amount })))(sql);
    };
  const handler = handlerFor();

  it('inserts the payment and allocates whole shares FIFO, in one transaction', async () => {
    const { repo, clientQuery, client } = makeRepo(handler);

    const result = await repo.recordSettlement('h-1', 'u-a', 'u-b', 'u-a');

    expect(result.data).toEqual({
      settlementId: 'set-1',
      allocatedCount: 2,
      amount: 15.3,
    });
    const sqls = sqlsOf(clientQuery);
    expect(sqls[0]).toBe('BEGIN');
    expect(sqls.at(-1)).toBe('COMMIT');
    const insert = clientQuery.mock.calls.find(([s]) =>
      String(s).includes('INSERT INTO settlements'),
    )!;
    expect(String(insert[0])).toContain("'settlement'");
    expect(insert[1]).toEqual(['h-1', 'u-a', 'u-b', 15.3, 'u-a']);
    const update = clientQuery.mock.calls.find(([s]) =>
      String(s).includes('UPDATE expense_shares'),
    )!;
    expect(update[1]).toEqual([['s-1', 's-2'], 'set-1']);
    expect(client.release).toHaveBeenCalled();
  });

  it('leaves a partial remainder unallocated and stops at the first share that does not fit', async () => {
    const { repo, clientQuery } = makeRepo(handlerFor(['3.30']));
    const result = await repo.recordSettlement('h-1', 'u-a', 'u-b', 'u-a');
    expect(result.data?.amount).toBe(12);
    expect(result.data?.allocatedCount).toBe(1);
    const update = clientQuery.mock.calls.find(([s]) =>
      String(s).includes('UPDATE expense_shares'),
    )!;
    expect(update[1]).toEqual([['s-1'], 'set-1']);
  });

  it('allocates nothing (but still records the payment) when no share fits', async () => {
    const { repo, clientQuery } = makeRepo(handlerFor(['12.30']));
    const result = await repo.recordSettlement('h-1', 'u-a', 'u-b', 'u-a');
    expect(result.data).toEqual({
      settlementId: 'set-1',
      allocatedCount: 0,
      amount: 3,
    });
    expect(sqlsOf(clientQuery).join('\n')).not.toContain(
      'UPDATE expense_shares',
    );
  });

  it('scopes the candidate shares to the house, debtor and creditor, unpaid, oldest first', async () => {
    const { repo, clientQuery } = makeRepo(handler);
    await repo.recordSettlement('h-1', 'u-a', 'u-b', 'u-a');
    const select = clientQuery.mock.calls.find(([s]) =>
      String(s).includes('FOR UPDATE'),
    )!;
    const sql = String(select[0]);
    expect(sql).toContain('e.house_id = $1');
    expect(sql).toContain('es.is_paid = false');
    expect(sql).toContain('ORDER BY COALESCE(e.due_date');
    expect(select[1]).toEqual(['h-1', 'u-a', 'u-b']);
  });

  it('rolls back when allocating fails', async () => {
    const { repo, clientQuery, client } = makeRepo((sql) => {
      if (sql.includes('UPDATE expense_shares')) throw new Error('boom');
      return handler(sql);
    });

    const result = await repo.recordSettlement('h-1', 'u-a', 'u-b', 'u-a');

    expect(result.error).toBe('boom');
    expect(sqlsOf(clientQuery)).toContain('ROLLBACK');
    expect(sqlsOf(clientQuery)).not.toContain('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });
});

describe('PostgresExpenseRepository.recordSettlement atomicity', () => {
  it('takes the house lock first, before reading the plan', async () => {
    const { repo, clientQuery } = makeRepo((sql) => {
      if (sql.includes('INSERT INTO settlements'))
        return { rows: [{ id: 'set-1' }] };
      return ledgerRows([])(sql);
    });
    await repo.recordSettlement('h-1', 'u-a', 'u-b', 'u-a');
    const sqls = sqlsOf(clientQuery);
    expect(sqls[0]).toBe('BEGIN');
    expect(sqls[1]).toContain('pg_advisory_xact_lock');
    expect(clientQuery.mock.calls[1]![1]).toEqual(['h-1']);
    expect(sqls[2]).toContain('FROM expenses e');
  });

  it('answers NOT_IN_PLAN and writes nothing when the pair owes nothing', async () => {
    const { repo, clientQuery } = makeRepo(ledgerRows([]));
    const result = await repo.recordSettlement('h-1', 'u-b', 'u-a', 'u-b');
    expect(result.error).toBe('NOT_IN_PLAN');
    expect(sqlsOf(clientQuery)).toContain('ROLLBACK');
    expect(sqlsOf(clientQuery).join('\n')).not.toContain('INSERT INTO');
  });

  it('two concurrent requests for the same pair record exactly one payment', async () => {
    // Fake database: a transaction-scoped advisory lock (mutex) and a payments
    // table that INSERT appends to, visible to later ledger reads once committed.
    const payments: { amount: string }[] = [];
    let holder: symbol | null = null;
    const waiters: (() => void)[] = [];
    const release = (me: symbol) => {
      if (holder !== me) return;
      holder = null;
      waiters.shift()?.();
    };
    const connect = async () => {
      const me = Symbol('tx');
      let pending: { amount: string } | null = null;
      return {
        release: vi.fn(),
        query: async (sql: string, params?: unknown[]) => {
          if (sql === 'COMMIT') {
            if (pending) payments.push(pending);
            release(me);
            return { rows: [] };
          }
          if (sql === 'ROLLBACK') {
            release(me);
            return { rows: [] };
          }
          if (sql === 'BEGIN') return { rows: [] };
          if (sql.includes('pg_advisory_xact_lock')) {
            while (holder && holder !== me)
              await new Promise<void>((r) => waiters.push(r));
            holder = me;
            return { rows: [] };
          }
          // yield so an unlocked implementation would interleave here
          await new Promise((r) => setImmediate(r));
          if (sql.includes('INSERT INTO settlements')) {
            pending = { amount: String(params![3]) };
            return { rows: [{ id: 'set-1' }] };
          }
          if (sql.includes('FOR UPDATE')) return { rows: [] };
          return ledgerRows(payments)(sql) ?? { rows: [], rowCount: 0 };
        },
      };
    };
    const repo = new PostgresExpenseRepository({
      connect,
      query: vi.fn(),
    } as unknown as Pool);

    const [first, second] = await Promise.all([
      repo.recordSettlement('h-1', 'u-a', 'u-b', 'u-a'),
      repo.recordSettlement('h-1', 'u-a', 'u-b', 'u-b'),
    ]);

    const results = [first, second];
    expect(results.filter((r) => r.data).length).toBe(1);
    expect(results.filter((r) => r.error === 'NOT_IN_PLAN').length).toBe(1);
    expect(payments).toEqual([{ amount: '15.3' }]);
  });

  it('undo, delete and share pay/unpay take the same house lock', async () => {
    const lockCalls = (q: ReturnType<typeof vi.fn>) =>
      sqlsOf(q).filter((q) => q.includes('pg_advisory_xact_lock'));

    const undo = makeRepo((sql) =>
      sql.includes('UPDATE settlements')
        ? { rows: [], rowCount: 1 }
        : undefined,
    );
    await undo.repo.undoSettlement('h-1', 'set-1');
    expect(lockCalls(undo.clientQuery)).toHaveLength(1);

    const del = makeRepo(() => undefined);
    await del.repo.delete('e-1');
    expect(lockCalls(del.clientQuery)).toHaveLength(1);
    expect(sqlsOf(del.clientQuery).at(-1)).toBe('COMMIT');

    const pay = makeRepo((sql) => {
      if (sql.includes('pg_advisory_xact_lock')) return { rows: [{}] };
      if (sql.includes('FOR UPDATE'))
        return {
          rows: [
            {
              house_id: 'h-1',
              created_by: 'u-b',
              user_id: 'u-a',
              amount_due: '10.00',
              is_paid: false,
              settlement_id: null,
            },
          ],
        };
      if (sql.includes('UPDATE expense_shares'))
        return { rows: [{ id: 's-1' }] };
    });
    await pay.repo.updateShare('s-1', { is_paid: true });
    const sqls = sqlsOf(pay.clientQuery);
    expect(lockCalls(pay.clientQuery)).toHaveLength(1);
    // lock strictly before the row lock: one global order, no deadlock
    expect(
      sqls.findIndex((q) => q.includes('pg_advisory_xact_lock')),
    ).toBeLessThan(sqls.findIndex((q) => q.includes('FOR UPDATE')));
  });
});

describe('PostgresExpenseRepository share payments', () => {
  const share = (over: Record<string, unknown> = {}) => ({
    rows: [
      {
        house_id: 'h-1',
        created_by: 'u-b',
        user_id: 'u-a',
        amount_due: '10.00',
        is_paid: false,
        settlement_id: null,
        ...over,
      },
    ],
  });

  it('mark paid sets the flag and inserts a share payment in one transaction', async () => {
    const { repo, clientQuery } = makeRepo((sql) => {
      if (sql.includes('pg_advisory_xact_lock')) return { rows: [{}] };
      if (sql.includes('FOR UPDATE')) return share();
      if (sql.includes('UPDATE expense_shares'))
        return { rows: [{ id: 's-1', is_paid: true, amount_due: '10.00' }] };
    });

    const result = await repo.updateShare('s-1', { is_paid: true });

    expect(result.error).toBeNull();
    const insert = clientQuery.mock.calls.find(([s]) =>
      String(s).includes('INSERT INTO settlements'),
    )!;
    expect(insert[1]).toEqual(['h-1', 'u-a', 'u-b', '10.00', 's-1']);
    expect(sqlsOf(clientQuery).at(-1)).toBe('COMMIT');
  });

  it('mark unpaid undoes the share payment', async () => {
    const { repo, clientQuery } = makeRepo((sql) => {
      if (sql.includes('pg_advisory_xact_lock')) return { rows: [{}] };
      if (sql.includes('FOR UPDATE')) return share({ is_paid: true });
      if (sql.includes('UPDATE expense_shares'))
        return { rows: [{ id: 's-1', is_paid: false, amount_due: '10.00' }] };
    });

    const result = await repo.updateShare('s-1', {
      is_paid: false,
      paid_at: null,
    });

    expect(result.error).toBeNull();
    const undo = clientQuery.mock.calls.find(([s]) =>
      String(s).includes('UPDATE settlements'),
    )!;
    expect(String(undo[0])).toContain("kind = 'share'");
    expect(String(undo[0])).toContain('undone_at = NOW()');
  });

  it('refuses to unpay a share paid by a settlement', async () => {
    const { repo, clientQuery } = makeRepo((sql) => {
      if (sql.includes('pg_advisory_xact_lock')) return { rows: [{}] };
      if (sql.includes('FOR UPDATE'))
        return share({ is_paid: true, settlement_id: 'set-1' });
    });

    const result = await repo.updateShare('s-1', { is_paid: false });

    expect(result.error).toBe('SHARE_PAID_BY_SETTLEMENT');
    expect(sqlsOf(clientQuery)).toContain('ROLLBACK');
    expect(sqlsOf(clientQuery).join('\n')).not.toContain('UPDATE settlements');
  });

  it('creator paying their own share records no payment', async () => {
    const { repo, clientQuery } = makeRepo((sql) => {
      if (sql.includes('pg_advisory_xact_lock')) return { rows: [{}] };
      if (sql.includes('FOR UPDATE')) return share({ user_id: 'u-b' });
      if (sql.includes('UPDATE expense_shares'))
        return { rows: [{ id: 's-1' }] };
    });
    await repo.updateShare('s-1', { is_paid: true });
    expect(sqlsOf(clientQuery).join('\n')).not.toContain('INSERT INTO');
  });

  it('markSharesAsPaid flags unpaid shares and records payments in one statement', async () => {
    const { repo, poolQuery } = makeRepo(() => undefined);
    poolQuery.mockResolvedValue({ rows: [] });
    await repo.markSharesAsPaid(['s-1']);
    expect(poolQuery).toHaveBeenCalledTimes(1);
    const sql = String(poolQuery.mock.calls[0]![0]);
    expect(sql).toContain('is_paid = false');
    expect(sql).toContain('INSERT INTO settlements');
  });
});

describe('PostgresExpenseRepository.listSettlements', () => {
  it('scopes to the house and limits', async () => {
    const { repo, poolQuery } = makeRepo(() => undefined);
    poolQuery.mockResolvedValue({ rows: [{ id: 'x' }] });
    const result = await repo.listSettlements('h-1', 20);
    expect(result.data).toEqual([{ id: 'x' }]);
    expect(poolQuery.mock.calls[0]![1]).toEqual(['h-1', 20]);
    expect(String(poolQuery.mock.calls[0]![0])).toContain('s.house_id = $1');
  });
});

describe('PostgresExpenseRepository.undoSettlement', () => {
  it('unpays only still-paid tagged shares and stamps undone_at atomically', async () => {
    const { repo, clientQuery } = makeRepo((sql) => {
      if (sql.includes('UPDATE settlements')) return { rows: [], rowCount: 1 };
      if (sql.includes('UPDATE expense_shares'))
        return { rows: [], rowCount: 3 };
    });

    const result = await repo.undoSettlement('h-1', 'set-1');

    expect(result).toEqual({ data: { count: 3 }, error: null });
    const stamp = clientQuery.mock.calls.find(([s]) =>
      String(s).includes('UPDATE settlements'),
    )!;
    expect(String(stamp[0])).toContain('undone_at IS NULL');
    expect(String(stamp[0])).toContain('house_id = $2');
    expect(stamp[1]).toEqual(['set-1', 'h-1']);
    const revert = clientQuery.mock.calls.find(([s]) =>
      String(s).includes('UPDATE expense_shares'),
    )!;
    expect(String(revert[0])).toContain(
      'is_paid = false, paid_at = NULL, settlement_id = NULL',
    );
    expect(String(revert[0])).toContain('is_paid = true');
    expect(revert[1]).toEqual(['set-1']);
    expect(sqlsOf(clientQuery).at(-1)).toBe('COMMIT');
  });

  it('refuses a settlement that is already undone, without touching shares', async () => {
    const { repo, clientQuery } = makeRepo((sql) => {
      if (sql.includes('UPDATE settlements')) return { rows: [], rowCount: 0 };
      if (sql.startsWith('SELECT 1')) return { rows: [{}] };
    });

    const result = await repo.undoSettlement('h-1', 'set-1');

    expect(result.error).toBe('ALREADY_UNDONE');
    expect(sqlsOf(clientQuery).join('\n')).not.toContain(
      'UPDATE expense_shares',
    );
    expect(sqlsOf(clientQuery)).toContain('ROLLBACK');
  });

  it('reports a settlement from another house as not found', async () => {
    const { repo } = makeRepo((sql) => {
      if (sql.includes('UPDATE settlements')) return { rows: [], rowCount: 0 };
      if (sql.startsWith('SELECT 1')) return { rows: [] };
    });

    expect((await repo.undoSettlement('h-2', 'set-1')).error).toBe(
      'SETTLEMENT_NOT_FOUND',
    );
  });

  it('rolls back the stamp when reverting the shares fails', async () => {
    const { repo, clientQuery } = makeRepo((sql) => {
      if (sql.includes('UPDATE settlements')) return { rows: [], rowCount: 1 };
      if (sql.includes('UPDATE expense_shares')) throw new Error('boom');
    });

    const result = await repo.undoSettlement('h-1', 'set-1');

    expect(result.error).toBe('boom');
    expect(sqlsOf(clientQuery)).toContain('ROLLBACK');
    expect(sqlsOf(clientQuery)).not.toContain('COMMIT');
  });
});

describe('PostgresExpenseRepository.getSettlement', () => {
  it('looks the settlement up scoped to the house', async () => {
    const row = { id: 'set-1', house_id: 'h-1' };
    const { repo, poolQuery } = makeRepo(() => undefined);
    poolQuery.mockResolvedValue({ rows: [row] });

    const result = await repo.getSettlement('h-1', 'set-1');

    expect(result.data).toEqual(row);
    expect(poolQuery.mock.calls[0]![1]).toEqual(['set-1', 'h-1']);
    expect(String(poolQuery.mock.calls[0]![0])).toContain('house_id = $2');
  });

  it('returns null data when there is no such settlement', async () => {
    const { repo, poolQuery } = makeRepo(() => undefined);
    poolQuery.mockResolvedValue({ rows: [] });
    expect((await repo.getSettlement('h-1', 'x')).data).toBeNull();
  });
});
