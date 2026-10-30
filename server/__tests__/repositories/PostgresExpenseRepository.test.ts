import { describe, it, expect, vi } from 'vitest';
import type { Pool } from 'pg';
import { PostgresExpenseRepository } from '../../repositories/postgres/PostgresExpenseRepository';

const createData = {
  house_id: 'h-1',
  created_by: 'u-1',
  description: 'Groceries',
  total_amount: 60,
  currency: 'EUR',
  due_date: null,
  recurring: false,
  recurring_period: null,
  user_ids: ['u-1', 'u-2'],
};

/**
 * Mocks the transaction client. `members` is what `house_members` returns for
 * the active-membership check — the security gate under test.
 */
const makeRepo = (members: string[]) => {
  const clientQuery = vi.fn(async (sql: string) => {
    if (sql.startsWith('SELECT user_id FROM house_members')) {
      return { rows: members.map((user_id) => ({ user_id })) };
    }
    if (sql.includes('INSERT INTO expenses')) {
      return {
        rows: [{ id: 'e-1', created_at: '2026-01-01T00:00:00.000Z' }],
      };
    }
    return { rows: [] };
  });
  const client = { query: clientQuery, release: vi.fn() };
  const poolQuery = vi
    .fn()
    .mockResolvedValue({ rows: [{ id: 'e-1', total_amount: '60' }] });
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: poolQuery,
  } as unknown as Pool;
  return { repo: new PostgresExpenseRepository(pool), clientQuery, client };
};

const sharesInsert = (clientQuery: ReturnType<typeof vi.fn>) =>
  clientQuery.mock.calls.find(([sql]: [string]) =>
    sql.includes('INSERT INTO expense_shares'),
  );

describe('PostgresExpenseRepository.create — house membership scoping', () => {
  it('creates shares when every user_id is an active house member', async () => {
    const { repo, clientQuery } = makeRepo(['u-1', 'u-2']);

    const result = await repo.create(createData);

    expect(result.error).toBeNull();
    const insert = sharesInsert(clientQuery);
    expect(insert).toBeDefined();
    // expense_id + 2 user_ids + 2 share amounts, all parameterized
    expect(insert![1]).toEqual(['e-1', 'u-1', 'u-2', 30, 30]);
    expect(clientQuery).toHaveBeenCalledWith('COMMIT');
  });

  it('rejects and rolls back when a user_id is not a member of the house', async () => {
    const { repo, clientQuery } = makeRepo(['u-1']);

    const result = await repo.create(createData);

    expect(result.data).toBeNull();
    expect(result.error).toContain('u-2');
    expect(sharesInsert(clientQuery)).toBeUndefined();
    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(clientQuery).not.toHaveBeenCalledWith('COMMIT');
  });

  it('rejects a departed member (left_at set, so absent from the roster query)', async () => {
    const { repo, clientQuery } = makeRepo(['u-1']);

    const result = await repo.create({
      ...createData,
      user_ids: ['u-1', 'u-3'],
    });

    expect(result.error).toContain('u-3');
    expect(sharesInsert(clientQuery)).toBeUndefined();
    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
  });

  it('scopes the membership check to the expense house and active members only', async () => {
    const { repo, clientQuery } = makeRepo(['u-1', 'u-2']);

    await repo.create(createData);

    const check = clientQuery.mock.calls.find(([sql]: [string]) =>
      sql.startsWith('SELECT user_id FROM house_members'),
    );
    expect(check![0]).toContain('house_id = $1');
    expect(check![0]).toContain('left_at IS NULL');
    expect(check![1]).toEqual(['h-1', ['u-1', 'u-2']]);
  });
});

describe('PostgresExpenseRepository.update — categories', () => {
  it('writes categories as a parameterised array', async () => {
    const poolQuery = vi.fn().mockResolvedValue({ rows: [{ id: 'e-1' }] });
    const repo = new PostgresExpenseRepository({
      query: poolQuery,
    } as unknown as Pool);

    await repo.update('e-1', { categories: ['rent', 'utilities'] });

    const [sql, values] = poolQuery.mock.calls[0]!;
    expect(sql).toContain('categories = $1');
    expect(values).toEqual([['rent', 'utilities'], 'e-1']);
  });
});

describe('PostgresExpenseRepository.create — categories', () => {
  const insertParams = (clientQuery: ReturnType<typeof vi.fn>) =>
    clientQuery.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO expenses'),
    )![1];

  it('writes the categories column, empty when omitted', async () => {
    const a = makeRepo(['u-1', 'u-2']);
    await a.repo.create({ ...createData, categories: ['utilities'] });
    expect(insertParams(a.clientQuery).at(-1)).toEqual(['utilities']);

    const b = makeRepo(['u-1', 'u-2']);
    await b.repo.create(createData);
    expect(insertParams(b.clientQuery).at(-1)).toEqual([]);
  });
});
