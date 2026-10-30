import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthProvider } from '~~/server/providers/auth/factory';
import { sendRegistrationEmail } from '~~/server/emails';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const readValidatedBodyMock = vi.fn();
vi.stubGlobal('readValidatedBody', readValidatedBodyMock);
vi.stubGlobal('useRuntimeConfig', () => ({
  public: { baseUrl: 'http://localhost:3000' },
}));

vi.mock('~~/server/providers/auth/factory', () => ({
  getAuthProvider: vi.fn(),
}));
vi.mock('~~/server/emails', () => ({
  sendRegistrationEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mail goes out after the response via event.waitUntil; tests settle it.
const pending: Promise<unknown>[] = [];
const mockEvent = {
  waitUntil: (p: Promise<unknown>) => pending.push(p),
} as unknown as Parameters<
  typeof import('../../../api/auth/resend-confirmation.post').default
>[0];
const settle = () => Promise.all(pending.splice(0));

const provider = (unconfirmed: { id: string } | null) => {
  const createToken = vi.fn().mockResolvedValue({ token: 'tok' });
  vi.mocked(getAuthProvider).mockReturnValue({
    getUnconfirmedUserByEmail: vi.fn().mockResolvedValue(unconfirmed),
    createEmailVerificationToken: createToken,
  } as unknown as ReturnType<typeof getAuthProvider>);
  return createToken;
};

describe('POST /api/auth/resend-confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readValidatedBodyMock.mockResolvedValue({ email: 'new@user.com' });
  });

  it('mails a fresh link to an unconfirmed account', async () => {
    const createToken = provider({ id: 'u-1' });
    const { default: handler } =
      await import('../../../api/auth/resend-confirmation.post');

    expect(await handler(mockEvent)).toEqual({ success: true });
    await settle();
    expect(createToken).toHaveBeenCalledWith('u-1', 'new@user.com');
    expect(sendRegistrationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@user.com',
        confirmationLink: 'http://localhost:3000/auth/confirm?token=tok',
      }),
    );
  });

  // A slow mail send must not make known addresses answer slower.
  it('answers before the mail is sent', async () => {
    provider({ id: 'u-1' });
    vi.mocked(sendRegistrationEmail).mockReturnValueOnce(new Promise(() => {}));
    const { default: handler } =
      await import('../../../api/auth/resend-confirmation.post');

    expect(await handler(mockEvent)).toEqual({ success: true });
    expect(pending).toHaveLength(1);
    pending.splice(0);
  });

  it('answers identically and sends nothing for unknown, confirmed or cooling-down addresses', async () => {
    provider(null);
    const { default: handler } =
      await import('../../../api/auth/resend-confirmation.post');

    expect(await handler(mockEvent)).toEqual({ success: true });
    await settle();
    expect(sendRegistrationEmail).not.toHaveBeenCalled();
  });
});
