import { describe, it, expect, vi } from 'vitest';
import type { Pool } from 'pg';
import { PostgresGdprRepository } from '../../repositories/postgres/PostgresGdprRepository';

const TOKEN = '11111111-1111-4111-8111-111111111111';
const PAST = new Date(Date.now() - 86_400_000).toISOString();
const FUTURE = new Date(Date.now() + 86_400_000).toISOString();

const txRepo = (handler: (sql: string) => unknown) => {
  const query = vi.fn(async (sql: string) => handler(sql) ?? { rows: [] });
  const client = { query, release: vi.fn() };
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: vi.fn(),
  } as unknown as Pool;
  return { repo: new PostgresGdprRepository(pool), query, client };
};
const sqls = (q: ReturnType<typeof vi.fn>) =>
  q.mock.calls.map(([s]) => String(s));

describe('PostgresGdprRepository transactional failure paths', () => {
  it('softDeleteUser rolls back, releases and rethrows when a statement fails', async () => {
    const { repo, query, client } = txRepo((s) => {
      if (s.includes('INSERT INTO gdpr_requests')) throw new Error('boom');
    });
    await expect(repo.softDeleteUser('u1')).rejects.toThrow('boom');
    expect(sqls(query)).toContain('ROLLBACK');
    expect(sqls(query)).not.toContain('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('softDeleteUser records archived house ids and the stripe flag', async () => {
    const { repo, query } = txRepo((s) => {
      if (s.includes("SET status = 'archived'"))
        return { rows: [{ id: 'h1' }, { id: 'h2' }] };
      if (s.includes('INSERT INTO gdpr_requests'))
        return { rows: [{ id: 'req-1' }] };
    });
    const res = await repo.softDeleteUser('u1', true);
    expect(res.cancelToken).toBe('req-1');
    const insert = query.mock.calls.find(([s]) =>
      String(s).includes('INSERT INTO gdpr_requests'),
    )!;
    const params = (insert as unknown[])[1] as unknown[];
    expect(params[2]).toEqual(['h1', 'h2']);
    expect(params[3]).toBe(true);
    // ~30 day grace window
    const days = (res.scheduledFor.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThanOrEqual(30);
  });

  it('cancelDeletion returns null and rolls back on a database error', async () => {
    const { repo, query, client } = txRepo((s) => {
      if (s.includes('UPDATE users SET deleted_at = NULL'))
        throw new Error('boom');
      if (s.includes('WHERE id = $1'))
        return { rows: [{ user_id: 'u1', scheduled_for: FUTURE }] };
    });
    expect(await repo.cancelDeletion(TOKEN, 'u1')).toBeNull();
    expect(sqls(query)).toContain('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  it('cancelDeletion without user id and with an unknown token yields null', async () => {
    const { repo } = txRepo(() => undefined);
    expect(await repo.cancelDeletion(TOKEN)).toBeNull();
  });

  it('cancelDeletion rejects an expired token without falling through to a restore', async () => {
    const { repo, query } = txRepo((s) => {
      if (s.includes('WHERE id = $1'))
        return { rows: [{ user_id: 'u1', scheduled_for: PAST }] };
    });
    expect(await repo.cancelDeletion(TOKEN, 'u1')).toBeNull();
    expect(sqls(query).some((s) => s.includes('deleted_at = NULL'))).toBe(
      false,
    );
  });

  it('cancelDeletion restores houses scoped to the owner and still-archived status', async () => {
    const { repo, query } = txRepo((s) => {
      if (s.includes('WHERE id = $1'))
        return {
          rows: [
            {
              user_id: 'u1',
              scheduled_for: FUTURE,
              archived_house_ids: ['h1', 'h9'],
              stripe_cancel_scheduled: true,
            },
          ],
        };
      if (s.includes("SET status = 'active'")) return { rows: [{ id: 'h1' }] };
    });
    const res = await repo.cancelDeletion(TOKEN, 'u1');
    expect(res).toEqual({
      restoredHouseIds: ['h1'],
      stripeCancelScheduled: true,
    });
    const restore = String(
      query.mock.calls.find(([s]) =>
        String(s).includes("SET status = 'active'"),
      )![0],
    );
    expect(restore).toContain('owner_id = $2');
    expect(restore).toContain("status = 'archived'");
  });
});

describe('PostgresGdprRepository non-transactional methods', () => {
  it('pseudonymizeUser returns true on success and false on failure', async () => {
    const ok = new PostgresGdprRepository({
      query: vi.fn().mockResolvedValue({}),
    } as unknown as Pool);
    expect(await ok.pseudonymizeUser('u1')).toBe(true);
    const bad = new PostgresGdprRepository({
      query: vi.fn().mockRejectedValue(new Error('x')),
    } as unknown as Pool);
    expect(await bad.pseudonymizeUser('u1')).toBe(false);
  });

  it('getPendingDeletions maps rows and returns [] on error', async () => {
    const ok = new PostgresGdprRepository({
      query: vi.fn().mockResolvedValue({
        rows: [{ id: 'u1', deleted_at: '2026-01-01T00:00:00.000Z' }],
      }),
    } as unknown as Pool);
    expect(await ok.getPendingDeletions()).toEqual([
      { userId: 'u1', deletedAt: new Date('2026-01-01T00:00:00.000Z') },
    ]);
    const bad = new PostgresGdprRepository({
      query: vi.fn().mockRejectedValue(new Error('x')),
    } as unknown as Pool);
    expect(await bad.getPendingDeletions()).toEqual([]);
  });

  it('runScheduledCleanup skips excluded users and omits failed pseudonymizations from the result', async () => {
    const repo = new PostgresGdprRepository({
      query: vi.fn().mockResolvedValue({ rowCount: undefined, rows: [] }),
    } as unknown as Pool);
    vi.spyOn(repo, 'getPendingDeletions').mockResolvedValue([
      { userId: 'keep', deletedAt: new Date() },
      { userId: 'fail', deletedAt: new Date() },
      { userId: 'ok', deletedAt: new Date() },
    ]);
    const spy = vi
      .spyOn(repo, 'pseudonymizeUser')
      .mockImplementation(async (id) => id === 'ok');
    const res = await repo.runScheduledCleanup({ excludeUserIds: ['keep'] });
    expect(spy).not.toHaveBeenCalledWith('keep');
    expect(res).toMatchObject({
      pseudonymized: 1,
      pseudonymizedUserIds: ['ok'],
      tokensCleared: 0,
      invitationsCleared: 0,
      resetTokensCleared: 0,
      gdprRequestsCleared: 0,
    });
  });
});
