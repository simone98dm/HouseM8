import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';
import { ensureHouseMember } from '~~/server/utils/repository-auth';
import { logSecurityEvent } from '~~/server/utils/security-events';
import { SETTLEMENT_UNDO_WINDOW_MS } from '~~/server/utils/settlements';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const paramsMock = vi.fn<() => unknown>();
vi.stubGlobal(
  'getValidatedRouterParams',
  async (_e: unknown, validator: (p: unknown) => unknown) =>
    validator(paramsMock()),
);
vi.stubGlobal(
  'createError',
  (p: { statusCode: number; statusMessage?: string; data?: unknown }) =>
    Object.assign(new Error(p.statusMessage ?? 'Error'), {
      statusCode: p.statusCode,
      data: p.data,
    }),
);

vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/security-events', () => ({
  logSecurityEvent: vi.fn(),
}));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi
    .fn()
    .mockResolvedValue({ id: '7d1f9b1e-3c2a-4f5e-9a8b-1c2d3e4f5a6b' }),
  ensureHouseMember: vi.fn().mockResolvedValue(undefined),
}));

const FROM = '7d1f9b1e-3c2a-4f5e-9a8b-1c2d3e4f5a6b';
const TO = '9c2e1d0f-4b3a-4e6d-8a7c-2d3e4f5a6b7c';
const HOUSE = '3f2b8c1e-5d4a-4b6e-9c7a-1a2b3c4d5e6f';
const SET_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

const settlement = (over: Record<string, unknown> = {}) => ({
  id: SET_ID,
  house_id: HOUSE,
  from_user_id: FROM,
  to_user_id: TO,
  amount: 12,
  kind: 'settlement',
  created_by: FROM,
  created_at: new Date(Date.now() - 60_000).toISOString(),
  undone_at: null,
  ...over,
});

const mockRepo = (
  found: unknown,
  undo: { data: unknown; error: string | null } = {
    data: { count: 2 },
    error: null,
  },
) => {
  const getSettlement = vi.fn().mockResolvedValue({ data: found, error: null });
  const undoSettlement = vi.fn().mockResolvedValue(undo);
  vi.mocked(getRepositories).mockReturnValue({
    expenses: { getSettlement, undoSettlement },
  } as unknown as ReturnType<typeof getRepositories>);
  return { getSettlement, undoSettlement };
};

const run = async () => {
  const { default: handler } =
    await import('../../../api/houses/[id]/settlements/[settlementId]/undo.post');
  return handler({} as never);
};

describe('POST /api/houses/[id]/settlements/[settlementId]/undo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paramsMock.mockReturnValue({ id: HOUSE, settlementId: SET_ID });
  });

  it('undoes a recent settlement for the debtor and logs it', async () => {
    const { getSettlement, undoSettlement } = mockRepo(settlement());

    const result = await run();

    expect(ensureHouseMember).toHaveBeenCalledWith(HOUSE, FROM);
    expect(getSettlement).toHaveBeenCalledWith(HOUSE, SET_ID);
    expect(undoSettlement).toHaveBeenCalledWith(HOUSE, SET_ID);
    expect(result).toEqual({ data: { reverted_count: 2 } });
    expect(logSecurityEvent).toHaveBeenCalledWith(
      'settlement_undone',
      expect.objectContaining({
        userId: FROM,
        metadata: { house_id: HOUSE, settlement_id: SET_ID },
      }),
    );
  });

  it('lets the creditor undo too', async () => {
    mockRepo(settlement({ from_user_id: TO, to_user_id: FROM }));
    await expect(run()).resolves.toEqual({ data: { reverted_count: 2 } });
  });

  it('refuses a housemate who is neither side', async () => {
    const { undoSettlement } = mockRepo(
      settlement({ from_user_id: TO, to_user_id: 'someone-else' }),
    );

    await expect(run()).rejects.toMatchObject({ statusCode: 403 });
    expect(undoSettlement).not.toHaveBeenCalled();
  });

  it('refuses non-members before looking anything up', async () => {
    const { getSettlement } = mockRepo(settlement());
    vi.mocked(ensureHouseMember).mockRejectedValueOnce(
      Object.assign(new Error('Forbidden'), { statusCode: 403 }),
    );

    await expect(run()).rejects.toMatchObject({ statusCode: 403 });
    expect(getSettlement).not.toHaveBeenCalled();
  });

  it('answers 404 for a settlement outside this house', async () => {
    const { undoSettlement } = mockRepo(null);
    await expect(run()).rejects.toMatchObject({ statusCode: 404 });
    expect(undoSettlement).not.toHaveBeenCalled();
  });

  it('answers 409 ALREADY_UNDONE when it was undone before', async () => {
    const { undoSettlement } = mockRepo(
      settlement({ undone_at: new Date().toISOString() }),
    );
    await expect(run()).rejects.toMatchObject({
      statusCode: 409,
      data: { code: 'ALREADY_UNDONE' },
    });
    expect(undoSettlement).not.toHaveBeenCalled();
  });

  it('answers 409 UNDO_WINDOW_EXPIRED after 24 hours', async () => {
    const { undoSettlement } = mockRepo(
      settlement({
        created_at: new Date(
          Date.now() - SETTLEMENT_UNDO_WINDOW_MS - 1000,
        ).toISOString(),
      }),
    );
    await expect(run()).rejects.toMatchObject({
      statusCode: 409,
      data: { code: 'UNDO_WINDOW_EXPIRED' },
    });
    expect(undoSettlement).not.toHaveBeenCalled();
  });

  it('still allows undo just inside the window', async () => {
    mockRepo(
      settlement({
        created_at: new Date(
          Date.now() - SETTLEMENT_UNDO_WINDOW_MS + 60_000,
        ).toISOString(),
      }),
    );
    await expect(run()).resolves.toBeDefined();
  });

  it('maps a lost race (already undone in the transaction) to 409', async () => {
    mockRepo(settlement(), { data: null, error: 'ALREADY_UNDONE' });
    await expect(run()).rejects.toMatchObject({
      statusCode: 409,
      data: { code: 'ALREADY_UNDONE' },
    });
    expect(logSecurityEvent).not.toHaveBeenCalled();
  });

  it('reports a failed transaction as 500 and logs nothing', async () => {
    mockRepo(settlement(), { data: null, error: 'Database error' });
    await expect(run()).rejects.toMatchObject({ statusCode: 500 });
    expect(logSecurityEvent).not.toHaveBeenCalled();
  });

  it('rejects ids that are not uuids', async () => {
    mockRepo(settlement());
    paramsMock.mockReturnValue({ id: HOUSE, settlementId: 'nope' });
    await expect(run()).rejects.toThrow();
  });

  it('refuses to undo a per-share payment (mark the share unpaid instead)', async () => {
    const { undoSettlement } = mockRepo(settlement({ kind: 'share' }));
    await expect(run()).rejects.toMatchObject({
      statusCode: 409,
      data: { code: 'SHARE_PAYMENT' },
    });
    expect(undoSettlement).not.toHaveBeenCalled();
  });
});
