import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';
import { transferHouseOwnership } from '~~/server/utils/house-ownership';

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
  ensureHouseMember: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('~~/server/emails', () => ({
  sendLeavingHomeConfirmation: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('~~/server/utils/house-ownership', () => ({
  transferHouseOwnership: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('~~/server/utils/email', () => ({
  getBaseUrl: vi.fn().mockReturnValue('http://localhost:3000'),
}));

const makeRepos = (overrides: Record<string, unknown> = {}) =>
  ({
    houses: {
      isOwner: vi.fn().mockResolvedValue(false),
      getMembers: vi
        .fn()
        .mockResolvedValue({ data: [{ user_id: 'u-2' }], error: null }),
      removeMember: vi.fn().mockResolvedValue({ data: null, error: null }),
      archiveHouse: vi.fn().mockResolvedValue({ data: null, error: null }),
      getById: vi.fn().mockResolvedValue({
        data: { id: 'h-1', name: 'Test House' },
        error: null,
      }),
    },
    users: {
      getById: vi.fn().mockResolvedValue({
        data: { email: 'a@b.com', first_name: 'A', last_name: 'B' },
        error: null,
      }),
    },
    balance: {
      getUserBalance: vi
        .fn()
        .mockResolvedValue({ data: { net_balance: 0 }, error: null }),
    },
    ...overrides,
  }) as unknown as ReturnType<typeof getRepositories>;

describe('POST /api/houses/[id]/leave', () => {
  const mockEvent = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    getRouterParamMock.mockReturnValue('h-1');
    readBodyMock.mockResolvedValue(undefined);
  });

  it('leaves house successfully when balance is zero and not owner', async () => {
    vi.mocked(getRepositories).mockReturnValue(makeRepos());
    const { default: handler } =
      await import('../../../api/houses/[id]/leave.post');
    const result = await handler(mockEvent);
    expect(result.data.message).toBe('Successfully left house');
  });

  it('throws 409 when user has non-zero balance', async () => {
    vi.mocked(getRepositories).mockReturnValue(
      makeRepos({
        balance: {
          getUserBalance: vi
            .fn()
            .mockResolvedValue({ data: { net_balance: -15.5 }, error: null }),
        },
      }),
    );
    const { default: handler } =
      await import('../../../api/houses/[id]/leave.post');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 409 });
  });

  const NEW_OWNER = '7d1f9b1e-3c2a-4f5e-9a8b-1c2d3e4f5a6b';

  it('transfers ownership and leaves when the owner names a successor', async () => {
    const repos = makeRepos();
    (repos.houses.isOwner as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    vi.mocked(getRepositories).mockReturnValue(repos);
    readBodyMock.mockResolvedValue({ new_owner_id: NEW_OWNER });
    const { default: handler } =
      await import('../../../api/houses/[id]/leave.post');

    const result = await handler(mockEvent);

    expect(transferHouseOwnership).toHaveBeenCalledWith(
      'h-1',
      'u-1',
      NEW_OWNER,
    );
    expect(repos.houses.removeMember).toHaveBeenCalledWith('h-1', 'u-1');
    expect(result.data.message).toBe('Successfully left house');
  });

  it('does not transfer ownership when the owner has a pending balance', async () => {
    const repos = makeRepos({
      balance: {
        getUserBalance: vi
          .fn()
          .mockResolvedValue({ data: { net_balance: -5 }, error: null }),
      },
    });
    (repos.houses.isOwner as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    vi.mocked(getRepositories).mockReturnValue(repos);
    readBodyMock.mockResolvedValue({ new_owner_id: NEW_OWNER });
    const { default: handler } =
      await import('../../../api/houses/[id]/leave.post');

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 409 });
    expect(transferHouseOwnership).not.toHaveBeenCalled();
  });

  it('throws 403 when the owner leaves without naming a successor', async () => {
    const repos = makeRepos();
    (repos.houses.isOwner as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    vi.mocked(getRepositories).mockReturnValue(repos);
    const { default: handler } =
      await import('../../../api/houses/[id]/leave.post');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('archives house when last member leaves', async () => {
    const archiveHouse = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(getRepositories).mockReturnValue(
      makeRepos({
        houses: {
          isOwner: vi.fn().mockResolvedValue(false),
          getMembers: vi.fn().mockResolvedValue({ data: [], error: null }),
          removeMember: vi.fn().mockResolvedValue({ data: null, error: null }),
          archiveHouse,
          getById: vi.fn().mockResolvedValue({
            data: { id: 'h-1', name: 'Test House' },
            error: null,
          }),
        },
      }),
    );
    const { default: handler } =
      await import('../../../api/houses/[id]/leave.post');
    await handler(mockEvent);
    expect(archiveHouse).toHaveBeenCalledWith('h-1');
  });

  it('throws 400 when house ID is missing', async () => {
    getRouterParamMock.mockReturnValue(undefined);
    vi.mocked(getRepositories).mockReturnValue(makeRepos());
    const { default: handler } =
      await import('../../../api/houses/[id]/leave.post');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 500 when balance check fails', async () => {
    vi.mocked(getRepositories).mockReturnValue(
      makeRepos({
        balance: {
          getUserBalance: vi
            .fn()
            .mockResolvedValue({ data: null, error: 'DB error' }),
        },
      }),
    );
    const { default: handler } =
      await import('../../../api/houses/[id]/leave.post');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it('throws 500 when removeMember returns error', async () => {
    vi.mocked(getRepositories).mockReturnValue(
      makeRepos({
        houses: {
          isOwner: vi.fn().mockResolvedValue(false),
          removeMember: vi
            .fn()
            .mockResolvedValue({ data: null, error: 'Remove failed' }),
          getMembers: vi.fn(),
          archiveHouse: vi.fn(),
          getById: vi.fn(),
        },
      }),
    );
    const { default: handler } =
      await import('../../../api/houses/[id]/leave.post');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it('throws 500 when archiveHouse fails', async () => {
    vi.mocked(getRepositories).mockReturnValue(
      makeRepos({
        houses: {
          isOwner: vi.fn().mockResolvedValue(false),
          getMembers: vi.fn().mockResolvedValue({ data: [], error: null }),
          removeMember: vi.fn().mockResolvedValue({ data: null, error: null }),
          archiveHouse: vi
            .fn()
            .mockResolvedValue({ data: null, error: 'Archive failed' }),
          getById: vi.fn(),
        },
      }),
    );
    const { default: handler } =
      await import('../../../api/houses/[id]/leave.post');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it('skips email when house or user not found', async () => {
    const repos = makeRepos();
    (repos.houses.getById as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: null,
    });
    vi.mocked(getRepositories).mockReturnValue(repos);
    const { default: handler } =
      await import('../../../api/houses/[id]/leave.post');
    const result = await handler(mockEvent);
    expect(result.data.message).toBe('Successfully left house');
  });
});
