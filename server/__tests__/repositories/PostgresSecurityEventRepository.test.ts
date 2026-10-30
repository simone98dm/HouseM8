import { describe, it, expect, vi } from 'vitest';
import type { Pool } from 'pg';
import { PostgresSecurityEventRepository } from '../../repositories/postgres/PostgresSecurityEventRepository';

const make = (result: unknown) => {
  const query = vi.fn().mockResolvedValue(result);
  return {
    query,
    repo: new PostgresSecurityEventRepository({ query } as unknown as Pool),
  };
};

describe('PostgresSecurityEventRepository', () => {
  it('record inserts with parameters', async () => {
    const { query, repo } = make({ rows: [] });
    const res = await repo.record('signup', 'u1', 'h');
    expect(res).toEqual({ data: null, error: null });
    expect(query.mock.calls[0]![1]).toEqual(['u1', 'signup', 'h', null]);
  });

  it('record stores metadata as JSON', async () => {
    const { query, repo } = make({ rows: [] });
    await repo.record('role_changed', 'u1', 'h', { target_user_id: 't' });
    expect(query.mock.calls[0]![1]).toEqual([
      'u1',
      'role_changed',
      'h',
      '{"target_user_id":"t"}',
    ]);
  });

  it('record returns an error instead of throwing', async () => {
    const query = vi.fn().mockRejectedValue(new Error('boom'));
    const repo = new PostgresSecurityEventRepository({
      query,
    } as unknown as Pool);
    expect(await repo.record('signup', null, null)).toEqual({
      data: null,
      error: 'boom',
    });
  });

  it('listByUser returns rows scoped to the user', async () => {
    const { query, repo } = make({ rows: [{ id: 'e1' }] });
    const res = await repo.listByUser('u1');
    expect(res.data).toEqual([{ id: 'e1' }]);
    expect(query.mock.calls[0]![1]).toEqual(['u1']);
  });

  it('purgeOlderThan returns the deleted count', async () => {
    const { query, repo } = make({ rowCount: 4 });
    const d = new Date('2025-01-01T00:00:00Z');
    expect((await repo.purgeOlderThan(d)).data).toBe(4);
    expect(query.mock.calls[0]![1]).toEqual([d.toISOString()]);
  });
});
