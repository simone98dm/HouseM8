import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getRepositories } from '~~/server/repositories/factory';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const getRouterParamMock = vi.fn();
vi.stubGlobal('getRouterParam', getRouterParamMock);
vi.stubGlobal(
  'createError',
  (params: { statusCode: number; statusMessage?: string }) => {
    const err = new Error(params.statusMessage ?? 'Error') as Error & {
      statusCode: number;
    };
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
  ensureHouseMember: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('~~/server/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

const mockBalance = {
  house_id: 'h-1',
  user_balances: [
    {
      user_id: 'u-1',
      user: {
        id: 'u-1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'j@d.com',
      },
      total_owed_to_user: 50,
      total_owed: 30,
      net_balance: 20,
    },
  ],
  user_to_user_balances: [],
  total_expenses: 100,
};

describe('GET /api/balance/[house_id]', () => {
  const mockEvent = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    getRouterParamMock.mockReturnValue('h-1');
    vi.mocked(getRepositories).mockReturnValue({
      balance: {
        getHouseBalance: vi
          .fn()
          .mockResolvedValue({ data: mockBalance, error: null }),
      },
      houses: {
        getById: vi.fn().mockResolvedValue({
          data: { id: 'h-1', currency: 'EUR' },
          error: null,
        }),
      },
    } as unknown as ReturnType<typeof getRepositories>);
  });

  it('returns transformed balance data', async () => {
    const { default: handler } =
      await import('../../../api/balance/[house_id].get');
    const result = await handler(mockEvent);

    expect(result.data).toMatchObject({
      house_id: 'h-1',
      currency: 'EUR',
      total_expenses: 100,
    });
    expect(result.data.user_balances).toHaveLength(1);
  });

  it('never returns housemate email', async () => {
    const { default: handler } =
      await import('../../../api/balance/[house_id].get');
    const result = await handler(mockEvent);
    expect(JSON.stringify(result)).not.toContain('j@d.com');
  });

  it('throws 400 when house_id param is missing', async () => {
    getRouterParamMock.mockReturnValue(undefined);

    const { default: handler } =
      await import('../../../api/balance/[house_id].get');

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 500 when repository returns error', async () => {
    vi.mocked(getRepositories).mockReturnValue({
      balance: {
        getHouseBalance: vi
          .fn()
          .mockResolvedValue({ data: null, error: 'DB error' }),
      },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } =
      await import('../../../api/balance/[house_id].get');

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it('throws 404 when balance data is null', async () => {
    vi.mocked(getRepositories).mockReturnValue({
      balance: {
        getHouseBalance: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } =
      await import('../../../api/balance/[house_id].get');

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('falls back to USD when house has no currency', async () => {
    vi.mocked(getRepositories).mockReturnValue({
      balance: {
        getHouseBalance: vi
          .fn()
          .mockResolvedValue({ data: mockBalance, error: null }),
      },
      houses: {
        getById: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } =
      await import('../../../api/balance/[house_id].get');
    const result = await handler(mockEvent);
    expect(result.data.currency).toBe('USD');
  });

  it('maps user_to_user_balances with from_user and to_user', async () => {
    const balanceWithTransactions = {
      ...mockBalance,
      user_to_user_balances: [
        {
          from_user_id: 'u-1',
          to_user_id: 'u-2',
          amount: 25,
          from_user: { id: 'u-1', first_name: 'John' },
          to_user: { id: 'u-2', first_name: 'Jane' },
        },
        {
          from_user_id: 'u-3',
          to_user_id: 'u-4',
          amount: 10,
          from_user: null,
          to_user: null,
        },
      ],
    };
    vi.mocked(getRepositories).mockReturnValue({
      balance: {
        getHouseBalance: vi
          .fn()
          .mockResolvedValue({ data: balanceWithTransactions, error: null }),
      },
      houses: {
        getById: vi.fn().mockResolvedValue({
          data: { id: 'h-1', currency: 'EUR' },
          error: null,
        }),
      },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } =
      await import('../../../api/balance/[house_id].get');
    const result = await handler(mockEvent);
    expect(result.data.settlement_transactions).toHaveLength(2);
    expect(result.data.settlement_transactions[0].from_user?.first_name).toBe(
      'John',
    );
    expect(result.data.settlement_transactions[1].from_user).toBeUndefined();
  });

  it('maps user_balances with null user', async () => {
    const balanceWithNullUser = {
      ...mockBalance,
      user_balances: [
        {
          user_id: 'u-2',
          user: null,
          total_owed_to_user: 0,
          total_owed: 0,
          net_balance: 0,
        },
      ],
    };
    vi.mocked(getRepositories).mockReturnValue({
      balance: {
        getHouseBalance: vi
          .fn()
          .mockResolvedValue({ data: balanceWithNullUser, error: null }),
      },
      houses: {
        getById: vi.fn().mockResolvedValue({
          data: { id: 'h-1', currency: 'EUR' },
          error: null,
        }),
      },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } =
      await import('../../../api/balance/[house_id].get');
    const result = await handler(mockEvent);
    expect(result.data.user_balances[0].user).toBeUndefined();
  });
});
