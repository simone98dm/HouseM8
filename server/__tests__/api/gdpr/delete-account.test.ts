import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';
import { cancelSubscriptionForErasure } from '~~/server/utils/stripe-erasure';
import { logSecurityEvent } from '~~/server/utils/security-events';
import { sendAccountDeletionRequestedEmail } from '~~/server/emails/index';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const readValidatedBodyMock = vi.fn().mockResolvedValue({ confirm: true });
vi.stubGlobal('readValidatedBody', readValidatedBodyMock);
vi.stubGlobal('createError', (o: object) =>
  Object.assign(new Error((o as { statusMessage: string }).statusMessage), o),
);
vi.stubGlobal('useRuntimeConfig', () => ({
  public: { baseUrl: 'http://localhost:3000' },
}));

vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi.fn().mockResolvedValue({ id: 'u-1', email: 'a@b.com' }),
}));
vi.mock('~~/server/utils/stripe-erasure', () => ({
  cancelSubscriptionForErasure: vi.fn().mockResolvedValue(true),
}));
vi.mock('~~/server/utils/security-events', () => ({
  logSecurityEvent: vi.fn(),
}));
vi.mock('~~/server/emails/index', () => ({
  sendAccountDeletionRequestedEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('POST /api/gdpr/delete-account', () => {
  const mockEvent = {} as Parameters<
    typeof import('../../../api/gdpr/delete-account.post').default
  >[0];

  let softDeleteUser: ReturnType<typeof vi.fn>;
  const mockRepos = (blocking: unknown[] = []) => {
    softDeleteUser = vi.fn().mockResolvedValue({
      scheduledFor: new Date('2026-09-11T00:00:00Z'),
      cancelToken: 'cancel-token-abc',
    });
    vi.mocked(getRepositories).mockReturnValue({
      gdpr: {
        getOwnedHousesBlockingDeletion: vi.fn().mockResolvedValue(blocking),
        softDeleteUser,
      },
      users: {
        getById: vi
          .fn()
          .mockResolvedValue({ data: { first_name: 'Jane' }, error: null }),
      },
    } as unknown as ReturnType<typeof getRepositories>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    readValidatedBodyMock.mockResolvedValue({ confirm: true });
    mockRepos();
  });

  it('emails a cancel link that includes the real cancel_token', async () => {
    const { default: handler } =
      await import('../../../api/gdpr/delete-account.post');
    await handler(mockEvent);

    expect(sendAccountDeletionRequestedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        cancelLink:
          'http://localhost:3000/settings/privacy?cancel_token=cancel-token-abc',
      }),
    );
  });

  it('returns the scheduled deletion date without signing the user out', async () => {
    const { default: handler } =
      await import('../../../api/gdpr/delete-account.post');
    const result = await handler(mockEvent);

    expect(result).toEqual({
      message: 'Account deletion scheduled.',
      scheduled_for: '2026-09-11T00:00:00.000Z',
    });
  });

  it('cancels the Stripe subscription and logs deletion_requested', async () => {
    const { default: handler } =
      await import('../../../api/gdpr/delete-account.post');
    await handler(mockEvent);

    expect(cancelSubscriptionForErasure).toHaveBeenCalledWith('u-1');
    expect(softDeleteUser).toHaveBeenCalledWith('u-1', true);
    expect(logSecurityEvent).toHaveBeenCalledWith('deletion_requested', {
      userId: 'u-1',
      event: mockEvent,
    });
  });

  it('409 OWNER_MUST_TRANSFER with the houses when the owner still has co-members', async () => {
    mockRepos([{ id: 'h-1', name: 'Casa' }]);
    const { default: handler } =
      await import('../../../api/gdpr/delete-account.post');

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'OWNER_MUST_TRANSFER',
      data: { houses: [{ id: 'h-1', name: 'Casa' }] },
    });
    expect(softDeleteUser).not.toHaveBeenCalled();
    expect(cancelSubscriptionForErasure).not.toHaveBeenCalled();
  });

  it('502 and no deletion when Stripe cancellation fails', async () => {
    vi.mocked(cancelSubscriptionForErasure).mockRejectedValueOnce(
      new Error('stripe down'),
    );
    const { default: handler } =
      await import('../../../api/gdpr/delete-account.post');

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 502,
      statusMessage: 'BILLING_CANCEL_FAILED',
    });
    expect(softDeleteUser).not.toHaveBeenCalled();
  });
});
