import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthProvider } from '~~/server/providers/auth/factory';
import { logSecurityEvent } from '~~/server/utils/security-events';

vi.stubGlobal('defineEventHandler', (fn: (...a: unknown[]) => unknown) => fn);
vi.stubGlobal(
  'createError',
  (p: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(p.statusMessage), { statusCode: p.statusCode }),
);
const body = vi.fn();
vi.stubGlobal(
  'readValidatedBody',
  (_e: unknown, parse: (b: unknown) => unknown) =>
    Promise.resolve(body()).then(parse),
);
vi.mock('~~/server/providers/auth/factory', () => ({
  getAuthProvider: vi.fn(),
}));
vi.mock('~~/server/utils/security-events', () => ({
  logSecurityEvent: vi.fn(),
}));

const event = {} as never;
const load = async () =>
  (await import('../../../api/auth/password-reset/confirm.post')).default;

describe('POST /api/auth/password-reset/confirm', () => {
  const resetPassword = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    body.mockReturnValue({ token: 'tok', newPassword: 'longenough' });
    vi.mocked(getAuthProvider).mockReturnValue({ resetPassword } as never);
  });

  it('resets password and logs a password_reset security event', async () => {
    resetPassword.mockResolvedValue(true);
    const res = await (await load())(event);
    expect(resetPassword).toHaveBeenCalledWith('tok', 'longenough');
    expect(logSecurityEvent).toHaveBeenCalledWith('password_reset', { event });
    expect(res).toMatchObject({ success: true });
  });

  it('returns 400 and logs nothing for invalid/expired token', async () => {
    resetPassword.mockResolvedValue(false);
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(logSecurityEvent).not.toHaveBeenCalled();
  });

  it('maps unexpected provider errors to 500', async () => {
    resetPassword.mockRejectedValue(new Error('boom'));
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it.each([
    [{ token: '', newPassword: 'longenough' }],
    [{ token: 'tok', newPassword: 'short' }],
  ])('rejects invalid body %j before calling the provider', async (b) => {
    body.mockReturnValue(b);
    await expect((await load())(event)).rejects.toBeDefined();
    expect(resetPassword).not.toHaveBeenCalled();
  });
});
