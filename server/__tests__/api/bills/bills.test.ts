import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getRepositories } from '~~/server/repositories/factory';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const readValidatedBodyMock = vi.fn();
const getQueryMock = vi.fn();
const getRouterParamMock = vi.fn();
vi.stubGlobal('readValidatedBody', readValidatedBodyMock);
vi.stubGlobal('getQuery', getQueryMock);
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
    .mockResolvedValue({ id: 'u-1', userId: 'u-1', email: 'test@test.com' }),
  ensureHouseMember: vi.fn().mockResolvedValue(undefined),
  ensureBillCreator: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('~~/server/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

const mockBill = {
  id: 'b-1',
  house_id: 'h-1',
  description: 'Electricity',
  monthly_cost: 75.5,
  payment_period: 1,
  next_due_date: '2025-12-31',
  created_by: 'u-1',
  active: true,
};

describe('POST /api/bills', () => {
  const mockEvent = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepositories).mockReturnValue({
      bills: {
        create: vi.fn().mockResolvedValue({ data: mockBill, error: null }),
      },
    } as unknown as ReturnType<typeof getRepositories>);
  });

  it('creates bill and returns data', async () => {
    readValidatedBodyMock.mockResolvedValue({
      house_id: 'h-1',
      description: 'Electricity',
      monthly_cost: 75.5,
      payment_period: 1,
      next_due_date: '2025-12-31',
    });

    const { default: handler } = await import('../../../api/bills/index.post');
    const result = await handler(mockEvent);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ id: 'b-1' });
  });

  it('throws 500 when repository returns error', async () => {
    readValidatedBodyMock.mockResolvedValue({
      house_id: 'h-1',
      description: 'Electricity',
      monthly_cost: 75.5,
      payment_period: 1,
      next_due_date: '2025-12-31',
    });
    vi.mocked(getRepositories).mockReturnValue({
      bills: {
        create: vi.fn().mockResolvedValue({ data: null, error: 'DB error' }),
      },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } = await import('../../../api/bills/index.post');

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });
});

describe('GET /api/bills', () => {
  const mockEvent = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    getQueryMock.mockReturnValue({ house_id: 'h-1' });
    vi.mocked(getRepositories).mockReturnValue({
      bills: {
        getByHouse: vi
          .fn()
          .mockResolvedValue({ data: [mockBill], error: null }),
      },
    } as unknown as ReturnType<typeof getRepositories>);
  });

  it('returns list of bills for a house', async () => {
    const { default: handler } = await import('../../../api/bills/index.get');
    const result = await handler(mockEvent);

    expect(result.data).toHaveLength(1);
  });

  it('throws 400 when house_id is missing', async () => {
    getQueryMock.mockReturnValue({});

    const { default: handler } = await import('../../../api/bills/index.get');

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('DELETE /api/bills/[id]', () => {
  const mockEvent = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    getRouterParamMock.mockReturnValue('b-1');
    vi.mocked(getRepositories).mockReturnValue({
      bills: { delete: vi.fn().mockResolvedValue({ data: null, error: null }) },
    } as unknown as ReturnType<typeof getRepositories>);
  });

  it('deletes bill and returns success', async () => {
    const { default: handler } = await import('../../../api/bills/[id].delete');
    const result = await handler(mockEvent);

    expect(result).toMatchObject({ data: null });
  });

  it('throws 400 when bill id is missing', async () => {
    getRouterParamMock.mockReturnValue(undefined);

    const { default: handler } = await import('../../../api/bills/[id].delete');

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });
});
