import { describe, it, expect, vi } from 'vitest';
import type { Pool } from 'pg';
import { PostgresGdprRepository } from '../../repositories/postgres/PostgresGdprRepository';

const PENDING_ROW = (userId: string, scheduledFor: string) => ({
  user_id: userId,
  scheduled_for: scheduledFor,
  status: 'pending',
});

const FUTURE = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

/**
 * Mocks the transaction client. `byTokenRows` is what the `WHERE id = $1`
 * lookup returns (the token path); `byUserRows` is what the `WHERE user_id
 * = $1` fallback returns.
 */
const makeRepo = (
  byTokenRows: Array<Record<string, unknown>>,
  byUserRows: Array<Record<string, unknown>> = [],
) => {
  const clientQuery = vi.fn(async (sql: string) => {
    if (sql.includes('FROM gdpr_requests') && sql.includes('WHERE id = $1')) {
      return { rows: byTokenRows };
    }
    if (sql.includes('WHERE user_id = $1') && sql.includes('SELECT id')) {
      return { rows: byUserRows };
    }
    return { rows: [] };
  });
  const client = { query: clientQuery, release: vi.fn() };
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: vi.fn(),
  } as unknown as Pool;
  return { repo: new PostgresGdprRepository(pool), clientQuery };
};

describe('PostgresGdprRepository.cancelDeletion', () => {
  it('cancels via a valid uuid token that belongs to the authenticated user', async () => {
    const { repo, clientQuery } = makeRepo([
      PENDING_ROW('u-1', FUTURE) as never,
    ]);

    const result = await repo.cancelDeletion(
      '123e4567-e89b-12d3-a456-426614174000',
      'u-1',
    );

    expect(result).toMatchObject({ restoredHouseIds: [] });
    expect(clientQuery).toHaveBeenCalledWith('COMMIT');
  });

  it('rejects a valid token that belongs to a DIFFERENT authenticated user (ownership check)', async () => {
    const { repo, clientQuery } = makeRepo([
      PENDING_ROW('victim-user', FUTURE) as never,
    ]);

    const result = await repo.cancelDeletion(
      '123e4567-e89b-12d3-a456-426614174000',
      'attacker-user',
    );

    expect(result).toBeNull();
    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(clientQuery).not.toHaveBeenCalledWith('COMMIT');
  });

  it('does not throw a uuid-parse error on an empty token — falls through to the userId lookup', async () => {
    const { repo, clientQuery } = makeRepo([], [{ id: 'req-1' }] as never[]);

    const result = await repo.cancelDeletion('', 'u-1');

    expect(result).not.toBeNull();
    // The malformed/empty token must never reach the gdpr_requests-by-id query.
    expect(
      clientQuery.mock.calls.some(
        ([sql]) =>
          sql.includes('FROM gdpr_requests') && sql.includes('WHERE id = $1'),
      ),
    ).toBe(false);
    expect(clientQuery).toHaveBeenCalledWith('COMMIT');
  });

  it('does not throw on a garbage (non-uuid) token — falls through to the userId lookup', async () => {
    const { repo, clientQuery } = makeRepo([], [{ id: 'req-1' }] as never[]);

    const result = await repo.cancelDeletion('not-a-uuid', 'u-1');

    expect(result).toMatchObject({ restoredHouseIds: [] });
    expect(clientQuery).toHaveBeenCalledWith('COMMIT');
  });

  it('returns false cleanly when neither token nor userId resolve a pending request', async () => {
    const { repo, clientQuery } = makeRepo([], []);

    const result = await repo.cancelDeletion('', 'u-with-no-pending-deletion');

    expect(result).toBeNull();
    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
  });

  it('returns false when the deletion window has already expired', async () => {
    const past = new Date(Date.now() - 1000).toISOString();
    const { repo, clientQuery } = makeRepo([PENDING_ROW('u-1', past) as never]);

    const result = await repo.cancelDeletion(
      '123e4567-e89b-12d3-a456-426614174000',
      'u-1',
    );

    expect(result).toBeNull();
    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
  });
});

describe('PostgresGdprRepository.cancelDeletion restore', () => {
  it('un-archives only the tracked houses that are still archived and reports Stripe flag', async () => {
    const { repo, clientQuery } = makeRepo(
      [],
      [
        {
          id: 'req-1',
          archived_house_ids: ['h-1', 'h-2'],
          stripe_cancel_scheduled: true,
        },
      ],
    );
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id, archived_house_ids')) {
        return {
          rows: [
            {
              id: 'req-1',
              archived_house_ids: ['h-1', 'h-2'],
              stripe_cancel_scheduled: true,
            },
          ],
        };
      }
      if (sql.includes("SET status = 'active'")) {
        return { rows: [{ id: 'h-1' }] }; // h-2 was no longer archived
      }
      return { rows: [] };
    });

    const result = await repo.cancelDeletion('', 'u-1');

    expect(result).toEqual({
      restoredHouseIds: ['h-1'],
      stripeCancelScheduled: true,
    });
    const call = clientQuery.mock.calls.find(([s]) =>
      String(s).includes("SET status = 'active'"),
    )!;
    expect(String(call[0])).toContain("status = 'archived'");
    expect((call as unknown[])[1]).toEqual([['h-1', 'h-2'], 'u-1']);
  });

  it('skips the houses update when nothing was archived', async () => {
    const { repo, clientQuery } = makeRepo([], [{ id: 'req-1' }] as never[]);
    const result = await repo.cancelDeletion('', 'u-1');
    expect(result).toEqual({
      restoredHouseIds: [],
      stripeCancelScheduled: false,
    });
    expect(
      clientQuery.mock.calls.some(([s]) =>
        String(s).includes("SET status = 'active'"),
      ),
    ).toBe(false);
  });
});

describe('PostgresGdprRepository.softDeleteUser', () => {
  it('returns the existing pending request instead of inserting a second one', async () => {
    const { repo, clientQuery } = makeRepo([]);
    clientQuery.mockImplementation(async (sql: string) =>
      sql.includes("type = 'deletion' AND status = 'pending'")
        ? { rows: [{ id: 'req-1', scheduled_for: FUTURE }] }
        : { rows: [] },
    );

    const out = await repo.softDeleteUser('u-1');

    expect(out.cancelToken).toBe('req-1');
    expect(out.scheduledFor.toISOString()).toBe(FUTURE);
    const sqls = clientQuery.mock.calls.map((c) => String(c[0]));
    expect(sqls.some((s) => s.includes('INSERT INTO gdpr_requests'))).toBe(
      false,
    );
    expect(clientQuery).toHaveBeenCalledWith('COMMIT');
  });

  it('archives sole-member houses and inserts the request on first call', async () => {
    const { repo, clientQuery } = makeRepo([]);
    clientQuery.mockImplementation(async (sql: string) =>
      sql.includes('INSERT INTO gdpr_requests')
        ? { rows: [{ id: 'req-2' }] }
        : sql.includes("SET status = 'archived'")
          ? { rows: [{ id: 'h-9' }] }
          : { rows: [] },
    );

    const out = await repo.softDeleteUser('u-1', true);

    expect(out.cancelToken).toBe('req-2');
    const sqls = clientQuery.mock.calls.map((c) => String(c[0]));
    expect(
      sqls.some(
        (s) =>
          s.includes("SET status = 'archived'") && s.includes('NOT EXISTS'),
      ),
    ).toBe(true);
    const insert = clientQuery.mock.calls.find(([s]) =>
      String(s).includes('INSERT INTO gdpr_requests'),
    )!;
    expect((insert as unknown[])[1]).toEqual([
      'u-1',
      expect.any(String),
      ['h-9'],
      true,
    ]);
  });
});

describe('PostgresGdprRepository.getOwnedHousesBlockingDeletion', () => {
  it('returns owned houses that still have other active members', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{ id: 'h-1', name: 'Casa' }],
    });
    const repo = new PostgresGdprRepository({ query } as unknown as Pool);

    expect(await repo.getOwnedHousesBlockingDeletion('u-1')).toEqual([
      { id: 'h-1', name: 'Casa' },
    ]);
    const sql = String(query.mock.calls[0]![0]);
    expect(sql).toContain('owner_id = $1');
    expect(sql).toContain('left_at IS NULL');
  });
});

describe('PostgresGdprRepository.runScheduledCleanup', () => {
  it('purges expired/used reset tokens and closed privacy requests older than 12 months', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('pseudonymize_user')) return { rows: [] };
      if (sql.includes('password_reset_tokens')) return { rowCount: 3 };
      if (sql.includes('FROM gdpr_requests')) return { rowCount: 2 };
      return { rowCount: 1, rows: [] };
    });
    const repo = new PostgresGdprRepository({ query } as unknown as Pool);
    vi.spyOn(repo, 'getPendingDeletions').mockResolvedValue([]);

    const result = await repo.runScheduledCleanup();

    const sqls = query.mock.calls.map((c) => String(c[0]));
    expect(
      sqls.some(
        (s) =>
          s.includes('DELETE FROM password_reset_tokens') &&
          s.includes('used_at IS NOT NULL'),
      ),
    ).toBe(true);
    expect(
      sqls.some(
        (s) =>
          s.includes('DELETE FROM gdpr_requests') &&
          s.includes("status IN ('completed', 'cancelled')") &&
          s.includes("INTERVAL '12 months'"),
      ),
    ).toBe(true);
    expect(result).toMatchObject({
      pseudonymizedUserIds: [],
      resetTokensCleared: 3,
      gdprRequestsCleared: 2,
    });
  });
});

describe('PostgresGdprRepository.exportUserData', () => {
  it('exports profile columns, notes and reports and never selects password_hash', async () => {
    const userRow = {
      id: 'u-1',
      email: 'a@b.com',
      first_name: 'A',
      last_name: 'B',
      created_at: 'x',
      bio: 'hello',
      telephone: '+39 1',
      languages: ['it'],
    };
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('FROM users WHERE id')) return { rows: [userRow] };
      if (sql.includes('FROM bulletin_notes')) {
        return { rows: [{ id: 'n-1', message: 'hi' }] };
      }
      if (sql.includes('FROM reports')) return { rows: [{ id: 'r-1' }] };
      return { rows: [] };
    });
    const repo = new PostgresGdprRepository({ query } as unknown as Pool);

    const data = await repo.exportUserData('u-1');

    expect(data.user.bio).toBe('hello');
    expect(data.user.telephone).toBe('+39 1');
    expect(data.user.languages).toEqual(['it']);
    expect(data.bulletin_notes).toEqual([{ id: 'n-1', message: 'hi' }]);
    expect(data.reports).toEqual([{ id: 'r-1' }]);
    expect(JSON.stringify(data)).not.toContain('password_hash');
    const userSql = query.mock.calls
      .map(([s]) => s as string)
      .find((s) => s.includes('FROM users WHERE id'))!;
    expect(userSql).not.toContain('password_hash');
    expect(userSql).not.toContain('SELECT *');
  });
});

describe('PostgresGdprRepository.exportUserData coverage', () => {
  it('covers every user-keyed table, never token material, and not comments', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('FROM users WHERE id')) {
        return {
          rows: [{ id: 'u-1', preferred_currency: 'EUR', consent_version: 2 }],
        };
      }
      if (sql.includes('FROM subscriptions')) {
        return { rows: [{ plan: 'pro', status: 'active' }] };
      }
      return { rows: [] };
    });
    const repo = new PostgresGdprRepository({ query } as unknown as Pool);

    const data = await repo.exportUserData('u-1');

    const sqls = query.mock.calls.map(([s]) => String(s));
    for (const table of [
      'expenses',
      'bills',
      'bill_reminders',
      'monthly_reports',
      'bulletin_notes',
      'reports',
      'house_invitations',
      'subscriptions',
      'refresh_tokens',
      'user_consents',
      'settlements',
      'gdpr_requests',
    ]) {
      expect(sqls.some((s) => s.includes(`FROM ${table}`))).toBe(true);
    }
    expect(sqls.some((s) => s.includes('comments'))).toBe(false);
    const sessionSql = sqls.find((s) => s.includes('FROM refresh_tokens'))!;
    expect(sessionSql).not.toContain('jti');
    const invSql = sqls.find((s) => s.includes('FROM house_invitations'))!;
    expect(invSql).not.toMatch(/\btoken\b/);
    expect(data.user.preferred_currency).toBe('EUR');
    expect(data.user.consent_version).toBe(2);
    expect(data.subscription).toEqual({ plan: 'pro', status: 'active' });
    expect(data).not.toHaveProperty('comments_received');
  });

  it('inserts an export row in gdpr_requests', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repo = new PostgresGdprRepository({ query } as unknown as Pool);
    await repo.recordExportRequest('u-1');
    expect(String(query.mock.calls[0]![0])).toContain("'export'");
    expect(query.mock.calls[0]![1]).toEqual(['u-1']);
  });

  describe('PostgresGdprRepository GDPR hardening', () => {
    it('cancelDeletion fallback by user id ignores an expired request', async () => {
      const { repo, clientQuery } = makeRepo([], []);
      await repo.cancelDeletion('', 'u-1');
      const sql = clientQuery.mock.calls
        .map(([s]) => String(s))
        .find(
          (s) => s.includes('WHERE user_id = $1') && s.includes('SELECT id'),
        );
      expect(sql).toMatch(/scheduled_for >= NOW\(\)/);
    });

    it('export limits monthly_reports to the membership period', async () => {
      const query = vi.fn(async (sql: string) =>
        sql.includes('FROM users WHERE id')
          ? { rows: [{ id: 'u-1', preferred_currency: 'EUR' }] }
          : { rows: [] },
      );
      const repo = new PostgresGdprRepository({ query } as unknown as Pool);
      await repo.exportUserData('u-1');
      const sql = query.mock.calls
        .map(([s]) => String(s))
        .find((s) => s.includes('FROM monthly_reports'))!;
      expect(sql).toContain('hm.left_at');
      expect(sql).toContain('hm.joined_at');
    });
  });
});
