import { describe, it, expect, vi } from 'vitest';
import type { Pool } from 'pg';
import { PostgresBalanceRepository } from '../../repositories/postgres/PostgresBalanceRepository';

interface Row {
  expense_id: string;
  created_by: string;
  total_amount: string;
  share_user_id: string;
  amount_due: string;
  is_paid: boolean;
  due_date: string | null;
}

/** One expense paid by `by`, split into one share per `debtors` entry. */
const expense = (
  id: string,
  by: string,
  total: number,
  debtors: Array<[string, number]>,
  due: string | null,
  isPaid = false,
): Row[] =>
  debtors.map(([userId, due_amount]) => ({
    expense_id: id,
    created_by: by,
    total_amount: String(total),
    share_user_id: userId,
    amount_due: String(due_amount),
    is_paid: isPaid,
    due_date: due,
  }));

const makeRepo = (
  rows: Row[],
  roster: string[],
  payments: Array<{
    from_user_id: string;
    to_user_id: string;
    amount: string;
  }> = [],
) => {
  const query = vi.fn(async (sql: string, _params?: unknown[]) => {
    if (sql.includes('FROM expenses e')) return { rows };
    if (sql.includes('FROM settlements')) return { rows: payments };
    if (sql.includes('FROM house_members'))
      return { rows: roster.map((user_id) => ({ user_id })) };
    return {
      rows: roster.map((id) => ({
        id,
        email: `${id}@x.it`,
        first_name: id,
        last_name: 'X',
        avatar_url: null,
      })),
    };
  });
  return {
    repo: new PostgresBalanceRepository({ query } as unknown as Pool),
    query,
  };
};

describe('PostgresBalanceRepository settle-up due_date', () => {
  it('reads the expense due date as a plain YYYY-MM-DD string', async () => {
    const { repo, query } = makeRepo([], ['a', 'b']);
    await repo.getHouseBalance('h-1');
    const sql = String(query.mock.calls[0]![0]);
    expect(sql).toContain("to_char(e.due_date, 'YYYY-MM-DD')");
  });

  it('uses the earliest due date among shares owed directly to the creditor', async () => {
    // a owes b 10 (due Nov 5) and 10 (due Nov 1); a also owes c something earlier.
    const rows = [
      ...expense('e1', 'b', 20, [['a', 10]], '2026-11-05'),
      ...expense('e2', 'b', 20, [['a', 10]], '2026-11-01'),
      ...expense('e3', 'c', 4, [['a', 2]], '2026-10-01'),
    ];
    const { repo } = makeRepo(rows, ['a', 'b', 'c']);

    const { data } = await repo.getAllUserToUserBalances('h-1');

    const toB = data!.find(
      (t) => t.from_user_id === 'a' && t.to_user_id === 'b',
    );
    expect(toB?.due_date).toBe('2026-11-01');
  });

  it('falls back to the debtor’s earliest due date when the plan nets across people', async () => {
    // a owes b 10 and b owes c 10 -> plan nets to a pays c 10, a has no share on c's expenses.
    const rows = [
      ...expense('e1', 'b', 20, [['a', 10]], '2026-11-07'),
      ...expense('e2', 'c', 20, [['b', 10]], '2026-10-01'),
    ];
    const { repo } = makeRepo(rows, ['a', 'b', 'c']);

    const { data } = await repo.getAllUserToUserBalances('h-1');

    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({ from_user_id: 'a', to_user_id: 'c' });
    expect(data![0]!.due_date).toBe('2026-11-07');
  });

  it('is null when no relevant expense has a due date', async () => {
    const rows = expense('e1', 'b', 20, [['a', 10]], null);
    const { repo } = makeRepo(rows, ['a', 'b']);

    const { data } = await repo.getAllUserToUserBalances('h-1');

    expect(data![0]!.due_date).toBeNull();
  });

  it('ignores due dates of already-paid shares', async () => {
    const rows = [
      ...expense('e1', 'b', 20, [['a', 10]], '2026-10-01', true),
      ...expense('e2', 'b', 20, [['a', 10]], '2026-12-01'),
    ];
    const { repo } = makeRepo(rows, ['a', 'b']);

    const { data } = await repo.getAllUserToUserBalances('h-1');

    expect(data![0]!.due_date).toBe('2026-12-01');
  });
});

describe('PostgresBalanceRepository payments', () => {
  it('reads only non-undone payments of the house', async () => {
    const { repo, query } = makeRepo([], ['a', 'b']);
    await repo.getHouseBalance('h-1');
    const call = query.mock.calls.find(([sql]) =>
      String(sql).includes('FROM settlements'),
    )!;
    expect(String(call[0])).toContain('undone_at IS NULL');
    expect(call[1]).toEqual(['h-1']);
  });

  it('a paid share is cancelled by its payment and a netted plan payment zeroes everyone', async () => {
    // luca -> marco 10 (paid, backfilled payment), anna -> luca 10 unpaid
    const rows = [
      ...expense('e1', 'luca', 10, [['anna', 10]], null),
      ...expense('e2', 'marco', 10, [['luca', 10]], null, true),
    ];
    const paid = [
      { from_user_id: 'luca', to_user_id: 'marco', amount: '10.00' },
    ];
    const { repo } = makeRepo(rows, ['anna', 'luca', 'marco'], paid);
    let plan = (await repo.getAllUserToUserBalances('h-1')).data!;
    expect(plan.map((t) => [t.from_user_id, t.to_user_id, t.amount])).toEqual([
      ['anna', 'luca', 10],
    ]);

    // anna pays luca; the plan is empty and nobody owes anything
    const { repo: after } = makeRepo(
      rows,
      ['anna', 'luca', 'marco'],
      [...paid, { from_user_id: 'anna', to_user_id: 'luca', amount: '10.00' }],
    );
    plan = (await after.getAllUserToUserBalances('h-1')).data!;
    expect(plan).toEqual([]);
    const balance = (await after.getHouseBalance('h-1')).data!;
    expect(balance.user_balances.every((b) => b.net_balance === 0)).toBe(true);
    expect(balance.user_balances.every((b) => b.total_owed === 0)).toBe(true);
  });

  it('counts a netted transfer as settled even though no single share matches', async () => {
    const rows = [
      ...expense('e1', 'luca', 10, [['anna', 10]], null),
      ...expense('e2', 'marco', 10, [['luca', 10]], null),
    ];
    const { repo } = makeRepo(rows, ['anna', 'luca', 'marco']);
    const plan = (await repo.getAllUserToUserBalances('h-1')).data!;
    expect(plan.map((t) => [t.from_user_id, t.to_user_id, t.amount])).toEqual([
      ['anna', 'marco', 10],
    ]);
    const { repo: after } = makeRepo(
      rows,
      ['anna', 'luca', 'marco'],
      [{ from_user_id: 'anna', to_user_id: 'marco', amount: '10.00' }],
    );
    expect((await after.getAllUserToUserBalances('h-1')).data).toEqual([]);
  });
});
