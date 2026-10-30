import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isFeatureEnabled } from '~~/server/utils/feature-flags';
import { getAuthProvider } from '~~/server/providers/auth/factory';
import { getRepositories } from '~~/server/repositories/factory';
import { logSecurityEvent } from '~~/server/utils/security-events';
import { upsertOAuthUserProfile } from '~~/server/utils/oauthProfile';
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
} from '~~/server/utils/jwt';

const query = vi.fn();
const cookies: Record<string, string | undefined> = {};
const fetchMock = vi.fn();
const redirect = vi.fn();
// ponytail: mutate the real (nuxt-env) runtime config instead of stubbing it
type Cfg = Record<string, unknown> & { public: Record<string, unknown> };
let config: Cfg;
vi.stubGlobal('defineEventHandler', (fn: (...a: unknown[]) => unknown) => fn);
vi.stubGlobal(
  'createError',
  (p: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(p.statusMessage), { statusCode: p.statusCode }),
);
vi.stubGlobal('getQuery', () => query());
vi.stubGlobal('getCookie', (_e: unknown, n: string) => cookies[n]);
vi.stubGlobal('deleteCookie', vi.fn());
vi.stubGlobal('$fetch', fetchMock);
vi.stubGlobal('sendRedirect', redirect);

vi.mock('~~/server/utils/feature-flags', () => ({ isFeatureEnabled: vi.fn() }));
vi.mock('~~/server/providers/auth/factory', () => ({
  getAuthProvider: vi.fn(),
}));
vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/security-events', () => ({
  logSecurityEvent: vi.fn(),
}));
vi.mock('~~/server/utils/oauthProfile', () => ({
  upsertOAuthUserProfile: vi.fn(),
}));
vi.mock('~~/server/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('~~/server/utils/jwt', () => ({
  generateAccessToken: vi.fn().mockResolvedValue('acc'),
  generateRefreshToken: vi.fn().mockResolvedValue('ref'),
  setAuthCookies: vi.fn(),
}));

const event = {} as never;
const load = async () =>
  (await import('../../../api/auth/google/callback.get')).default;

describe('GET /api/auth/google/callback', () => {
  const confirmOAuthSession = vi.fn();
  const getById = vi.fn();
  const getByEmail = vi.fn();
  const gUser = { id: 'g1', email: 'g@x.io' };

  beforeEach(() => {
    vi.resetAllMocks();
    config = useRuntimeConfig() as unknown as Cfg;
    vi.mocked(generateAccessToken).mockResolvedValue('acc');
    vi.mocked(generateRefreshToken).mockResolvedValue('ref');
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
    Object.assign(config, { googleClientId: 'cid', googleClientSecret: 'sec' });
    config.public.baseUrl = 'http://app.test';
    query.mockReturnValue({ code: 'c', state: 's' });
    cookies.oauth_state = 's';
    fetchMock
      .mockResolvedValueOnce({
        access_token: 'at',
        refresh_token: 'rt',
        expires_in: 3600,
        token_type: '',
      })
      .mockResolvedValueOnce({});
    vi.mocked(getAuthProvider).mockReturnValue({
      confirmOAuthSession,
    } as never);
    confirmOAuthSession.mockResolvedValue({
      user: gUser,
      metadata: { provider: 'google' },
    });
    vi.mocked(getRepositories).mockReturnValue({
      users: { getById, getByEmail },
    } as never);
    getById.mockResolvedValue({ data: null, error: 'User not found' });
    getByEmail.mockResolvedValue({ data: null });
    vi.mocked(upsertOAuthUserProfile).mockResolvedValue(undefined);
  });

  it('404 when signup feature is disabled', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false);
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('400 when Google returns an error (string and array)', async () => {
    query.mockReturnValue({ error: 'access_denied' });
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'OAuth error: access_denied',
    });
    query.mockReturnValue({ error: ['denied2'] });
    await expect((await load())(event)).rejects.toMatchObject({
      message: 'OAuth error: denied2',
    });
    query.mockReturnValue({ error: [] });
    await expect((await load())(event)).rejects.toMatchObject({
      message: 'OAuth error: unknown',
    });
  });

  it.each([
    ['state mismatch', { code: 'c', state: 'other' }, 's'],
    ['missing state', { code: 'c' }, 's'],
    ['no stored cookie', { code: 'c', state: 's' }, undefined],
    ['array state', { code: 'c', state: ['s'] }, 's'],
  ])('400 on CSRF failure: %s', async (_n, q, stored) => {
    query.mockReturnValue(q);
    cookies.oauth_state = stored;
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid OAuth state parameter',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('400 when authorization code is missing', async () => {
    query.mockReturnValue({ state: 's' });
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Authorization code missing',
    });
  });

  it('500 when Google OAuth credentials are not configured', async () => {
    Object.assign(config, { googleClientId: '' });
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Google OAuth not configured',
    });
  });

  it('400 when Google omits tokens', async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce({ access_token: 'at' });
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('501 when provider lacks confirmOAuthSession', async () => {
    vi.mocked(getAuthProvider).mockReturnValue({} as never);
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 501,
    });
  });

  it('400 and signin_failed event when provider rejects the tokens', async () => {
    confirmOAuthSession.mockResolvedValue(null);
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(logSecurityEvent).toHaveBeenCalledWith('signin_failed', { event });
    expect(setAuthCookies).not.toHaveBeenCalled();
  });

  it('creates profile for a new user, sets cookies, logs and redirects', async () => {
    await (
      await load()
    )(event);
    expect(upsertOAuthUserProfile).toHaveBeenCalledWith(
      expect.anything(),
      'g1',
      'g@x.io',
      { provider: 'google' },
      null,
    );
    expect(confirmOAuthSession).toHaveBeenCalledWith(
      'at',
      'rt',
      expect.objectContaining({ token_type: 'Bearer', provider: 'google' }),
    );
    expect(setAuthCookies).toHaveBeenCalledWith(event, 'acc', 'ref');
    expect(logSecurityEvent).toHaveBeenCalledWith('signin_success', {
      userId: 'g1',
      event,
    });
    expect(redirect).toHaveBeenCalledWith(
      event,
      'http://app.test/?oauth_completed=true',
    );
  });

  it('falls back to email lookup when getById yields nothing', async () => {
    getByEmail.mockResolvedValue({
      data: { id: 'g1', first_name: 'Ann', is_first_access: false },
    });
    await (
      await load()
    )(event);
    expect(getByEmail).toHaveBeenCalledWith('g@x.io');
    expect(upsertOAuthUserProfile).not.toHaveBeenCalled();
  });

  it('skips lookup by email when the OAuth user has no email', async () => {
    confirmOAuthSession.mockResolvedValue({
      user: { id: 'g1' },
      metadata: { provider: 'google' },
    });
    await (
      await load()
    )(event);
    expect(getByEmail).not.toHaveBeenCalled();
    expect(upsertOAuthUserProfile).toHaveBeenCalledWith(
      expect.anything(),
      'g1',
      '',
      expect.anything(),
      null,
    );
  });

  it('refreshes profile for existing first-access google user', async () => {
    getById.mockResolvedValue({
      data: { id: 'g1', first_name: 'Ann', is_first_access: true },
      error: null,
    });
    await (
      await load()
    )(event);
    expect(upsertOAuthUserProfile).toHaveBeenCalled();
  });

  it('does not touch an existing completed profile, and tolerates getById errors', async () => {
    getById.mockResolvedValue({
      data: { id: 'g1', first_name: 'Ann', is_first_access: false },
      error: 'other',
    });
    await (
      await load()
    )(event);
    expect(upsertOAuthUserProfile).not.toHaveBeenCalled();
  });

  it('rethrows errors carrying a statusCode from profile upsert', async () => {
    vi.mocked(upsertOAuthUserProfile).mockRejectedValue(
      Object.assign(new Error('x'), { statusCode: 500 }),
    );
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 500,
      message: 'x',
    });
  });

  it('wraps unknown failures (e.g. token exchange) as 500', async () => {
    fetchMock.mockReset();
    fetchMock.mockRejectedValue(new Error('network'));
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 500,
      message: 'OAuth callback failed',
    });
  });
});
