import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logSecurityEvent } from '~~/server/utils/security-events';
import { getRepositories } from '~~/server/repositories/factory';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const getRouterParamMock = vi.fn();
const readBodyMock = vi.fn<() => Promise<unknown>>();
vi.stubGlobal('getRouterParam', getRouterParamMock);
vi.stubGlobal('readBody', readBodyMock);
vi.stubGlobal(
  'createError',
  (p: { statusCode: number; message?: string; statusMessage?: string }) => {
    const e = new Error(p.message ?? p.statusMessage ?? 'Error') as Error & {
      statusCode: number;
    };
    e.statusCode = p.statusCode;
    return e;
  },
);
// readValidatedBody: run the validator through a try-catch, mirrors h3 behaviour
vi.stubGlobal(
  'readValidatedBody',
  vi
    .fn()
    .mockImplementation(
      async (_event: unknown, validator: (body: unknown) => unknown) => {
        const body = await readBodyMock();
        try {
          return validator(body);
        } catch (err) {
          throw createError({
            statusCode: 400,
            message: err instanceof Error ? err.message : 'Validation failed',
          });
        }
      },
    ),
);

vi.mock('~~/server/utils/security-events', () => ({
  logSecurityEvent: vi.fn(),
}));
vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi
    .fn()
    .mockResolvedValue({ id: 'u-owner', email: 'owner@b.com' }),
  ensureHouseOwner: vi.fn().mockResolvedValue(undefined),
}));

describe('PATCH /api/houses/[id]/members/[user_id]', () => {
  const mockEvent = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-apply readValidatedBody after clearAllMocks (clearAllMocks only clears call history, not impl)
    getRouterParamMock.mockImplementation((_: unknown, param: string) =>
      param === 'id' ? 'h-1' : 'u-target',
    );
    readBodyMock.mockResolvedValue({ role: 'member' });
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        // target is a plain member unless a test overrides it
        getMemberRole: vi
          .fn()
          .mockResolvedValue({ data: 'member', error: null }),
        updateMemberRole: vi.fn().mockResolvedValue({
          data: { id: 'hm-1', user_id: 'u-target', role: 'member' },
          error: null,
        }),
      },
    } as unknown as ReturnType<typeof getRepositories>);
  });

  it('updates member role successfully', async () => {
    const { default: handler } =
      await import('../../../api/houses/[id]/members/[user_id].patch');
    const result = await handler(mockEvent);
    expect(result.data.role).toBe('member');
  });

  it('records role_changed against the acting owner, target in metadata', async () => {
    const { default: handler } =
      await import('../../../api/houses/[id]/members/[user_id].patch');
    await handler(mockEvent);
    expect(logSecurityEvent).toHaveBeenCalledWith('role_changed', {
      userId: 'u-owner',
      event: mockEvent,
      metadata: { target_user_id: 'u-target', house_id: 'h-1', role: 'member' },
    });
  });

  // 'owner' is deliberately unassignable: one owner per house, no transfer.
  it('throws 400 when trying to assign the owner role', async () => {
    readBodyMock.mockResolvedValue({ role: 'owner' });
    const { default: handler } =
      await import('../../../api/houses/[id]/members/[user_id].patch');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 when house ID is missing', async () => {
    getRouterParamMock.mockImplementation((_: unknown, param: string) =>
      param === 'id' ? undefined : 'u-target',
    );
    const { default: handler } =
      await import('../../../api/houses/[id]/members/[user_id].patch');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 when user_id is missing', async () => {
    getRouterParamMock.mockImplementation((_: unknown, param: string) =>
      param === 'id' ? 'h-1' : undefined,
    );
    const { default: handler } =
      await import('../../../api/houses/[id]/members/[user_id].patch');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 403 when the caller is not the house owner', async () => {
    const { ensureHouseOwner } =
      await import('~~/server/utils/repository-auth');
    vi.mocked(ensureHouseOwner).mockRejectedValueOnce(
      Object.assign(new Error('Forbidden'), { statusCode: 403 }),
    );
    const { default: handler } =
      await import('../../../api/houses/[id]/members/[user_id].patch');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 403 });
  });

  // The single owner cannot be demoted, not even by themselves via a crafted
  // request: without this the house could end up with no owner at all.
  it('throws 403 when the target is the house owner', async () => {
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        getMemberRole: vi
          .fn()
          .mockResolvedValue({ data: 'owner', error: null }),
        updateMemberRole: vi.fn(),
      },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } =
      await import('../../../api/houses/[id]/members/[user_id].patch');
    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('throws 400 when owner tries to change their own role', async () => {
    // targetUserId matches the authenticated user id ('u-owner')
    getRouterParamMock.mockImplementation((_: unknown, param: string) =>
      param === 'id' ? 'h-1' : 'u-owner',
    );
    const { default: handler } =
      await import('../../../api/houses/[id]/members/[user_id].patch');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 500 when repository fails', async () => {
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        getMemberRole: vi
          .fn()
          .mockResolvedValue({ data: 'member', error: null }),
        updateMemberRole: vi.fn().mockResolvedValue({
          data: null,
          error: 'Member not found',
        }),
      },
    } as unknown as ReturnType<typeof getRepositories>);
    const { default: handler } =
      await import('../../../api/houses/[id]/members/[user_id].patch');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });
});
