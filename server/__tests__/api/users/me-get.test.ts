import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyAuthCompatSafe } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';

vi.stubGlobal('defineEventHandler', (fn: (...a: unknown[]) => unknown) => fn);
vi.stubGlobal(
  'createError',
  (p: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(p.statusMessage), { statusCode: p.statusCode }),
);
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompatSafe: vi.fn(),
}));
vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
const cookie = vi.fn();
const header = vi.fn();
vi.mock('h3', async (orig) => ({
  ...(await orig<typeof import('h3')>()),
  getCookie: (...a: unknown[]) => cookie(...a),
  getHeader: (...a: unknown[]) => header(...a),
}));

const event = {} as never;
const load = async () => (await import('../../../api/users/me.get')).default;

describe('GET /api/users/me', () => {
  const getById = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getRepositories).mockReturnValue({ users: { getById } } as never);
  });

  it('returns 401 when unauthenticated and no session hints exist', async () => {
    vi.mocked(verifyAuthCompatSafe).mockResolvedValue(null as never);
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('returns 503 when session cookie exists but user is not ready', async () => {
    vi.mocked(verifyAuthCompatSafe).mockResolvedValue(null as never);
    cookie.mockReturnValue('tok');
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 503,
    });
  });

  it('returns 500 when the repository errors', async () => {
    vi.mocked(verifyAuthCompatSafe).mockResolvedValue({ id: 'u1' } as never);
    getById.mockResolvedValue({ data: null, error: 'db' });
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it('returns 404 when profile is missing', async () => {
    vi.mocked(verifyAuthCompatSafe).mockResolvedValue({ id: 'u1' } as never);
    getById.mockResolvedValue({ data: null, error: null });
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('flags non-deleted user with null schedule', async () => {
    vi.mocked(verifyAuthCompatSafe).mockResolvedValue({ id: 'u1' } as never);
    getById.mockResolvedValue({
      data: { id: 'u1', deleted_at: null },
      error: null,
    });
    const { data } = (await (
      await load()
    )(event)) as { data: Record<string, unknown> };
    expect(data).toMatchObject({
      pending_deletion: false,
      deletion_scheduled_for: null,
    });
  });

  it('schedules purge 30 days after deleted_at for pending-deletion user', async () => {
    vi.mocked(verifyAuthCompatSafe).mockResolvedValue({ id: 'u1' } as never);
    getById.mockResolvedValue({
      data: { id: 'u1', deleted_at: '2026-01-01T00:00:00.000Z' },
      error: null,
    });
    const { data } = (await (
      await load()
    )(event)) as { data: Record<string, unknown> };
    expect(data).toMatchObject({
      pending_deletion: true,
      deletion_scheduled_for: '2026-01-31T00:00:00.000Z',
    });
  });

  it('wraps unexpected throws as 500', async () => {
    vi.mocked(verifyAuthCompatSafe).mockRejectedValue(new Error('x'));
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 500,
    });
  });
});
