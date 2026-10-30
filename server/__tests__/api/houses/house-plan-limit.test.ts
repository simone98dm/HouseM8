import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';
import { getUserPlan } from '~~/server/utils/plan-enforcement';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const readBodyMock = vi.fn<() => Promise<unknown>>();
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

vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi.fn().mockResolvedValue({ id: 'u-1', email: 'a@b.com' }),
}));
vi.mock('~~/server/utils/plan-enforcement', async () => {
  const actual = await vi.importActual<
    typeof import('~~/server/utils/plan-enforcement')
  >('~~/server/utils/plan-enforcement');
  return { ...actual, getUserPlan: vi.fn() };
});

/**
 * The plan allowance is per user and pays for houses you CREATE. It used to be
 * checked against `getHousesForUser`, which counts membership — so a free user
 * who accepted an invite to a flatmate's house was locked out of creating their
 * own. These tests pin the distinction.
 */
describe('POST /api/houses — plan house limit', () => {
  const mockEvent = {} as never;
  const countOwnedHouses = vi.fn();
  const getHousesForUser = vi.fn();
  const create = vi.fn();

  const importHandler = async () =>
    (await import('../../../api/houses/index.post')).default;

  beforeEach(() => {
    vi.clearAllMocks();
    readBodyMock.mockResolvedValue({ name: 'My House' });
    vi.mocked(getUserPlan).mockResolvedValue('free');
    create.mockResolvedValue({
      data: { id: 'h-1', name: 'My House' },
      error: null,
    });
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        countOwnedHouses,
        getHousesForUser,
        create,
      },
    } as unknown as ReturnType<typeof getRepositories>);
  });

  it('lets a free user create their first house', async () => {
    countOwnedHouses.mockResolvedValue({ data: 0, error: null });

    const handler = await importHandler();
    await expect(handler(mockEvent)).resolves.toBeDefined();
    expect(create).toHaveBeenCalled();
  });

  it('rejects a second house on the free plan', async () => {
    countOwnedHouses.mockResolvedValue({ data: 1, error: null });

    const handler = await importHandler();
    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(create).not.toHaveBeenCalled();
  });

  // The regression this file exists for.
  it('does not count houses the user merely joined', async () => {
    countOwnedHouses.mockResolvedValue({ data: 0, error: null });
    getHousesForUser.mockResolvedValue({
      data: [{ id: 'someone-elses-house' }],
      error: null,
    });

    const handler = await importHandler();
    await expect(handler(mockEvent)).resolves.toBeDefined();
    expect(getHousesForUser).not.toHaveBeenCalled();
  });

  it('allows up to three owned houses on pro', async () => {
    vi.mocked(getUserPlan).mockResolvedValue('pro');
    countOwnedHouses.mockResolvedValue({ data: 2, error: null });

    const handler = await importHandler();
    await expect(handler(mockEvent)).resolves.toBeDefined();
  });

  it('rejects a fourth house on pro', async () => {
    vi.mocked(getUserPlan).mockResolvedValue('pro');
    countOwnedHouses.mockResolvedValue({ data: 3, error: null });

    const handler = await importHandler();
    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
