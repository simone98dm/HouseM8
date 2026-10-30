import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getAuthProvider } from '~~/server/providers/auth/factory';
import { getRepositories } from '~~/server/repositories/factory';
import { LEGAL_POLICY_VERSION } from '~~/shared/utils/legal';
import { isFeatureEnabled } from '~~/server/utils/feature-flags';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const readValidatedBodyMock = vi.fn();
vi.stubGlobal('readValidatedBody', readValidatedBodyMock);
vi.stubGlobal(
  'createError',
  (params: { statusCode: number; statusMessage: string }) => {
    const err = new Error(params.statusMessage) as Error & {
      statusCode: number;
    };
    err.statusCode = params.statusCode;
    return err;
  },
);
vi.stubGlobal('useRuntimeConfig', () => ({
  public: { baseUrl: 'http://localhost:3000' },
}));

vi.mock('~~/server/providers/auth/factory', () => ({
  getAuthProvider: vi.fn(),
}));
vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/emails', () => ({
  sendRegistrationEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('~~/server/utils/feature-flags', () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
}));

const validBody = {
  email: 'new@user.com',
  age_confirmed: true,
  terms_accepted: true,
  privacy_acknowledged: true,
};

const mockUser = { id: 'u-1', email: 'new@user.com', first_name: 'Jane' };

describe('POST /api/auth/register', () => {
  // Mail goes out after the response via event.waitUntil; tests settle it.
  const pending: Promise<unknown>[] = [];
  const mockEvent = {
    waitUntil: (p: Promise<unknown>) => pending.push(p),
  } as unknown as Parameters<
    typeof import('../../../api/auth/register.post').default
  >[0];
  const settle = () => Promise.all(pending.splice(0));

  let usersUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    usersUpdate = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getRepositories).mockReturnValue({
      users: { update: usersUpdate },
    } as unknown as ReturnType<typeof getRepositories>);
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
  });

  it('returns generic success message on successful registration', async () => {
    readValidatedBodyMock.mockResolvedValue(validBody);
    vi.mocked(getAuthProvider).mockReturnValue({
      signUpEmailOnly: vi.fn().mockResolvedValue(mockUser),
      createEmailVerificationToken: vi.fn().mockResolvedValue(null),
    } as unknown as ReturnType<typeof getAuthProvider>);

    const { default: handler } =
      await import('../../../api/auth/register.post');
    const result = await handler(mockEvent);
    await settle();

    expect(result).toMatchObject({ success: true });
    expect(result.message).toContain('confirmation link');
  });

  it('returns success without email when signUpEmailOnly returns null', async () => {
    const { sendRegistrationEmail } = await import('~~/server/emails');
    readValidatedBodyMock.mockResolvedValue(validBody);
    vi.mocked(getAuthProvider).mockReturnValue({
      signUpEmailOnly: vi.fn().mockResolvedValue(null),
      getUnconfirmedUserByEmail: vi.fn().mockResolvedValue(null),
      createEmailVerificationToken: vi.fn().mockResolvedValue(null),
    } as unknown as ReturnType<typeof getAuthProvider>);

    const { default: handler } =
      await import('../../../api/auth/register.post');
    const result = await handler(mockEvent);
    await settle();

    expect(result).toMatchObject({ success: true });
    expect(sendRegistrationEmail).not.toHaveBeenCalled();
  });

  it('returns success without email when signUpEmailOnly throws (anti-enumeration)', async () => {
    const { sendRegistrationEmail } = await import('~~/server/emails');
    readValidatedBodyMock.mockResolvedValue(validBody);
    vi.mocked(getAuthProvider).mockReturnValue({
      signUpEmailOnly: vi.fn().mockRejectedValue(new Error('already exists')),
      getUnconfirmedUserByEmail: vi.fn().mockResolvedValue(null),
    } as unknown as ReturnType<typeof getAuthProvider>);

    const { default: handler } =
      await import('../../../api/auth/register.post');
    const result = await handler(mockEvent);
    await settle();

    expect(result).toMatchObject({ success: true });
    expect(sendRegistrationEmail).not.toHaveBeenCalled();
  });

  it('resends the link for an existing unconfirmed account with an identical response', async () => {
    const { sendRegistrationEmail } = await import('~~/server/emails');
    readValidatedBodyMock.mockResolvedValue(validBody);
    const createToken = vi.fn().mockResolvedValue({ token: 'fresh-tok' });
    vi.mocked(getAuthProvider).mockReturnValue({
      signUpEmailOnly: vi.fn().mockResolvedValue(null),
      getUnconfirmedUserByEmail: vi.fn().mockResolvedValue(mockUser),
      createEmailVerificationToken: createToken,
    } as unknown as ReturnType<typeof getAuthProvider>);

    const { default: handler } =
      await import('../../../api/auth/register.post');
    const resent = await handler(mockEvent);
    await settle();

    expect(createToken).toHaveBeenCalledWith('u-1', 'new@user.com');
    expect(sendRegistrationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmationLink: 'http://localhost:3000/auth/confirm?token=fresh-tok',
      }),
    );

    vi.mocked(getAuthProvider).mockReturnValue({
      signUpEmailOnly: vi.fn().mockResolvedValue(mockUser),
      createEmailVerificationToken: vi.fn().mockResolvedValue(null),
    } as unknown as ReturnType<typeof getAuthProvider>);
    expect(JSON.stringify(resent)).toBe(
      JSON.stringify(await handler(mockEvent)),
    );
  });

  it('throws 404 when showSignup feature flag is disabled', async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValueOnce(false);
    readValidatedBodyMock.mockResolvedValue(validBody);

    const { default: handler } =
      await import('../../../api/auth/register.post');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('sends verification email when token is returned', async () => {
    const { sendRegistrationEmail } = await import('~~/server/emails');
    readValidatedBodyMock.mockResolvedValue(validBody);
    vi.mocked(getAuthProvider).mockReturnValue({
      signUpEmailOnly: vi.fn().mockResolvedValue(mockUser),
      createEmailVerificationToken: vi
        .fn()
        .mockResolvedValue({ token: 'tok-123' }),
    } as unknown as ReturnType<typeof getAuthProvider>);

    const { default: handler } =
      await import('../../../api/auth/register.post');
    await handler(mockEvent);
    await settle();
    expect(sendRegistrationEmail).toHaveBeenCalled();
  });

  it('throws 500 when a downstream step throws unexpectedly', async () => {
    readValidatedBodyMock.mockResolvedValue(validBody);
    usersUpdate.mockRejectedValue(new Error('DB error'));
    vi.mocked(getAuthProvider).mockReturnValue({
      signUpEmailOnly: vi.fn().mockResolvedValue(mockUser),
      createEmailVerificationToken: vi.fn().mockResolvedValue(null),
    } as unknown as ReturnType<typeof getAuthProvider>);

    const { default: handler } =
      await import('../../../api/auth/register.post');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it('rethrows a downstream error that already has a statusCode', async () => {
    readValidatedBodyMock.mockResolvedValue(validBody);
    const knownError = Object.assign(new Error('Conflict'), {
      statusCode: 409,
    });
    usersUpdate.mockRejectedValue(knownError);
    vi.mocked(getAuthProvider).mockReturnValue({
      signUpEmailOnly: vi.fn().mockResolvedValue(mockUser),
      createEmailVerificationToken: vi.fn().mockResolvedValue(null),
    } as unknown as ReturnType<typeof getAuthProvider>);

    const { default: handler } =
      await import('../../../api/auth/register.post');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('stores the integer legal policy version on the new user', async () => {
    readValidatedBodyMock.mockResolvedValue(validBody);
    vi.mocked(getAuthProvider).mockReturnValue({
      signUpEmailOnly: vi.fn().mockResolvedValue(mockUser),
      createEmailVerificationToken: vi.fn().mockResolvedValue(null),
    } as unknown as ReturnType<typeof getAuthProvider>);

    const { default: handler } =
      await import('../../../api/auth/register.post');
    await handler(mockEvent);
    await settle();

    expect(usersUpdate).toHaveBeenCalledWith(
      'u-1',
      expect.objectContaining({
        consent_version: LEGAL_POLICY_VERSION,
      }),
    );
  });

  it.each(['age_confirmed', 'terms_accepted', 'privacy_acknowledged'])(
    'rejects the body when %s is missing or false',
    async (field) => {
      const { default: handler } =
        await import('../../../api/auth/register.post');
      for (const value of [undefined, false]) {
        readValidatedBodyMock.mockImplementation(
          async (_e: unknown, validate: (b: unknown) => unknown) =>
            validate({ ...validBody, [field]: value }),
        );
        await expect(handler(mockEvent)).rejects.toThrow();
      }
      readValidatedBodyMock.mockReset();
    },
  );
});
