import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getRepositories } from '~~/server/repositories/factory';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const readValidatedBodyMock = vi.fn();
const getQueryMock = vi.fn();
vi.stubGlobal('readValidatedBody', readValidatedBodyMock);
vi.stubGlobal('getQuery', getQueryMock);
vi.stubGlobal('getRouterParam', vi.fn());
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
}));

const validExpenseBody = {
  house_id: 'h-1',
  description: 'Groceries',
  total_amount: 60,
  user_ids: ['u-1', 'u-2'],
};

const mockExpense = {
  id: 'e-1',
  house_id: 'h-1',
  description: 'Groceries',
  total_amount: 60,
  created_by: 'u-1',
  shares: [],
};

describe('POST /api/expenses', () => {
  const mockEvent = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepositories).mockReturnValue({
      expenses: {
        create: vi.fn().mockResolvedValue({ data: mockExpense, error: null }),
      },
      users: {
        getById: vi.fn().mockResolvedValue({
          data: { preferred_currency: 'EUR' },
          error: null,
        }),
      },
    } as unknown as ReturnType<typeof getRepositories>);
  });

  it('creates expense and returns data', async () => {
    readValidatedBodyMock.mockResolvedValue(validExpenseBody);

    const { default: handler } =
      await import('../../../api/expenses/index.post');
    const result = await handler(mockEvent);

    expect(result.data).toMatchObject({ id: 'e-1' });
  });

  it('throws 500 when repository returns error', async () => {
    readValidatedBodyMock.mockResolvedValue(validExpenseBody);
    vi.mocked(getRepositories).mockReturnValue({
      expenses: {
        create: vi.fn().mockResolvedValue({ data: null, error: 'DB error' }),
      },
      users: {
        getById: vi.fn().mockResolvedValue({
          data: { preferred_currency: 'EUR' },
          error: null,
        }),
      },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } =
      await import('../../../api/expenses/index.post');

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });
});

// Regression: `due_date` was `z.string().datetime({ offset: true })`, but the
// create form posts a bare YYYY-MM-DD from <input type="date"> into a DATE
// column — so every expense with a due date failed with a 400 ZodError.
describe('createExpenseSchema — due_date', () => {
  // Real UUIDs: the handler fixture above uses short ids like 'h-1', which the
  // schema's own uuid() checks reject, and that would mask the due_date result.
  const schemaValidBody = {
    house_id: '11111111-1111-4111-8111-111111111111',
    description: 'Groceries',
    total_amount: 60,
    user_ids: ['22222222-2222-4222-8222-222222222222'],
  };

  const parse = async (due_date: unknown) => {
    const { createExpenseSchema } =
      await import('../../../api/expenses/index.post');
    return createExpenseSchema.safeParse({ ...schemaValidBody, due_date });
  };

  it('accepts a bare calendar date from <input type="date">', async () => {
    await expect(parse('2026-08-11')).resolves.toMatchObject({ success: true });
  });

  it('accepts a full ISO datetime with an offset', async () => {
    await expect(parse('2026-08-11T10:30:00+02:00')).resolves.toMatchObject({
      success: true,
    });
  });

  it('accepts a UTC datetime, so an API-read value can be posted back', async () => {
    await expect(parse('2026-08-11T00:00:00.000Z')).resolves.toMatchObject({
      success: true,
    });
  });

  it('accepts null and omission, since due_date is optional', async () => {
    await expect(parse(null)).resolves.toMatchObject({ success: true });
    await expect(parse(undefined)).resolves.toMatchObject({ success: true });
  });

  it('still rejects a non-date string', async () => {
    await expect(parse('next friday')).resolves.toMatchObject({
      success: false,
    });
  });

  it('still rejects an impossible calendar date', async () => {
    await expect(parse('2026-13-45')).resolves.toMatchObject({
      success: false,
    });
  });
});

describe('POST /api/expenses — categories and payer_id', () => {
  const mockEvent = {} as any;
  const HOUSE = '11111111-1111-4111-8111-111111111111';
  const OTHER = '33333333-3333-4333-8333-333333333333';
  const base = {
    house_id: HOUSE,
    description: 'Groceries',
    total_amount: 60,
    user_ids: ['22222222-2222-4222-8222-222222222222'],
  };
  const create = vi.fn();
  const isMember = vi.fn();

  const run = async (over: object) => {
    const { createExpenseSchema, default: handler } =
      await import('../../../api/expenses/index.post');
    readValidatedBodyMock.mockImplementation(async () =>
      createExpenseSchema.parse({ ...base, currency: 'EUR', ...over }),
    );
    return handler(mockEvent);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({ data: mockExpense, error: null });
    vi.mocked(getRepositories).mockReturnValue({
      expenses: { create },
      houses: { isMember },
      users: { getById: vi.fn() },
    } as unknown as ReturnType<typeof getRepositories>);
  });

  it('rejects an unknown category', async () => {
    await expect(run({ categories: ['pets'] })).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });

  it('persists categories, empty when omitted', async () => {
    await run({ categories: ['dining', 'gifts'] });
    expect(create).toHaveBeenLastCalledWith(
      expect.objectContaining({ categories: ['dining', 'gifts'] }),
    );
    await run({});
    expect(create).toHaveBeenLastCalledWith(
      expect.objectContaining({ categories: [], created_by: 'u-1' }),
    );
  });

  // The mocked caller id ('u-1') is not a uuid, so these bypass schema parsing.
  const runAsParticipant = async (over: object) => {
    const { default: handler } =
      await import('../../../api/expenses/index.post');
    readValidatedBodyMock.mockResolvedValue({
      ...base,
      currency: 'EUR',
      user_ids: ['u-1', OTHER],
      ...over,
    });
    return handler(mockEvent);
  };

  it('stores a member payer as created_by', async () => {
    isMember.mockResolvedValue(true);
    await runAsParticipant({ payer_id: OTHER });
    expect(isMember).toHaveBeenCalledWith(HOUSE, OTHER);
    expect(create).toHaveBeenLastCalledWith(
      expect.objectContaining({ created_by: OTHER }),
    );
  });

  it('rejects another payer when the caller is not in the split', async () => {
    isMember.mockResolvedValue(true);
    await expect(run({ payer_id: OTHER })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a non-member payer with 400', async () => {
    isMember.mockResolvedValue(false);
    await expect(runAsParticipant({ payer_id: OTHER })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(create).not.toHaveBeenCalled();
  });
});

describe('GET /api/expenses', () => {
  const mockEvent = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    getQueryMock.mockReturnValue({ house_id: 'h-1' });
    vi.mocked(getRepositories).mockReturnValue({
      expenses: {
        getByHouse: vi
          .fn()
          .mockResolvedValue({ data: [mockExpense], error: null, total: 1 }),
      },
    } as unknown as ReturnType<typeof getRepositories>);
  });

  it('returns expenses for a house', async () => {
    const { default: handler } =
      await import('../../../api/expenses/index.get');
    const result = await handler(mockEvent);

    expect(result.data).toHaveLength(1);
  });

  it('throws 400 when house_id is missing', async () => {
    getQueryMock.mockReturnValue({});

    const { default: handler } =
      await import('../../../api/expenses/index.get');

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('createExpenseSchema — categories', () => {
  const body = {
    house_id: '11111111-1111-4111-8111-111111111111',
    description: 'Netflix',
    total_amount: 17.99,
    user_ids: ['22222222-2222-4222-8222-222222222222'],
  };

  const parse = async (extra: Record<string, unknown>) => {
    const { createExpenseSchema } =
      await import('../../../api/expenses/index.post');
    return createExpenseSchema.safeParse({ ...body, ...extra });
  };

  it('defaults categories to an empty list', async () => {
    const result = await parse({});
    expect(result.success && result.data.categories).toEqual([]);
  });

  it('accepts up to three known categories', async () => {
    await expect(
      parse({ categories: ['subscriptions', 'entertainment', 'other'] }),
    ).resolves.toMatchObject({ success: true });
  });

  it('rejects a fourth category, an unknown key, or a duplicate', async () => {
    await expect(
      parse({ categories: ['rent', 'gifts', 'travel', 'other'] }),
    ).resolves.toMatchObject({ success: false });
    await expect(parse({ categories: ['pets'] })).resolves.toMatchObject({
      success: false,
    });
    await expect(
      parse({ categories: ['rent', 'rent'] }),
    ).resolves.toMatchObject({ success: false });
  });
});
