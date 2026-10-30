import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';
import { ensureHouseMember } from '~~/server/utils/repository-auth';
import { SETTLEMENT_UNDO_WINDOW_MS } from '~~/server/utils/settlements';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
vi.stubGlobal(
  'getValidatedRouterParams',
  async (_e: unknown, v: (p: unknown) => unknown) =>
    v({ id: '3f2b8c1e-5d4a-4b6e-9c7a-1a2b3c4d5e6f' }),
);
const queryMock = vi.fn<() => unknown>();
vi.stubGlobal(
  'getValidatedQuery',
  async (_e: unknown, v: (p: unknown) => unknown) => v(queryMock()),
);
vi.stubGlobal(
  'createError',
  (p: { statusCode: number; statusMessage?: string }) =>
    Object.assign(new Error(p.statusMessage ?? 'Error'), {
      statusCode: p.statusCode,
    }),
);
vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi.fn().mockResolvedValue({ id: 'me' }),
  ensureHouseMember: vi.fn().mockResolvedValue(undefined),
}));

const row = (over: Record<string, unknown> = {}) => ({
  id: 's',
  from_user_id: 'me',
  to_user_id: 'other',
  from_user: { id: 'me', first_name: 'Me', avatar_url: null },
  to_user: { id: 'other', first_name: 'Marco', avatar_url: null },
  amount: 5,
  kind: 'settlement',
  created_by: 'me',
  created_at: new Date().toISOString(),
  undone_at: null,
  ...over,
});

const run = async (rows: unknown[]) => {
  const listSettlements = vi
    .fn()
    .mockResolvedValue({ data: rows, error: null });
  vi.mocked(getRepositories).mockReturnValue({
    expenses: { listSettlements },
  } as unknown as ReturnType<typeof getRepositories>);
  const { default: handler } =
    await import('../../../api/houses/[id]/settlements/index.get');
  const result = (await handler({} as never)) as {
    data: Array<{ can_undo: boolean }>;
  };
  return { result, listSettlements };
};

describe('GET /api/houses/[id]/settlements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryMock.mockReturnValue({});
  });

  it('requires house membership and defaults the limit to 20', async () => {
    const { listSettlements } = await run([]);
    expect(ensureHouseMember).toHaveBeenCalled();
    expect(listSettlements).toHaveBeenCalledWith(expect.any(String), 20);
  });

  it('rejects an out-of-range limit', async () => {
    queryMock.mockReturnValue({ limit: '500' });
    await expect(run([])).rejects.toThrow();
  });

  it('can_undo only for a participant, inside 24h, not undone, plan payments', async () => {
    const old = new Date(
      Date.now() - SETTLEMENT_UNDO_WINDOW_MS - 1000,
    ).toISOString();
    const { result } = await run([
      row(),
      row({ created_at: old }),
      row({ undone_at: new Date().toISOString() }),
      row({ from_user_id: 'x', to_user_id: 'y' }),
      row({ kind: 'share' }),
    ]);
    expect(result.data.map((d) => d.can_undo)).toEqual([
      true,
      false,
      false,
      false,
      false,
    ]);
  });

  it('exposes only public profile fields of the other users', async () => {
    const { result } = await run([row()]);
    expect(Object.keys(result.data[0]!)).not.toContain('created_by');
  });
});
