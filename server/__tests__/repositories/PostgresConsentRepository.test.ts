import { describe, it, expect, vi } from 'vitest';
import type { Pool } from 'pg';
import { PostgresConsentRepository } from '../../repositories/postgres/PostgresConsentRepository';

const consent = { id: 'c-1', user_id: 'u-1', purpose: 'profile_sharing' };

describe('PostgresConsentRepository', () => {
  it('grant inserts with ON CONFLICT DO NOTHING and returns the active row (idempotent)', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [consent] });
    const repo = new PostgresConsentRepository({ query } as unknown as Pool);

    const result = await repo.grant('u-1', 'profile_sharing', 2);

    expect(query.mock.calls[0]![0]).toContain('ON CONFLICT');
    expect(query.mock.calls[0]![1]).toEqual(['u-1', 'profile_sharing', 2]);
    expect(result).toEqual({ data: consent, error: null });
  });

  it('listActive returns only active rows', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [consent] });
    const repo = new PostgresConsentRepository({ query } as unknown as Pool);

    const result = await repo.listActive('u-1');

    expect(query.mock.calls[0]![0]).toContain('withdrawn_at IS NULL');
    expect(result.data).toEqual([consent]);
  });

  const makeTx = (failOn?: string) => {
    const query = vi.fn(async (sql: string) => {
      if (failOn && sql.includes(failOn)) throw new Error('boom');
      return { rows: [] };
    });
    const client = { query, release: vi.fn() };
    const pool = {
      connect: vi.fn().mockResolvedValue(client),
    } as unknown as Pool;
    return { repo: new PostgresConsentRepository(pool), query, client };
  };
  const sqls = (q: ReturnType<typeof vi.fn>) =>
    q.mock.calls.map(([s]: unknown[]) => s as string);

  it('withdraw(profile_sharing) marks withdrawn and clears profile columns in one transaction', async () => {
    const { repo, query, client } = makeTx();

    const result = await repo.withdraw('u-1', 'profile_sharing');

    const all = sqls(query);
    expect(all[0]).toBe('BEGIN');
    expect(all[1]).toContain('UPDATE user_consents SET withdrawn_at');
    expect(all[2]).toMatch(
      /UPDATE users SET .*bio = NULL.*profile_pictures = NULL/,
    );
    expect(all[2]).not.toMatch(/birthplace|nationality|birthdate|is_smoker/);
    expect(all[3]).toBe('COMMIT');
    expect(client.release).toHaveBeenCalled();
    expect(result.error).toBeNull();
  });

  it('withdraw(withdrawal_waiver) does not touch users', async () => {
    const { repo, query } = makeTx();
    await repo.withdraw('u-1', 'withdrawal_waiver');
    expect(sqls(query).some((s) => s.includes('UPDATE users'))).toBe(false);
  });

  it('withdraw rolls back when clearing fields fails', async () => {
    const { repo, query, client } = makeTx('UPDATE users');

    const result = await repo.withdraw('u-1', 'profile_sharing');

    expect(sqls(query)).toContain('ROLLBACK');
    expect(sqls(query)).not.toContain('COMMIT');
    expect(client.release).toHaveBeenCalled();
    expect(result.error).toBe('boom');
  });

  it('recordWaiver withdraws the active waiver then inserts a fresh one in one transaction', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const client = { query, release: vi.fn() };
    const repo = new PostgresConsentRepository({
      connect: vi.fn().mockResolvedValue(client),
    } as unknown as Pool);

    const result = await repo.recordWaiver('u-1', 2);

    const all = query.mock.calls.map(([s]) => s as string);
    expect(all[0]).toBe('BEGIN');
    expect(all[1]).toContain('SET withdrawn_at = NOW()');
    expect(all[2]).toContain('INSERT INTO user_consents');
    expect(all[3]).toBe('COMMIT');
    expect(query.mock.calls[2]![1]).toEqual(['u-1', 2]);
    expect(result.error).toBeNull();
  });

  it('listActive returns a safe error when the query fails', async () => {
    const repo = new PostgresConsentRepository({
      query: vi.fn().mockRejectedValue(new Error('boom')),
    } as unknown as Pool);
    expect(await repo.listActive('u-1')).toEqual({ data: null, error: 'boom' });
  });

  it('grant returns a safe error when the insert fails', async () => {
    const repo = new PostgresConsentRepository({
      query: vi.fn().mockRejectedValue(new Error('boom')),
    } as unknown as Pool);
    expect(await repo.grant('u-1', 'profile_sharing', 1)).toEqual({
      data: null,
      error: 'boom',
    });
  });

  it('grant returns null data when no active row can be read back', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repo = new PostgresConsentRepository({ query } as unknown as Pool);
    expect(await repo.grant('u-1', 'profile_sharing', 1)).toEqual({
      data: null,
      error: null,
    });
  });

  it('recordWaiver rolls back and releases when the insert fails', async () => {
    const { repo, query, client } = makeTx('INSERT INTO user_consents');
    const result = await repo.recordWaiver('u-1', 2);
    expect(sqls(query)).toContain('ROLLBACK');
    expect(sqls(query)).not.toContain('COMMIT');
    expect(client.release).toHaveBeenCalled();
    expect(result.error).toBe('boom');
  });

  it('withdraw reports an error and does not release a client it never got', async () => {
    const repo = new PostgresConsentRepository({
      connect: vi.fn().mockRejectedValue(new Error('no conn')),
    } as unknown as Pool);
    expect(await repo.withdraw('u-1', 'profile_sharing')).toEqual({
      data: null,
      error: 'no conn',
    });
  });

  it('withdraw still reports the original error if ROLLBACK itself fails', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql === 'ROLLBACK') throw new Error('rb');
      if (sql.includes('UPDATE user_consents')) throw new Error('boom');
      return { rows: [] };
    });
    const repo = new PostgresConsentRepository({
      connect: vi.fn().mockResolvedValue({ query, release: vi.fn() }),
    } as unknown as Pool);
    expect((await repo.withdraw('u-1', 'withdrawal_waiver')).error).toBe(
      'boom',
    );
  });
});
