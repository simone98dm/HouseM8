import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const readBodyMock = vi.fn<() => Promise<unknown>>();
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
vi.stubGlobal(
  'readValidatedBody',
  async (_e: unknown, validator: (b: unknown) => unknown) =>
    validator(await readBodyMock()),
);

vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi.fn().mockResolvedValue({ id: 'u-1', email: 'u@b.com' }),
}));

const future = () => new Date(Date.now() + 3_600_000).toISOString();
const past = () => new Date(Date.now() - 3_600_000).toISOString();

describe('POST /api/invitation/redeem', () => {
  const houses = {
    isRedeemBlocked: vi.fn(),
    registerFailedRedeemAttempt: vi.fn(),
    registerFailedCodeAttempt: vi.fn(),
    getInvitationByCode: vi.fn(),
    isMember: vi.fn(),
    getCurrentForUser: vi.fn(),
    redeemInviteCode: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    readBodyMock.mockResolvedValue({ code: '123456' });
    houses.isRedeemBlocked.mockResolvedValue(false);
    houses.isMember.mockResolvedValue(false);
    houses.getCurrentForUser.mockResolvedValue({ data: null, error: null });
    houses.getInvitationByCode.mockResolvedValue({
      data: {
        house_id: 'h-1',
        code_expires_at: future(),
        code_used_at: null,
        code_locked_until: null,
      },
      error: null,
    });
    houses.redeemInviteCode.mockResolvedValue({ data: {}, error: null });
    vi.mocked(getRepositories).mockReturnValue({
      houses,
    } as unknown as ReturnType<typeof getRepositories>);
  });

  const call = async () => {
    const { default: handler } =
      await import('../../../api/invitation/redeem.post');
    return handler({} as never) as Promise<{ data: { house_id: string } }>;
  };

  it('answers 429 without touching the code when the user is blocked', async () => {
    houses.isRedeemBlocked.mockResolvedValue(true);

    await expect(call()).rejects.toMatchObject({ statusCode: 429 });
    expect(houses.getInvitationByCode).not.toHaveBeenCalled();
  });

  it('counts an unknown code as a failed attempt', async () => {
    houses.getInvitationByCode.mockResolvedValue({
      data: null,
      error: 'Invitation not found',
    });

    await expect(call()).rejects.toMatchObject({ statusCode: 404 });
    expect(houses.registerFailedRedeemAttempt).toHaveBeenCalledWith('u-1');
  });

  it('counts used, expired and locked codes as failed attempts', async () => {
    const rows = [
      { code_used_at: past(), code_expires_at: future() },
      { code_used_at: null, code_expires_at: past() },
      { code_locked_until: future(), code_expires_at: future() },
    ];
    for (const row of rows) {
      houses.registerFailedRedeemAttempt.mockClear();
      houses.getInvitationByCode.mockResolvedValue({
        data: { house_id: 'h-1', ...row },
        error: null,
      });
      await expect(call()).rejects.toBeDefined();
      expect(houses.registerFailedRedeemAttempt).toHaveBeenCalledTimes(1);
    }
  });

  it('does not count a successful redemption', async () => {
    const result = await call();

    expect(result.data.house_id).toBe('h-1');
    expect(houses.registerFailedRedeemAttempt).not.toHaveBeenCalled();
  });

  it('maps HOUSE_FULL to 409', async () => {
    houses.redeemInviteCode.mockResolvedValue({
      data: null,
      error: 'HOUSE_FULL',
    });

    await expect(call()).rejects.toMatchObject({ statusCode: 409 });
    expect(houses.registerFailedRedeemAttempt).not.toHaveBeenCalled();
  });

  it('maps a unique-violation (already in a house) to 409, not 500', async () => {
    houses.redeemInviteCode.mockResolvedValue({
      data: null,
      error: 'duplicate key',
    });

    await expect(call()).rejects.toMatchObject({ statusCode: 409 });
  });
});
