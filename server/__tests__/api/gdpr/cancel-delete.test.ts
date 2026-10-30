import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';

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

vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
const resumeMock = vi.fn();
vi.mock('~~/server/utils/stripe-erasure', () => ({
  resumeSubscriptionAfterCancelledErasure: (...a: unknown[]) =>
    resumeMock(...a),
}));
vi.mock('~~/server/utils/security-events', () => ({
  logSecurityEvent: vi.fn(),
}));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi.fn().mockResolvedValue({ id: 'u-1', email: 'a@b.com' }),
}));

describe('POST /api/gdpr/cancel-delete', () => {
  const mockEvent = {} as Parameters<
    typeof import('../../../api/gdpr/cancel-delete.post').default
  >[0];

  let cancelDeletion: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    cancelDeletion = vi.fn().mockResolvedValue({
      restoredHouseIds: [],
      stripeCancelScheduled: false,
    });
    resumeMock.mockReset();
    vi.mocked(getRepositories).mockReturnValue({
      gdpr: { cancelDeletion },
    } as unknown as ReturnType<typeof getRepositories>);
  });

  it('cancels using the emailed token, scoped to the authenticated user', async () => {
    readValidatedBodyMock.mockResolvedValue({ token: 'tok-123' });
    const { default: handler } =
      await import('../../../api/gdpr/cancel-delete.post');
    const result = await handler(mockEvent);

    expect(cancelDeletion).toHaveBeenCalledWith('tok-123', 'u-1');
    expect(result).toEqual({
      message: 'Account deletion cancelled successfully.',
      data: { restored_house_ids: [], subscription_restored: null },
    });
    expect(resumeMock).not.toHaveBeenCalled();
  });

  it('resumes Stripe and reports restored houses when the request had scheduled a cancel', async () => {
    readValidatedBodyMock.mockResolvedValue({ token: '' });
    cancelDeletion.mockResolvedValue({
      restoredHouseIds: ['h-1'],
      stripeCancelScheduled: true,
    });
    resumeMock.mockResolvedValue(true);
    const { default: handler } =
      await import('../../../api/gdpr/cancel-delete.post');

    const result = await handler(mockEvent);

    expect(resumeMock).toHaveBeenCalledWith('u-1');
    expect(result.data).toEqual({
      restored_house_ids: ['h-1'],
      subscription_restored: true,
    });
  });

  it('reports subscription_restored false when the subscription already ended', async () => {
    readValidatedBodyMock.mockResolvedValue({ token: '' });
    cancelDeletion.mockResolvedValue({
      restoredHouseIds: [],
      stripeCancelScheduled: true,
    });
    resumeMock.mockResolvedValue(false);
    const { default: handler } =
      await import('../../../api/gdpr/cancel-delete.post');

    expect((await handler(mockEvent)).data.subscription_restored).toBe(false);
  });

  it('keeps the cancellation and returns subscription_restored false when Stripe fails', async () => {
    readValidatedBodyMock.mockResolvedValue({ token: '' });
    cancelDeletion.mockResolvedValue({
      restoredHouseIds: [],
      stripeCancelScheduled: true,
    });
    resumeMock.mockRejectedValue(new Error('stripe down'));
    const { default: handler } =
      await import('../../../api/gdpr/cancel-delete.post');

    const result = await handler(mockEvent);

    expect(result.data.subscription_restored).toBe(false);
  });

  it('falls back to an empty token (in-app button sends no token) scoped by userId', async () => {
    // Exercise the real Zod schema (imported by the handler) instead of a
    // canned mock value, so the `token` default actually applies.
    readValidatedBodyMock.mockImplementation(
      (_event: unknown, validator: (body: unknown) => unknown) => validator({}),
    );
    const { default: handler } =
      await import('../../../api/gdpr/cancel-delete.post');
    await handler(mockEvent);

    expect(cancelDeletion).toHaveBeenCalledWith('', 'u-1');
  });

  it('throws 404 when the repository reports no pending deletion / ownership mismatch', async () => {
    readValidatedBodyMock.mockResolvedValue({ token: 'someone-elses-token' });
    cancelDeletion.mockResolvedValue(null);
    const { default: handler } =
      await import('../../../api/gdpr/cancel-delete.post');

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
