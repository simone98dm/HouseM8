import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.stubGlobal('useRuntimeConfig', () => ({
  jwtSecret: 'test-jwt-secret-must-be-at-least-32chars!!',
}));

const queryMock = vi.hoisted(() => vi.fn());
vi.mock('~~/server/utils/postgres', () => ({
  getPostgresPool: () => ({ query: queryMock }),
}));

const getCookieMock = vi.fn();
const setCookieMock = vi.fn();
const deleteCookieMock = vi.fn();

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>();
  return {
    ...actual,
    getCookie: (...args: unknown[]) => getCookieMock(...args),
    setCookie: (...args: unknown[]) => setCookieMock(...args),
    deleteCookie: (...args: unknown[]) => deleteCookieMock(...args),
  };
});

const {
  setAuthCookies,
  getAccessToken,
  getRefreshToken,
  clearAuthCookies,
  getUserFromToken,
  refreshAccessToken,
  generateAccessToken,
  generateRefreshToken,
} = await import('../../utils/jwt');

const ACCESS_TOKEN_NAME = 'house_m8_access_token';
const REFRESH_TOKEN_NAME = 'house_m8_refresh_token';

const makeEvent = (authHeader?: string) =>
  ({
    node: {
      req: {
        headers: authHeader ? { authorization: authHeader } : {},
      },
    },
  }) as Parameters<typeof getAccessToken>[0];

describe('server/utils/jwt — cookie helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Active refresh token row by default
    queryMock.mockResolvedValue({ rows: [{ revoked_at: null }] });
  });

  describe('setAuthCookies', () => {
    it('calls setCookie twice (access + refresh)', () => {
      const event = makeEvent();
      setAuthCookies(event, 'acc', 'ref');
      expect(setCookieMock).toHaveBeenCalledTimes(2);
    });

    it('sets access token with correct name and 15-min maxAge', () => {
      const event = makeEvent();
      setAuthCookies(event, 'acc', 'ref');
      expect(setCookieMock).toHaveBeenCalledWith(
        event,
        ACCESS_TOKEN_NAME,
        'acc',
        expect.objectContaining({ maxAge: 15 * 60 }),
      );
    });

    it('sets refresh token maxAge when rememberMe=true', () => {
      const event = makeEvent();
      setAuthCookies(event, 'acc', 'ref', true);
      const call = setCookieMock.mock.calls.find(
        (c) => c[1] === REFRESH_TOKEN_NAME,
      )!;
      expect(call[3]).toHaveProperty('maxAge', 7 * 24 * 60 * 60);
    });

    it('omits maxAge on refresh token when rememberMe=false (session cookie)', () => {
      const event = makeEvent();
      setAuthCookies(event, 'acc', 'ref', false);
      const call = setCookieMock.mock.calls.find(
        (c) => c[1] === REFRESH_TOKEN_NAME,
      )!;
      expect(call[3]).not.toHaveProperty('maxAge');
    });

    it('defaults to session cookie (rememberMe omitted)', () => {
      const event = makeEvent();
      setAuthCookies(event, 'acc', 'ref');
      const call = setCookieMock.mock.calls.find(
        (c) => c[1] === REFRESH_TOKEN_NAME,
      )!;
      expect(call[3]).not.toHaveProperty('maxAge');
    });
  });

  describe('getAccessToken', () => {
    it('returns null when no cookie and no Authorization header', () => {
      getCookieMock.mockReturnValue(undefined);
      expect(getAccessToken(makeEvent())).toBeNull();
    });

    it('returns token from cookie', () => {
      getCookieMock.mockReturnValue('cookie-tok');
      expect(getAccessToken(makeEvent())).toBe('cookie-tok');
    });

    it('returns token from Bearer Authorization header when no cookie', () => {
      getCookieMock.mockReturnValue(undefined);
      expect(getAccessToken(makeEvent('Bearer header-tok'))).toBe('header-tok');
    });

    it('returns null when Authorization header does not start with Bearer', () => {
      getCookieMock.mockReturnValue(undefined);
      expect(getAccessToken(makeEvent('Basic abc123'))).toBeNull();
    });

    it('prefers cookie over Authorization header', () => {
      getCookieMock.mockReturnValue('cookie-tok');
      expect(getAccessToken(makeEvent('Bearer header-tok'))).toBe('cookie-tok');
    });
  });

  describe('getRefreshToken', () => {
    it('returns token from cookie', () => {
      getCookieMock.mockReturnValue('refresh-tok');
      expect(getRefreshToken(makeEvent())).toBe('refresh-tok');
    });

    it('returns null when cookie is absent', () => {
      getCookieMock.mockReturnValue(undefined);
      expect(getRefreshToken(makeEvent())).toBeNull();
    });
  });

  describe('clearAuthCookies', () => {
    it('deletes both access and refresh cookies', () => {
      const event = makeEvent();
      clearAuthCookies(event);
      expect(deleteCookieMock).toHaveBeenCalledTimes(2);
      expect(deleteCookieMock).toHaveBeenCalledWith(event, ACCESS_TOKEN_NAME);
      expect(deleteCookieMock).toHaveBeenCalledWith(event, REFRESH_TOKEN_NAME);
    });
  });

  describe('getUserFromToken', () => {
    it('returns null when no token in cookie or header', async () => {
      getCookieMock.mockReturnValue(undefined);
      const result = await getUserFromToken(makeEvent());
      expect(result).toBeNull();
    });

    it('returns payload for a valid access token', async () => {
      const token = await generateAccessToken('u-42', 'me@example.com');
      getCookieMock.mockReturnValue(token);
      const result = await getUserFromToken(makeEvent());
      expect(result).not.toBeNull();
      expect(result!.userId).toBe('u-42');
      expect(result!.email).toBe('me@example.com');
    });

    it('returns null for an invalid token', async () => {
      getCookieMock.mockReturnValue('garbage.token.string');
      const result = await getUserFromToken(makeEvent());
      expect(result).toBeNull();
    });
  });

  describe('refreshAccessToken', () => {
    it('returns null when no refresh token cookie', async () => {
      getCookieMock.mockReturnValue(undefined);
      const result = await refreshAccessToken(makeEvent());
      expect(result).toBeNull();
    });

    it('returns null when refresh token is invalid', async () => {
      getCookieMock.mockReturnValue('bad.token');
      const result = await refreshAccessToken(makeEvent());
      expect(result).toBeNull();
    });

    it('returns a new access token string for a valid refresh token', async () => {
      const refreshToken = await generateRefreshToken('u-1', 'me@example.com');
      getCookieMock.mockReturnValue(refreshToken);
      const result = await refreshAccessToken(makeEvent());
      expect(typeof result).toBe('string');
      expect(result!.split('.')).toHaveLength(3);
    });

    it('returns null when the refresh token row is revoked', async () => {
      const refreshToken = await generateRefreshToken('u-1', 'me@example.com');
      getCookieMock.mockReturnValue(refreshToken);
      queryMock.mockResolvedValue({ rows: [{ revoked_at: new Date() }] });
      expect(await refreshAccessToken(makeEvent())).toBeNull();
      expect(setCookieMock).not.toHaveBeenCalled();
    });

    it('returns null when the refresh token row does not exist', async () => {
      const refreshToken = await generateRefreshToken('u-1', 'me@example.com');
      getCookieMock.mockReturnValue(refreshToken);
      queryMock.mockResolvedValue({ rows: [] });
      expect(await refreshAccessToken(makeEvent())).toBeNull();
    });

    it('returns null for a refresh token without jti', async () => {
      const { SignJWT } = await import('jose');
      const noJti = await new SignJWT({
        userId: 'u-1',
        email: 'me@example.com',
        typ: 'refresh',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .sign(
          new TextEncoder().encode(
            'test-jwt-secret-must-be-at-least-32chars!!',
          ),
        );
      getCookieMock.mockReturnValue(noJti);
      expect(await refreshAccessToken(makeEvent())).toBeNull();
    });

    it('calls setCookie to update the access token cookie after refresh', async () => {
      const refreshToken = await generateRefreshToken('u-1', 'me@example.com');
      getCookieMock.mockReturnValue(refreshToken);
      await refreshAccessToken(makeEvent());
      expect(setCookieMock).toHaveBeenCalledWith(
        expect.anything(),
        ACCESS_TOKEN_NAME,
        expect.any(String),
        expect.objectContaining({ maxAge: 15 * 60 }),
      );
    });
  });
});
