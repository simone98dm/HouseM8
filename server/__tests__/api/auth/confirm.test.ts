import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getAuthProvider } from '~~/server/providers/auth/factory';
import { setAuthCookies } from '~~/server/utils/jwt';
import { logSecurityEvent } from '~~/server/utils/security-events';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const bodyMock = vi.fn();
vi.stubGlobal(
  'readValidatedBody',
  async (_e: unknown, parse: (b: unknown) => unknown) =>
    parse(await bodyMock()),
);
vi.stubGlobal(
  'createError',
  (p: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(p.statusMessage), { statusCode: p.statusCode }),
);

vi.mock('~~/server/providers/auth/factory', () => ({
  getAuthProvider: vi.fn(),
}));
vi.mock('~~/server/utils/security-events', () => ({
  logSecurityEvent: vi.fn(),
}));
vi.mock('~~/server/utils/jwt', () => ({
  generateAccessToken: vi.fn().mockResolvedValue('acc'),
  generateRefreshToken: vi.fn().mockResolvedValue('ref'),
  setAuthCookies: vi.fn(),
}));

describe('POST /api/auth/confirm', () => {
  const confirmOAuthSession = vi.fn();
  const confirmEmailVerificationToken = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthProvider).mockReturnValue({
      confirmOAuthSession,
      confirmEmailVerificationToken,
    } as unknown as ReturnType<typeof getAuthProvider>);
  });

  it('rejects client-supplied Google access/refresh tokens without calling the provider', async () => {
    bodyMock.mockResolvedValue({
      access_token: 'victim-token',
      refresh_token: 'x',
    });
    const { default: handler } = await import('../../../api/auth/confirm.post');
    await expect(handler({} as never)).rejects.toBeTruthy();
    expect(confirmOAuthSession).not.toHaveBeenCalled();
    expect(confirmEmailVerificationToken).not.toHaveBeenCalled();
  });

  it('signs in with a valid magic-link token', async () => {
    bodyMock.mockResolvedValue({ token: 't' });
    confirmEmailVerificationToken.mockResolvedValue({
      userId: 'u-1',
      email: 'a@b.com',
      isEmailChange: false,
    });
    const { default: handler } = await import('../../../api/auth/confirm.post');
    await expect(handler({} as never)).resolves.toMatchObject({
      success: true,
    });
    expect(setAuthCookies).toHaveBeenCalled();
  });

  it('applies an email change without signing the link opener in', async () => {
    bodyMock.mockResolvedValue({ token: 't' });
    confirmEmailVerificationToken.mockResolvedValue({
      userId: 'u-1',
      email: 'new@b.com',
      isEmailChange: true,
    });
    const { default: handler } = await import('../../../api/auth/confirm.post');
    await expect(handler({} as never)).resolves.toMatchObject({
      success: true,
    });
    expect(setAuthCookies).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid token', async () => {
    bodyMock.mockResolvedValue({ token: 't' });
    confirmEmailVerificationToken.mockResolvedValue(null);
    const { default: handler } = await import('../../../api/auth/confirm.post');
    await expect(handler({} as never)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('asks for a password (409) without signing in when the sign-up has none', async () => {
    bodyMock.mockResolvedValue({ token: 't' });
    confirmEmailVerificationToken.mockResolvedValue('password_required');
    const { default: handler } = await import('../../../api/auth/confirm.post');
    await expect(handler({} as never)).rejects.toMatchObject({
      statusCode: 409,
      message: 'PASSWORD_REQUIRED',
    });
    expect(setAuthCookies).not.toHaveBeenCalled();
  });

  it('passes the password through, signs in and logs password_set', async () => {
    bodyMock.mockResolvedValue({ token: 't', password: 'longenough' });
    confirmEmailVerificationToken.mockResolvedValue({
      userId: 'u-1',
      email: 'a@b.com',
      isEmailChange: false,
      passwordSet: true,
    });
    const { default: handler } = await import('../../../api/auth/confirm.post');
    await expect(handler({} as never)).resolves.toMatchObject({
      success: true,
    });
    expect(confirmEmailVerificationToken).toHaveBeenCalledWith(
      't',
      'longenough',
    );
    expect(setAuthCookies).toHaveBeenCalled();
    expect(logSecurityEvent).toHaveBeenCalledWith(
      'password_set',
      expect.objectContaining({ userId: 'u-1' }),
    );
  });

  it('rejects a password shorter than 8 characters before touching the token', async () => {
    bodyMock.mockResolvedValue({ token: 't', password: 'short' });
    const { default: handler } = await import('../../../api/auth/confirm.post');
    await expect(handler({} as never)).rejects.toBeTruthy();
    expect(confirmEmailVerificationToken).not.toHaveBeenCalled();
  });
});
