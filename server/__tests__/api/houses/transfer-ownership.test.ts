import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';
import { ensureHouseOwner } from '~~/server/utils/repository-auth';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const getRouterParamMock = vi.fn();
vi.stubGlobal('getRouterParam', getRouterParamMock);
const readBodyMock = vi.fn<() => Promise<unknown>>();
vi.stubGlobal(
  'readValidatedBody',
  async (_event: unknown, validator: (body: unknown) => unknown) =>
    validator(await readBodyMock()),
);
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

vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi.fn().mockResolvedValue({ id: 'u-1', email: 'a@b.com' }),
  ensureHouseOwner: vi.fn().mockResolvedValue(undefined),
}));

const OWNER = 'u-1';
const TARGET = '7d1f9b1e-3c2a-4f5e-9a8b-1c2d3e4f5a6b';

const mockTransfer = (error: string | null) => {
  const transferOwnership = vi.fn().mockResolvedValue({ data: null, error });
  vi.mocked(getRepositories).mockReturnValue({
    houses: { transferOwnership },
  } as unknown as ReturnType<typeof getRepositories>);
  return transferOwnership;
};

const run = async () => {
  const { default: handler } =
    await import('../../../api/houses/[id]/transfer-ownership.post');
  return handler({} as never);
};

describe('POST /api/houses/[id]/transfer-ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRouterParamMock.mockReturnValue('h-1');
    readBodyMock.mockResolvedValue({ user_id: TARGET });
  });

  it('transfers ownership from the caller to the target member', async () => {
    const transfer = mockTransfer(null);

    const result = await run();

    expect(ensureHouseOwner).toHaveBeenCalledWith('h-1', OWNER);
    expect(transfer).toHaveBeenCalledWith('h-1', OWNER, TARGET);
    expect(result.data.message).toBe('Ownership transferred');
  });

  it('rejects callers who are not the owner', async () => {
    const transfer = mockTransfer(null);
    vi.mocked(ensureHouseOwner).mockRejectedValueOnce(
      Object.assign(new Error('Forbidden'), { statusCode: 403 }),
    );

    await expect(run()).rejects.toMatchObject({ statusCode: 403 });
    expect(transfer).not.toHaveBeenCalled();
  });

  it('rejects a body without a valid user id', async () => {
    mockTransfer(null);
    readBodyMock.mockResolvedValue({ user_id: 'not-a-uuid' });

    await expect(run()).rejects.toThrow();
  });

  it('returns 404 when the target is not an active member', async () => {
    mockTransfer('MEMBER_NOT_FOUND');

    await expect(run()).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns 403 when the caller lost ownership concurrently', async () => {
    mockTransfer('NOT_OWNER');

    await expect(run()).rejects.toMatchObject({ statusCode: 403 });
  });
});
