import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';

import { verifyAuthCompat } from '~~/server/utils/repository-auth';

const param = vi.fn();
vi.stubGlobal('defineEventHandler', (fn: (...a: unknown[]) => unknown) => fn);
vi.stubGlobal('getRouterParam', () => param());
vi.stubGlobal('createError', (p: { statusCode: number; message?: string }) =>
  Object.assign(new Error(p.message), { statusCode: p.statusCode }),
);
vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi.fn(),
}));

const load = async () => (await import('../../../api/users/[id].get')).default;

describe('GET /api/users/[id] authorization and error paths', () => {
  const getById = vi.fn();
  const getCurrentForUser = vi.fn();
  const listActive = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(verifyAuthCompat).mockResolvedValue({ id: 'u1' } as never);
    param.mockReturnValue('u2');
    getById.mockResolvedValue({
      data: { id: 'u2', deleted_at: null },
      error: null,
    });
    getCurrentForUser.mockImplementation(async (id: string) => ({
      data: { id: id === 'u1' ? 'h1' : 'h1' },
    }));
    listActive.mockResolvedValue({ data: null, error: null });
    vi.mocked(getRepositories).mockReturnValue({
      users: { getById },
      houses: { getCurrentForUser },
      consents: { listActive },
    } as never);
  });

  it('400 when id param is missing', async () => {
    param.mockReturnValue(undefined);
    await expect((await load())({} as never)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(getById).not.toHaveBeenCalled();
  });

  it('500 when the user lookup fails', async () => {
    getById.mockResolvedValue({ data: null, error: 'db' });
    await expect((await load())({} as never)).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it('404 when target does not exist', async () => {
    getById.mockResolvedValue({ data: null, error: null });
    await expect((await load())({} as never)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('404 (not 403) for a user pending deletion, without revealing house membership', async () => {
    getById.mockResolvedValue({
      data: { id: 'u2', deleted_at: '2026-01-01' },
      error: null,
    });
    await expect((await load())({} as never)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(getCurrentForUser).not.toHaveBeenCalled();
  });

  it('403 when the caller is not in a house', async () => {
    getCurrentForUser.mockResolvedValueOnce({ data: null });
    await expect((await load())({} as never)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('404 when the target is not in a house', async () => {
    getCurrentForUser
      .mockResolvedValueOnce({ data: { id: 'h1' } })
      .mockResolvedValueOnce({ data: null });
    await expect((await load())({} as never)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('403 when the users are in different houses', async () => {
    getCurrentForUser
      .mockResolvedValueOnce({ data: { id: 'h1' } })
      .mockResolvedValueOnce({ data: { id: 'h2' } });
    await expect((await load())({} as never)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('treats a null consent list as no sharing', async () => {
    const res = (await (
      await load()
    )({} as never)) as unknown as { data: Record<string, unknown> };
    expect(res.data).not.toHaveProperty('email');
    expect(res.data).not.toHaveProperty('bio');
  });
});
