import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';
import { ensureHouseMember } from '~~/server/utils/repository-auth';
import { logSecurityEvent } from '~~/server/utils/security-events';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
vi.stubGlobal(
  'getRouterParam',
  vi.fn(() => 'h-1'),
);
const readBodyMock = vi.fn<() => Promise<unknown>>();
vi.stubGlobal(
  'readValidatedBody',
  async (_e: unknown, validator: (body: unknown) => unknown) =>
    validator(await readBodyMock()),
);
vi.stubGlobal(
  'createError',
  (p: { statusCode: number; statusMessage?: string }) =>
    Object.assign(new Error(p.statusMessage ?? 'Error'), {
      statusCode: p.statusCode,
    }),
);

vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/security-events', () => ({
  logSecurityEvent: vi.fn(),
}));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi
    .fn()
    .mockResolvedValue({ id: '7d1f9b1e-3c2a-4f5e-9a8b-1c2d3e4f5a6b' }),
  ensureHouseMember: vi.fn().mockResolvedValue(undefined),
}));

const ME = '7d1f9b1e-3c2a-4f5e-9a8b-1c2d3e4f5a6b';
const OTHER = '9c2e1d0f-4b3a-4e6d-8a7c-2d3e4f5a6b7c';

const mockSettle = (data: unknown, error: string | null = null) => {
  const recordSettlement = vi.fn().mockResolvedValue({ data, error });
  vi.mocked(getRepositories).mockReturnValue({
    expenses: { recordSettlement },
  } as unknown as ReturnType<typeof getRepositories>);
  return recordSettlement;
};

const run = async () => {
  const { default: handler } =
    await import('../../../api/houses/[id]/settle.post');
  return handler({} as never);
};

describe('POST /api/houses/[id]/settle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readBodyMock.mockResolvedValue({ from_user_id: ME, to_user_id: OTHER });
  });

  it('records the plan amount (not a client one) and logs the event', async () => {
    readBodyMock.mockResolvedValue({
      from_user_id: ME,
      to_user_id: OTHER,
      amount: 9999,
    });
    const settle = mockSettle({
      settlementId: 'set-1',
      allocatedCount: 2,
      amount: 15.3,
    });

    const result = await run();

    expect(ensureHouseMember).toHaveBeenCalledWith('h-1', ME);
    expect(settle).toHaveBeenCalledWith('h-1', ME, OTHER, ME);
    expect(result).toEqual({ data: { settlement_id: 'set-1', amount: 15.3 } });
    expect(logSecurityEvent).toHaveBeenCalledWith(
      'settlement_recorded',
      expect.objectContaining({
        userId: ME,
        metadata: { house_id: 'h-1', settlement_id: 'set-1' },
      }),
    );
  });

  it('409 NOT_IN_PLAN when the repository finds the pair is no longer in the plan', async () => {
    mockSettle(null, 'NOT_IN_PLAN');

    await expect(run()).rejects.toMatchObject({
      statusCode: 409,
      data: { code: 'NOT_IN_PLAN' },
    });
    expect(logSecurityEvent).not.toHaveBeenCalled();
  });

  it('refuses a third party', async () => {
    const settle = mockSettle(null);
    readBodyMock.mockResolvedValue({
      from_user_id: OTHER,
      to_user_id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
    });

    await expect(run()).rejects.toMatchObject({ statusCode: 403 });
    expect(settle).not.toHaveBeenCalled();
  });

  it('rejects non-uuid ids', async () => {
    mockSettle(null);
    readBodyMock.mockResolvedValue({ from_user_id: 'x', to_user_id: OTHER });
    await expect(run()).rejects.toThrow();
  });

  it('turns a repository failure into a 500', async () => {
    mockSettle(null, 'Database error');
    await expect(run()).rejects.toMatchObject({ statusCode: 500 });
  });
});
