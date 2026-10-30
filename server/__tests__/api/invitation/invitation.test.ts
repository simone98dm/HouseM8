import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getRepositories } from '~~/server/repositories/factory';

vi.mock('~~/server/emails', () => ({
  sendHomeAcceptanceConfirmation: vi.fn().mockResolvedValue(undefined),
  sendNewTenantNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const getRouterParamMock = vi.fn();
vi.stubGlobal('getRouterParam', getRouterParamMock);
vi.stubGlobal(
  'createError',
  (params: {
    statusCode: number;
    message?: string;
    statusMessage?: string;
  }) => {
    const err = new Error(
      params.message ?? params.statusMessage ?? 'Error',
    ) as Error & { statusCode: number };
    err.statusCode = params.statusCode;
    return err;
  },
);
vi.stubGlobal('useRuntimeConfig', () => ({
  public: { baseUrl: 'http://localhost:3000' },
}));

vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi
    .fn()
    .mockResolvedValue({ userId: 'u-1', email: 'test@test.com', id: 'u-1' }),
}));

const futureDate = new Date(Date.now() + 86400000).toISOString();
const mockInvitation = {
  id: 'inv-1',
  house_id: 'h-1',
  expires_at: futureDate,
  used: false,
  invited_by: 'u-owner',
};
const mockHouse = { id: 'h-1', name: 'My House' };

describe('GET /api/invitation/[token]', () => {
  const mockEvent = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    getRouterParamMock.mockReturnValue('valid-token');
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        getInvitationByToken: vi
          .fn()
          .mockResolvedValue({ data: mockInvitation, error: null }),
        getById: vi.fn().mockResolvedValue({ data: mockHouse, error: null }),
        getCurrentForUser: vi
          .fn()
          .mockResolvedValue({ data: null, error: null }),
      },
    } as unknown as ReturnType<typeof getRepositories>);
  });

  it('returns invitation and house data for valid token', async () => {
    const { default: handler } =
      await import('../../../api/invitation/[token].get');
    const result = await handler(mockEvent);

    expect(result.data.house).toEqual(mockHouse);
    expect(result.data.invitation.id).toBe('inv-1');
  });

  it('throws 400 when token param is missing', async () => {
    getRouterParamMock.mockReturnValue(undefined);

    const { default: handler } =
      await import('../../../api/invitation/[token].get');

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 404 when invitation is not found', async () => {
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        getInvitationByToken: vi
          .fn()
          .mockResolvedValue({ data: null, error: 'Not found' }),
      },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } =
      await import('../../../api/invitation/[token].get');

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 410 when invitation is expired', async () => {
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        getInvitationByToken: vi.fn().mockResolvedValue({
          data: {
            ...mockInvitation,
            expires_at: new Date(Date.now() - 86400000).toISOString(),
          },
          error: null,
        }),
        getById: vi.fn().mockResolvedValue({ data: mockHouse, error: null }),
      },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } =
      await import('../../../api/invitation/[token].get');

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 410 });
  });

  it('throws 410 when invitation is already used', async () => {
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        getInvitationByToken: vi.fn().mockResolvedValue({
          data: { ...mockInvitation, used: true },
          error: null,
        }),
        getById: vi.fn().mockResolvedValue({ data: mockHouse, error: null }),
      },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } =
      await import('../../../api/invitation/[token].get');

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 410 });
  });

  it('returns user_in_house true when user belongs to a house', async () => {
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        getInvitationByToken: vi
          .fn()
          .mockResolvedValue({ data: mockInvitation, error: null }),
        getById: vi.fn().mockResolvedValue({ data: mockHouse, error: null }),
        getCurrentForUser: vi.fn().mockResolvedValue({
          data: { id: 'other-h', name: 'Other' },
          error: null,
        }),
      },
    } as unknown as ReturnType<typeof getRepositories>);
    const { default: handler } =
      await import('../../../api/invitation/[token].get');
    const result = await handler(mockEvent);
    expect(result.data.user_in_house).toBe(true);
  });

  it('returns user_in_house false when user has no house', async () => {
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        getInvitationByToken: vi
          .fn()
          .mockResolvedValue({ data: mockInvitation, error: null }),
        getById: vi.fn().mockResolvedValue({ data: mockHouse, error: null }),
        getCurrentForUser: vi
          .fn()
          .mockResolvedValue({ data: null, error: null }),
      },
    } as unknown as ReturnType<typeof getRepositories>);
    const { default: handler } =
      await import('../../../api/invitation/[token].get');
    const result = await handler(mockEvent);
    expect(result.data.user_in_house).toBe(false);
  });
});

describe('POST /api/invitation/[token]/accept', () => {
  const mockEvent = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    getRouterParamMock.mockReturnValue('valid-token');
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        getInvitationByToken: vi
          .fn()
          .mockResolvedValue({ data: mockInvitation, error: null }),
        isMember: vi.fn().mockResolvedValue(false),
        getCurrentForUser: vi
          .fn()
          .mockResolvedValue({ data: null, error: null }),
        acceptInvitation: vi
          .fn()
          .mockResolvedValue({ data: { house_id: 'h-1' }, error: null }),
        getById: vi.fn().mockResolvedValue({ data: mockHouse, error: null }),
        getMembers: vi.fn().mockResolvedValue({ data: [], error: null }),
      },
      users: {
        getById: vi.fn().mockResolvedValue({
          data: { email: 'a@b.com', first_name: 'A', last_name: 'B' },
          error: null,
        }),
      },
      referrals: {
        existsForPair: vi.fn().mockResolvedValue(false),
        createReward: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as ReturnType<typeof getRepositories>);
  });

  it('accepts invitation when user has no current house', async () => {
    const { default: handler } =
      await import('../../../api/invitation/[token]/accept.post');
    const result = await handler(mockEvent);
    expect(result.data.house_id).toBe('h-1');
  });

  it.each([
    ['HOUSE_FULL', 'This house is full'],
    ['duplicate key', 'already a member'],
  ])('maps %s from acceptInvitation to 409', async (error, message) => {
    const repos = vi.mocked(getRepositories)() as unknown as {
      houses: { acceptInvitation: ReturnType<typeof vi.fn> };
    };
    repos.houses.acceptInvitation.mockResolvedValue({ data: null, error });

    const { default: handler } =
      await import('../../../api/invitation/[token]/accept.post');
    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining(message),
    });
  });

  it('throws 409 when user already belongs to another house', async () => {
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        getInvitationByToken: vi
          .fn()
          .mockResolvedValue({ data: mockInvitation, error: null }),
        isMember: vi.fn().mockResolvedValue(false),
        getCurrentForUser: vi.fn().mockResolvedValue({
          data: { id: 'h-other', name: 'Other House' },
          error: null,
        }),
        acceptInvitation: vi.fn(),
        getById: vi.fn().mockResolvedValue({ data: mockHouse, error: null }),
        getMembers: vi.fn().mockResolvedValue({ data: [], error: null }),
      },
      users: { getById: vi.fn() },
      referrals: { existsForPair: vi.fn(), createReward: vi.fn() },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } =
      await import('../../../api/invitation/[token]/accept.post');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('throws 410 when invitation is already used', async () => {
    const repos = vi.mocked(getRepositories)();
    (
      repos.houses.getInvitationByToken as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      data: { ...mockInvitation, used: true },
      error: null,
    });
    const { default: handler } =
      await import('../../../api/invitation/[token]/accept.post');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 410 });
  });

  it('throws 409 when user is already a member of this house', async () => {
    const repos = vi.mocked(getRepositories)();
    (repos.houses.isMember as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const { default: handler } =
      await import('../../../api/invitation/[token]/accept.post');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('throws 400 when token param is missing', async () => {
    getRouterParamMock.mockReturnValue(undefined);
    const { default: handler } =
      await import('../../../api/invitation/[token]/accept.post');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 404 when invitation is not found', async () => {
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        getInvitationByToken: vi
          .fn()
          .mockResolvedValue({ data: null, error: 'Not found' }),
        isMember: vi.fn(),
        getCurrentForUser: vi.fn(),
        acceptInvitation: vi.fn(),
        getById: vi.fn(),
        getMembers: vi.fn(),
      },
      users: { getById: vi.fn() },
      referrals: { existsForPair: vi.fn(), createReward: vi.fn() },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } =
      await import('../../../api/invitation/[token]/accept.post');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 410 when invitation is expired', async () => {
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        getInvitationByToken: vi.fn().mockResolvedValue({
          data: {
            ...mockInvitation,
            expires_at: new Date(Date.now() - 86400000).toISOString(),
          },
          error: null,
        }),
        isMember: vi.fn(),
        getCurrentForUser: vi.fn(),
        acceptInvitation: vi.fn(),
        getById: vi.fn(),
        getMembers: vi.fn(),
      },
      users: { getById: vi.fn() },
      referrals: { existsForPair: vi.fn(), createReward: vi.fn() },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } =
      await import('../../../api/invitation/[token]/accept.post');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 410 });
  });

  it('throws 500 when acceptInvitation fails', async () => {
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        getInvitationByToken: vi
          .fn()
          .mockResolvedValue({ data: mockInvitation, error: null }),
        isMember: vi.fn().mockResolvedValue(false),
        getCurrentForUser: vi
          .fn()
          .mockResolvedValue({ data: null, error: null }),
        acceptInvitation: vi
          .fn()
          .mockResolvedValue({ data: null, error: 'DB error' }),
        getById: vi.fn(),
        getMembers: vi.fn(),
      },
      users: { getById: vi.fn() },
      referrals: { existsForPair: vi.fn(), createReward: vi.fn() },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } =
      await import('../../../api/invitation/[token]/accept.post');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it('skips referral when inviterId equals userId', async () => {
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        getInvitationByToken: vi.fn().mockResolvedValue({
          data: { ...mockInvitation, invited_by: 'u-1' },
          error: null,
        }),
        isMember: vi.fn().mockResolvedValue(false),
        getCurrentForUser: vi
          .fn()
          .mockResolvedValue({ data: null, error: null }),
        acceptInvitation: vi
          .fn()
          .mockResolvedValue({ data: { house_id: 'h-1' }, error: null }),
        getById: vi.fn().mockResolvedValue({ data: null, error: null }),
        getMembers: vi.fn().mockResolvedValue({ data: [], error: null }),
      },
      users: {
        getById: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
      referrals: { existsForPair: vi.fn(), createReward: vi.fn() },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } =
      await import('../../../api/invitation/[token]/accept.post');
    const result = await handler(mockEvent);
    expect(result.data.house_id).toBe('h-1');
  });

  it('skips reward creation when already rewarded', async () => {
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        getInvitationByToken: vi
          .fn()
          .mockResolvedValue({ data: mockInvitation, error: null }),
        isMember: vi.fn().mockResolvedValue(false),
        getCurrentForUser: vi
          .fn()
          .mockResolvedValue({ data: null, error: null }),
        acceptInvitation: vi
          .fn()
          .mockResolvedValue({ data: { house_id: 'h-1' }, error: null }),
        getById: vi.fn().mockResolvedValue({ data: null, error: null }),
        getMembers: vi.fn().mockResolvedValue({ data: [], error: null }),
      },
      users: {
        getById: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
      referrals: {
        existsForPair: vi.fn().mockResolvedValue(true),
        createReward: vi.fn(),
      },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } =
      await import('../../../api/invitation/[token]/accept.post');
    const result = await handler(mockEvent);
    const repos = vi.mocked(getRepositories)();
    expect(repos.referrals.createReward).not.toHaveBeenCalled();
    expect(result.data.house_id).toBe('h-1');
  });

  it('sends notifications to existing members', async () => {
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        getInvitationByToken: vi
          .fn()
          .mockResolvedValue({ data: mockInvitation, error: null }),
        isMember: vi.fn().mockResolvedValue(false),
        getCurrentForUser: vi
          .fn()
          .mockResolvedValue({ data: null, error: null }),
        acceptInvitation: vi
          .fn()
          .mockResolvedValue({ data: { house_id: 'h-1' }, error: null }),
        getById: vi.fn().mockResolvedValue({ data: mockHouse, error: null }),
        getMembers: vi.fn().mockResolvedValue({
          data: [
            {
              user_id: 'u-other',
              user: { email: 'other@example.com', first_name: 'Other' },
            },
          ],
          error: null,
        }),
      },
      users: {
        getById: vi.fn().mockResolvedValue({
          data: {
            email: 'u1@example.com',
            first_name: 'User',
            last_name: 'One',
          },
          error: null,
        }),
      },
      referrals: {
        existsForPair: vi.fn().mockResolvedValue(false),
        createReward: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } =
      await import('../../../api/invitation/[token]/accept.post');
    const result = await handler(mockEvent);
    expect(result.data.house_id).toBe('h-1');
  });
});
