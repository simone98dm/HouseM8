import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';
import { ensureHouseAdmin } from '~~/server/utils/repository-auth';

const HOUSE_ID = '3f2b8c1e-5d4a-4b6e-9c7a-1a2b3c4d5e6f';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const paramsMock = vi.fn<() => unknown>();
vi.stubGlobal(
  'getValidatedRouterParams',
  async (_e: unknown, v: (p: unknown) => unknown) => v(paramsMock()),
);
vi.stubGlobal('createError', (p: { statusCode: number; message?: string }) =>
  Object.assign(new Error(p.message ?? 'Error'), {
    statusCode: p.statusCode,
  }),
);
vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi.fn().mockResolvedValue({ id: 'me' }),
  ensureHouseAdmin: vi.fn().mockResolvedValue(undefined),
}));

const run = async (repoResult: { data: unknown; error: string | null }) => {
  const getActiveInviteCode = vi.fn().mockResolvedValue(repoResult);
  vi.mocked(getRepositories).mockReturnValue({
    houses: { getActiveInviteCode },
  } as unknown as ReturnType<typeof getRepositories>);
  const { default: handler } =
    await import('../../../api/houses/[id]/invitation/code.get');
  return { call: () => handler({} as never), getActiveInviteCode };
};

describe('GET /api/houses/:id/invitation/code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paramsMock.mockReturnValue({ id: HOUSE_ID });
  });

  it('returns the active code to a house admin', async () => {
    const code = { code: '123456', code_expires_at: '2026-10-28T10:00:00Z' };
    const { call, getActiveInviteCode } = await run({
      data: code,
      error: null,
    });
    await expect(call()).resolves.toEqual({ data: code });
    expect(ensureHouseAdmin).toHaveBeenCalledWith(HOUSE_ID, 'me');
    expect(getActiveInviteCode).toHaveBeenCalledWith(HOUSE_ID);
  });

  it('returns null when the house has no active code', async () => {
    const { call } = await run({ data: null, error: null });
    await expect(call()).resolves.toEqual({ data: null });
  });

  it('refuses non-admins before reading any code', async () => {
    vi.mocked(ensureHouseAdmin).mockRejectedValueOnce(
      Object.assign(new Error('Forbidden'), { statusCode: 403 }),
    );
    const { call, getActiveInviteCode } = await run({
      data: null,
      error: null,
    });
    await expect(call()).rejects.toMatchObject({ statusCode: 403 });
    expect(getActiveInviteCode).not.toHaveBeenCalled();
  });

  it('rejects a house id that is not a UUID', async () => {
    paramsMock.mockReturnValue({ id: 'nope' });
    const { call, getActiveInviteCode } = await run({
      data: null,
      error: null,
    });
    await expect(call()).rejects.toBeTruthy();
    expect(getActiveInviteCode).not.toHaveBeenCalled();
  });

  it('answers 500 when the repository fails', async () => {
    const { call } = await run({ data: null, error: 'db down' });
    await expect(call()).rejects.toMatchObject({ statusCode: 500 });
  });
});
