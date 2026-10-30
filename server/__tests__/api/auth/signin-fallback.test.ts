import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthProvider } from '~~/server/providers/auth/factory';
import { logSecurityEvent } from '~~/server/utils/security-events';

vi.stubGlobal('defineEventHandler', (fn: (...a: unknown[]) => unknown) => fn);
const readValidatedBodyMock = vi.fn();
vi.stubGlobal('readValidatedBody', readValidatedBodyMock);
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

const event = {} as never;
const load = async () =>
  (await import('../../../api/auth/signin.post')).default;

describe('POST /api/auth/signin (events, fallback, unverified)', () => {
  const signIn = vi.fn();
  const signInWithEvent = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    readValidatedBodyMock.mockResolvedValue({
      email: 'a@b.c',
      password: 'Password1!',
      rememberMe: false,
    });
  });

  it('logs signin_success with user id on event-based success', async () => {
    signInWithEvent.mockResolvedValue({ id: 'u1' });
    vi.mocked(getAuthProvider).mockReturnValue({ signInWithEvent } as never);
    await (
      await load()
    )(event);
    expect(logSecurityEvent).toHaveBeenCalledWith('signin_success', {
      userId: 'u1',
      event,
    });
  });

  it('logs signin_failed on event-based failure', async () => {
    signInWithEvent.mockResolvedValue(null);
    vi.mocked(getAuthProvider).mockReturnValue({ signInWithEvent } as never);
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(logSecurityEvent).toHaveBeenCalledWith('signin_failed', { event });
  });

  it('falls back to signIn when signInWithEvent is not implemented', async () => {
    signIn.mockResolvedValue({ id: 'u2' });
    vi.mocked(getAuthProvider).mockReturnValue({ signIn } as never);
    const res = await (await load())(event);
    expect(signIn).toHaveBeenCalledWith({
      email: 'a@b.c',
      password: 'Password1!',
    });
    expect(res).toEqual({ user: { id: 'u2' } });
    expect(logSecurityEvent).toHaveBeenCalledWith('signin_success', {
      userId: 'u2',
      event,
    });
  });

  it('returns 401 and logs signin_failed on fallback failure', async () => {
    signIn.mockResolvedValue(null);
    vi.mocked(getAuthProvider).mockReturnValue({ signIn } as never);
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(logSecurityEvent).toHaveBeenCalledWith('signin_failed', { event });
  });

  it('maps EMAIL_NOT_CONFIRMED to 403', async () => {
    signInWithEvent.mockRejectedValue(new Error('EMAIL_NOT_CONFIRMED'));
    vi.mocked(getAuthProvider).mockReturnValue({ signInWithEvent } as never);
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
