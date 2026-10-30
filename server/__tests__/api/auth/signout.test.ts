import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getAuthProvider } from '~~/server/providers/auth/factory';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
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
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi
    .fn()
    .mockResolvedValue({ userId: 'u-1', email: 'test@test.com' }),
}));

describe('POST /api/auth/signout', () => {
  const mockEvent = {} as Parameters<
    typeof import('../../../api/auth/signout.post').default
  >[0];

  beforeEach(() => vi.clearAllMocks());

  it('returns success message on successful signout', async () => {
    vi.mocked(getAuthProvider).mockReturnValue({
      signOut: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof getAuthProvider>);

    const { default: handler } = await import('../../../api/auth/signout.post');
    const result = await handler(mockEvent);

    expect(result).toMatchObject({
      message: expect.stringContaining('signed out'),
    });
  });

  it('throws 500 when signOut throws', async () => {
    vi.mocked(getAuthProvider).mockReturnValue({
      signOut: vi.fn().mockRejectedValue(new Error('provider error')),
    } as unknown as ReturnType<typeof getAuthProvider>);

    const { default: handler } = await import('../../../api/auth/signout.post');

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });
});
