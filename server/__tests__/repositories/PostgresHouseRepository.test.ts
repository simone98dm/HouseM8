import { describe, it, expect, vi } from 'vitest';
import type { Pool } from 'pg';
import { PostgresHouseRepository } from '../../repositories/postgres/PostgresHouseRepository';

const invitation = {
  id: 'inv-1',
  house_id: 'h-1',
  code_used_at: null,
  code_locked_until: null,
  code_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
};

/** Transaction client. `current`/`max` drive the capacity check. */
const makeTxRepo = (current: number, max: number) => {
  const clientQuery = vi.fn(async (sql: string) => {
    if (sql.includes('FROM house_invitations')) return { rows: [invitation] };
    if (sql.includes('FROM houses h')) {
      return { rows: [{ max_members: max, current: String(current) }] };
    }
    if (sql.includes('UPDATE house_invitations')) return { rows: [invitation] };
    return { rows: [] };
  });
  const client = { query: clientQuery, release: vi.fn() };
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
  } as unknown as Pool;
  return { repo: new PostgresHouseRepository(pool), clientQuery };
};

const memberInserted = (q: ReturnType<typeof vi.fn>) =>
  q.mock.calls.some(([sql]: unknown[]) =>
    (sql as string).includes('INSERT INTO house_members'),
  );

describe('PostgresHouseRepository — capacity enforcement', () => {
  it('acceptInvitation locks invitation and house and rejects a full house', async () => {
    const { repo, clientQuery } = makeTxRepo(2, 2);

    const result = await repo.acceptInvitation('tok', 'u-2');

    expect(result.error).toBe('HOUSE_FULL');
    expect(memberInserted(clientQuery)).toBe(false);
    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
    const sqls = clientQuery.mock.calls.map(([s]: unknown[]) => s as string);
    expect(sqls.find((s) => s.includes('FROM house_invitations'))).toContain(
      'FOR UPDATE',
    );
    expect(sqls.find((s) => s.includes('FROM houses h'))).toContain(
      'FOR UPDATE',
    );
  });

  it('acceptInvitation succeeds when there is room', async () => {
    const { repo, clientQuery } = makeTxRepo(1, 2);

    const result = await repo.acceptInvitation('tok', 'u-2');

    expect(result.error).toBeNull();
    expect(memberInserted(clientQuery)).toBe(true);
  });

  it('redeemInviteCode rejects a full house', async () => {
    const { repo, clientQuery } = makeTxRepo(3, 3);

    const result = await repo.redeemInviteCode('123456', 'u-2');

    expect(result.error).toBe('HOUSE_FULL');
    expect(memberInserted(clientQuery)).toBe(false);
  });

  it('redeemInviteCode succeeds when there is room', async () => {
    const { repo } = makeTxRepo(1, 3);

    const result = await repo.redeemInviteCode('123456', 'u-2');

    expect(result.error).toBeNull();
  });
});

describe('PostgresHouseRepository — one invitation, one use', () => {
  it('accepting by link spends the code too', async () => {
    const { repo, clientQuery } = makeTxRepo(1, 5);
    await repo.acceptInvitation('tok', 'u-2');
    const sqls = clientQuery.mock.calls.map(([sql]) => sql as string);
    expect(sqls.find((s) => s.includes('WHERE token = $1'))).toContain(
      'code_used_at IS NULL',
    );
    expect(sqls.find((s) => s.includes('UPDATE house_invitations'))).toContain(
      'code_used_at',
    );
  });

  it('redeeming by code spends the link too', async () => {
    const { repo, clientQuery } = makeTxRepo(1, 5);
    await repo.redeemInviteCode('123456', 'u-2');
    const update = clientQuery.mock.calls
      .map(([sql]) => sql as string)
      .find((s) => s.includes('UPDATE house_invitations'));
    expect(update).toContain('used = true');
  });

  it('a code whose link was already accepted is refused', async () => {
    const clientQuery = vi.fn(async (sql: string) =>
      sql.includes('FROM house_invitations')
        ? { rows: [{ ...invitation, used: true }] }
        : { rows: [] },
    );
    const pool = {
      connect: vi
        .fn()
        .mockResolvedValue({ query: clientQuery, release: vi.fn() }),
    } as unknown as Pool;
    const result = await new PostgresHouseRepository(pool).redeemInviteCode(
      '123456',
      'u-2',
    );
    expect(result.error).toBe('CODE_USED');
    expect(memberInserted(clientQuery)).toBe(false);
  });
});

describe('PostgresHouseRepository.attachInviteCode', () => {
  it('retries after a unique-index collision (23505)', async () => {
    const collision = Object.assign(new Error('dup'), { code: '23505' });
    const query = vi
      .fn()
      .mockRejectedValueOnce(collision)
      .mockResolvedValueOnce({
        rows: [{ code: '654321', code_expires_at: 'x' }],
      });
    const repo = new PostgresHouseRepository({ query } as unknown as Pool);

    const result = await repo.attachInviteCode('inv-1');

    expect(query).toHaveBeenCalledTimes(2);
    expect(result.data?.code).toBe('654321');
  });

  it('rethrows non-collision errors without retrying', async () => {
    const query = vi.fn().mockRejectedValue(new Error('connection lost'));
    const repo = new PostgresHouseRepository({ query } as unknown as Pool);

    const result = await repo.attachInviteCode('inv-1');

    expect(query).toHaveBeenCalledTimes(1);
    expect(result.error).toBe('connection lost');
  });
});

describe('PostgresHouseRepository.getActiveInviteCode', () => {
  it('returns only a shareable, live code of that house', async () => {
    const row = { code: '123456', code_expires_at: 'x' };
    const query = vi.fn().mockResolvedValue({ rows: [row] });
    const repo = new PostgresHouseRepository({ query } as unknown as Pool);

    const result = await repo.getActiveInviteCode('h-1');

    expect(result.data).toEqual(row);
    const [sql, params] = query.mock.calls[0]!;
    expect(params).toEqual(['h-1']);
    for (const filter of [
      'house_id = $1',
      "invited_email = ''", // not a code emailed to a specific person
      'code_used_at IS NULL',
      'code_expires_at > NOW()',
      'code_locked_until IS NULL OR code_locked_until < NOW()',
      'ORDER BY created_at DESC',
    ]) {
      expect(sql).toContain(filter);
    }
  });

  it('returns null when there is no live code', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repo = new PostgresHouseRepository({ query } as unknown as Pool);

    const result = await repo.getActiveInviteCode('h-1');

    expect(result).toEqual({ data: null, error: null });
  });
});

describe('PostgresHouseRepository — failed redeem rate limit', () => {
  it('upserts the counter under redeem-fail:<userId>', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ count: 1 }] });
    const repo = new PostgresHouseRepository({ query } as unknown as Pool);

    await repo.registerFailedRedeemAttempt('u-1');

    const [sql, params] = query.mock.calls[0]!;
    expect(sql).toContain('INSERT INTO rate_limits');
    expect(sql).toContain('ON CONFLICT (key) DO UPDATE');
    expect(params).toEqual(['redeem-fail:u-1']);
  });

  it.each([
    [4, false],
    [5, true],
    [9, true],
  ])('isRedeemBlocked with count %i is %s', async (count, blocked) => {
    const query = vi.fn().mockResolvedValue({ rows: [{ count }] });
    const repo = new PostgresHouseRepository({ query } as unknown as Pool);

    expect(await repo.isRedeemBlocked('u-1')).toBe(blocked);
    expect(query.mock.calls[0]![1]).toEqual(['redeem-fail:u-1']);
  });

  it('is not blocked when there is no counter row or the window expired', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repo = new PostgresHouseRepository({ query } as unknown as Pool);

    expect(await repo.isRedeemBlocked('u-1')).toBe(false);
    expect(query.mock.calls[0]![0]).toContain("INTERVAL '1 hour'");
  });
});

describe('PostgresHouseRepository.transferOwnership', () => {
  const makeRepo = (demoted: number, promoted: number) => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("SET role = 'member'")) return { rowCount: demoted };
      if (sql.includes("SET role = 'owner'")) return { rowCount: promoted };
      return { rows: [], rowCount: 1 };
    });
    const client = { query, release: vi.fn() };
    const pool = {
      connect: vi.fn().mockResolvedValue(client),
    } as unknown as Pool;
    return { repo: new PostgresHouseRepository(pool), query, client };
  };
  const sqls = (q: ReturnType<typeof vi.fn>) =>
    q.mock.calls.map(([s]: unknown[]) => s as string);

  it('demotes the owner, promotes the target and syncs owner_id', async () => {
    const { repo, query } = makeRepo(1, 1);

    const result = await repo.transferOwnership('h-1', 'u-1', 'u-2');

    expect(result.error).toBeNull();
    const run = sqls(query);
    const demoteAt = run.findIndex((s) => s.includes("SET role = 'member'"));
    const promoteAt = run.findIndex((s) => s.includes("SET role = 'owner'"));
    expect(demoteAt).toBeLessThan(promoteAt);
    expect(run.some((s) => s.includes('UPDATE houses SET owner_id'))).toBe(
      true,
    );
    expect(query).toHaveBeenCalledWith('COMMIT');
  });

  it('rolls back with NOT_OWNER when the caller is no longer owner', async () => {
    const { repo, query } = makeRepo(0, 1);

    const result = await repo.transferOwnership('h-1', 'u-1', 'u-2');

    expect(result.error).toBe('NOT_OWNER');
    expect(query).toHaveBeenCalledWith('ROLLBACK');
    expect(sqls(query).some((s) => s.includes("SET role = 'owner'"))).toBe(
      false,
    );
  });

  it('rolls back with MEMBER_NOT_FOUND when the target is not active', async () => {
    const { repo, query, client } = makeRepo(1, 0);

    const result = await repo.transferOwnership('h-1', 'u-1', 'u-2');

    expect(result.error).toBe('MEMBER_NOT_FOUND');
    expect(query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });
});

describe('PostgresHouseRepository — pending-deletion users', () => {
  it('getMembers excludes users in the deletion grace period', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repo = new PostgresHouseRepository({ query } as unknown as Pool);

    await repo.getMembers('h-1');

    expect(query.mock.calls[0]![0]).toContain('u.deleted_at IS NULL');
  });
});

describe('PostgresHouseRepository.update — description', () => {
  const makeRepo = () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'h-1' }] });
    return {
      repo: new PostgresHouseRepository({ query } as unknown as Pool),
      query,
    };
  };

  it('writes description as a bound parameter', async () => {
    const { repo, query } = makeRepo();
    await repo.update('h-1', { description: 'Cosy flat' });
    const [sql, values] = query.mock.calls[0]!;
    expect(sql).toContain('description = $1');
    expect(sql).not.toContain('Cosy flat');
    expect(values).toEqual(['Cosy flat', 'h-1']);
  });

  it('writes null to clear the description', async () => {
    const { repo, query } = makeRepo();
    await repo.update('h-1', { description: null });
    expect(query.mock.calls[0]![1]).toEqual([null, 'h-1']);
  });
});
