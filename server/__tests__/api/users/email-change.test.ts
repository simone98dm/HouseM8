import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getAuthProvider } from '~~/server/providers/auth/factory';
import { getRepositories } from '~~/server/repositories/factory';
import { sendRegistrationEmail } from '~~/server/emails';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const readValidatedBodyMock = vi.fn();
vi.stubGlobal(
  'readValidatedBody',
  async (_e: unknown, parse: (b: unknown) => unknown) =>
    parse(await readValidatedBodyMock()),
);
vi.stubGlobal(
  'createError',
  (params: {
    statusCode: number;
    statusMessage?: string;
    message?: string;
  }) => {
    const err = new Error(params.statusMessage ?? params.message) as Error & {
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
  sendRegistrationEmail: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi
    .fn()
    .mockResolvedValue({ id: 'u-1', email: 'old@example.com' }),
}));

const event = {} as never;

describe('POST /api/users/me/email', () => {
  let provider: {
    verifyPassword: ReturnType<typeof vi.fn>;
    createEmailVerificationToken: ReturnType<typeof vi.fn>;
    updateUserEmail: ReturnType<typeof vi.fn>;
  };
  let getByEmail: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = {
      verifyPassword: vi.fn().mockResolvedValue('valid'),
      createEmailVerificationToken: vi
        .fn()
        .mockResolvedValue({ token: 'raw-tok' }),
      updateUserEmail: vi.fn(),
    };
    getByEmail = vi.fn().mockResolvedValue({ data: null });
    vi.mocked(getAuthProvider).mockReturnValue(
      provider as unknown as ReturnType<typeof getAuthProvider>,
    );
    vi.mocked(getRepositories).mockReturnValue({
      users: { getByEmail },
    } as unknown as ReturnType<typeof getRepositories>);
    readValidatedBodyMock.mockResolvedValue({
      newEmail: '  New@Example.com ',
      currentPassword: 'pw',
    });
  });

  const run = async () =>
    (await import('../../../api/users/me/email.post')).default(event);

  it('sends a confirmation link to the NEW address and does not change the email', async () => {
    const result = await run();

    expect(provider.createEmailVerificationToken).toHaveBeenCalledWith(
      'u-1',
      'new@example.com',
    );
    expect(sendRegistrationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@example.com',
        confirmationLink: 'http://localhost:3000/auth/confirm?token=raw-tok',
      }),
    );
    expect(provider.updateUserEmail).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: true });
  });

  it('rejects a wrong current password and sends nothing', async () => {
    provider.verifyPassword.mockResolvedValue('invalid');
    await expect(run()).rejects.toMatchObject({ statusCode: 403 });
    expect(sendRegistrationEmail).not.toHaveBeenCalled();
  });

  it('responds 400 for an account without a password (Google-only)', async () => {
    provider.verifyPassword.mockResolvedValue('no_password');
    await expect(run()).rejects.toMatchObject({ statusCode: 400 });
    expect(provider.createEmailVerificationToken).not.toHaveBeenCalled();
  });

  it('returns the identical response and sends nothing when the address is taken', async () => {
    const fresh = await run();
    vi.clearAllMocks();
    vi.mocked(getAuthProvider).mockReturnValue(
      provider as unknown as ReturnType<typeof getAuthProvider>,
    );
    getByEmail.mockResolvedValue({ data: { id: 'someone-else' } });

    const taken = await run();

    expect(taken).toEqual(fresh);
    expect(provider.createEmailVerificationToken).not.toHaveBeenCalled();
    expect(sendRegistrationEmail).not.toHaveBeenCalled();
  });

  it('rejects an invalid email via the schema', async () => {
    readValidatedBodyMock.mockResolvedValue({
      newEmail: 'nope',
      currentPassword: 'pw',
    });
    await expect(run()).rejects.toBeTruthy();
    expect(provider.verifyPassword).not.toHaveBeenCalled();
  });
});
