import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';

vi.stubGlobal('defineEventHandler', (fn: (...a: unknown[]) => unknown) => fn);
vi.stubGlobal('getRouterParam', () => 'u2');
vi.stubGlobal('createError', (p: { statusCode: number; message?: string }) =>
  Object.assign(new Error(p.message), { statusCode: p.statusCode }),
);
vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi.fn().mockResolvedValue({ id: 'u1' }),
}));

const target = {
  id: 'u2',
  email: 'e@x.com',
  first_name: 'B',
  last_name: 'C',
  avatar_url: null,
  bio: 'bio',
  deleted_at: null as string | null,
};
const listActive = vi.fn();

describe('GET /api/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    target.deleted_at = null;
    listActive.mockResolvedValue({ data: [], error: null });
    vi.mocked(getRepositories).mockReturnValue({
      users: { getById: vi.fn(async () => ({ data: target, error: null })) },
      houses: {
        getCurrentForUser: vi.fn(async () => ({ data: { id: 'h1' } })),
      },
      consents: { listActive },
    } as never);
  });

  it('returns the minimal DTO without consent (no email)', async () => {
    const { default: h } = await import('../../../api/users/[id].get');
    const res = (await h({} as never)) as unknown as {
      data: Record<string, unknown>;
    };
    expect(res.data).toEqual({
      id: 'u2',
      first_name: 'B',
      last_name: 'C',
      avatar_url: null,
    });
  });

  it('adds optional fields with profile_sharing, still no email', async () => {
    listActive.mockResolvedValue({
      data: [{ purpose: 'profile_sharing' }],
      error: null,
    });
    const { default: h } = await import('../../../api/users/[id].get');
    const res = (await h({} as never)) as unknown as {
      data: Record<string, unknown>;
    };
    expect(res.data.bio).toBe('bio');
    expect(res.data).not.toHaveProperty('email');
  });

  it('hides users pending deletion (404)', async () => {
    target.deleted_at = '2026-10-01';
    const { default: h } = await import('../../../api/users/[id].get');
    await expect(h({} as never)).rejects.toMatchObject({ statusCode: 404 });
  });
});
