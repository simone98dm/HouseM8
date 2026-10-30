import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';
import {
  getAccessToken,
  getRefreshToken,
  verifyToken,
} from '~~/server/utils/jwt';

vi.stubGlobal('defineEventHandler', (fn: (...a: unknown[]) => unknown) => fn);
vi.stubGlobal('createError', (o: object) => Object.assign(new Error(), o));
vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/jwt', () => ({
  getAccessToken: vi.fn(() => 'acc'),
  getRefreshToken: vi.fn(() => null),
  verifyToken: vi.fn(),
}));
vi.mock('consola', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    withTag: () => ({ error: vi.fn(), info: vi.fn() }),
  },
}));

const getById = vi.fn();
const ev = (path: string, method = 'POST') => ({ path, method }) as never;
async function run(path: string, method = 'POST') {
  const { default: h } = await import('../../middleware/pending-deletion');
  return (h as (e: never) => Promise<void>)(ev(path, method));
}

describe('pending-deletion middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyToken).mockResolvedValue({ userId: 'u1', email: 'a@b' });
    getById.mockResolvedValue({ data: { deleted_at: '2026-10-01' } });
    vi.mocked(getRepositories).mockReturnValue({ users: { getById } } as never);
  });

  it('blocks a pending-deletion user with ACCOUNT_PENDING_DELETION', async () => {
    await expect(run('/api/bills')).rejects.toMatchObject({
      statusCode: 403,
      data: { code: 'ACCOUNT_PENDING_DELETION' },
    });
  });

  it.each([
    ['/api/users/me', 'GET'],
    ['/api/gdpr/cancel-delete', 'POST'],
    ['/api/gdpr/export', 'GET'],
    ['/api/gdpr/pending-summary', 'GET'],
    ['/api/auth/signout', 'POST'],
    ['/api/auth/refresh', 'POST'],
    ['/api/feature-flags', 'GET'],
  ])('lets %s %s through without a lookup', async (path, method) => {
    await expect(run(path, method)).resolves.toBeUndefined();
    expect(getById).not.toHaveBeenCalled();
  });

  it('still blocks PUT /api/users/me', async () => {
    await expect(run('/api/users/me', 'PUT')).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('ignores non-API paths and active users', async () => {
    await expect(run('/pricing', 'GET')).resolves.toBeUndefined();
    getById.mockResolvedValue({ data: { deleted_at: null } });
    await expect(run('/api/bills')).resolves.toBeUndefined();
  });

  it('ignores unauthenticated requests', async () => {
    vi.mocked(verifyToken).mockResolvedValue(null);
    await expect(run('/api/bills')).resolves.toBeUndefined();
    expect(getById).not.toHaveBeenCalled();
  });

  it('fails open but logs when the lookup returns an error', async () => {
    const consola = (await import('consola')).default as unknown as {
      warn: ReturnType<typeof vi.fn>;
    };
    getById.mockResolvedValue({ data: null, error: 'Database error' });
    await expect(run('/api/bills')).resolves.toBeUndefined();
    expect(consola.warn).toHaveBeenCalled();
  });

  it.each([
    ['/api/users/me/pictures', 'GET'],
    ['/api/users/me/consents', 'GET'],
    ['/api/users/meow', 'GET'],
    ['/api/users/me/../other', 'GET'],
    ['/api/gdpr/export/extra', 'GET'],
    ['/api/gdpr/export-all', 'GET'],
    ['/api/gdpr/pending-summary', 'POST'],
    ['/api/gdpr/pending-summary/extra', 'GET'],
    ['/api/gdpr/cancel-delete-all', 'POST'],
    ['/api/gdpr/delete-account', 'POST'],
    ['/api/auth/signout/evil', 'POST'],
    ['/api/auth/refreshx', 'POST'],
    ['/api/stripe/checkout', 'POST'],
    ['/API/bills', 'GET'],
  ])('blocks tricky look-alike path %s %s', async (path, method) => {
    if (path.startsWith('/API')) {
      // case differs: not under /api/, so the middleware does not apply
      await expect(run(path, method)).resolves.toBeUndefined();
      return;
    }
    await expect(run(path, method)).rejects.toMatchObject({ statusCode: 403 });
  });

  it.each([
    '/api/users/me?include=houses',
    '/api/users/me/?x=1',
    '/api/gdpr/export/?format=json',
  ])('allows allow-listed path with query/trailing slash: %s', async (path) => {
    await expect(run(path, 'GET')).resolves.toBeUndefined();
    expect(getById).not.toHaveBeenCalled();
  });

  it('does not allow-list GET-only entry for other methods (DELETE /api/users/me)', async () => {
    await expect(run('/api/users/me', 'DELETE')).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('identifies the user from the refresh token when the access token is expired', async () => {
    vi.mocked(getAccessToken).mockReturnValueOnce('expired' as never);
    vi.mocked(getRefreshToken).mockReturnValueOnce('refresh' as never);
    vi.mocked(verifyToken).mockImplementation(async (_t, kind) =>
      kind === 'refresh' ? ({ userId: 'u9', email: 'a@b' } as never) : null,
    );
    await expect(run('/api/bills')).rejects.toMatchObject({ statusCode: 403 });
    expect(getById).toHaveBeenCalledWith('u9');
  });

  it('treats a missing access token without refresh token as unauthenticated', async () => {
    vi.mocked(getAccessToken).mockReturnValueOnce(null as never);
    await expect(run('/api/bills')).resolves.toBeUndefined();
    expect(getById).not.toHaveBeenCalled();
  });

  it('fails open when the lookup throws', async () => {
    getById.mockRejectedValue(new Error('db down'));
    await expect(run('/api/bills')).resolves.toBeUndefined();
  });

  it('ignores events without a path', async () => {
    const { default: h } = await import('../../middleware/pending-deletion');
    await expect(
      (h as (e: never) => Promise<void>)({ method: 'GET' } as never),
    ).resolves.toBeUndefined();
  });
});
