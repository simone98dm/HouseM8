import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getAuthProvider } from '~~/server/providers/auth/factory';

// Stub Nitro/H3 globals before importing handlers
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

const getAuthProviderMock = vi.mocked(getAuthProvider);

describe('POST /api/auth/signin', () => {
  const mockEvent = {} as Parameters<
    typeof import('../../../api/auth/signin.post').default
  >[0];

  beforeEach(async () => {
    vi.clearAllMocks();
  });

  it('returns user on successful sign-in', async () => {
    const mockUser = { id: 'u-1', email: 'test@test.com', first_name: 'Test' };
    readValidatedBodyMock.mockResolvedValue({
      email: 'test@test.com',
      password: 'Password1!',
      rememberMe: false,
    });
    getAuthProviderMock.mockReturnValue({
      signInWithEvent: vi.fn().mockResolvedValue(mockUser),
    } as unknown as ReturnType<typeof getAuthProvider>);

    const { default: handler } = await import('../../../api/auth/signin.post');
    const result = await handler(mockEvent);

    expect(result).toEqual({ user: mockUser });
  });

  it('throws 401 when auth provider returns null', async () => {
    readValidatedBodyMock.mockResolvedValue({
      email: 'test@test.com',
      password: 'wrong',
      rememberMe: false,
    });
    getAuthProviderMock.mockReturnValue({
      signInWithEvent: vi.fn().mockResolvedValue(null),
    } as unknown as ReturnType<typeof getAuthProvider>);

    const { default: handler } = await import('../../../api/auth/signin.post');

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 500 when auth provider throws unexpected error', async () => {
    readValidatedBodyMock.mockResolvedValue({
      email: 'test@test.com',
      password: 'pass',
      rememberMe: false,
    });
    getAuthProviderMock.mockReturnValue({
      signInWithEvent: vi.fn().mockRejectedValue(new Error('DB down')),
    } as unknown as ReturnType<typeof getAuthProvider>);

    const { default: handler } = await import('../../../api/auth/signin.post');

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });
});
