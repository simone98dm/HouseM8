/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
let body: unknown;
// Run the handler's real Zod schema against `body`.
vi.stubGlobal(
  'readValidatedBody',
  (_e: unknown, validate: (b: unknown) => unknown) => validate(body),
);
vi.stubGlobal('getRouterParam', () => 'b-1');
vi.stubGlobal('createError', (o: object) => Object.assign(new Error(), o));

vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi.fn().mockResolvedValue({ id: 'u-1' }),
  ensureHouseMember: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('~~/server/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

const HOUSE = '11111111-1111-4111-8111-111111111111';
const ev = {} as never;

describe('bill date and bounds validation', () => {
  beforeEach(() => {
    vi.mocked(getRepositories).mockReturnValue({
      bills: {
        create: vi.fn().mockResolvedValue({ data: { id: 'b-1' }, error: null }),
        getById: vi
          .fn()
          .mockResolvedValue({ data: { house_id: HOUSE }, error: null }),
        update: vi.fn().mockResolvedValue({ data: { id: 'b-1' }, error: null }),
      },
    } as never);
  });

  const post = async (over: object) => {
    body = {
      house_id: HOUSE,
      description: 'x',
      monthly_cost: 10,
      next_due_date: '2026-12-31',
      ...over,
    };
    const { default: h } = await import('../../../api/bills/index.post');
    return (h as Function)(ev);
  };
  const put = async (over: object) => {
    body = over;
    const { default: h } = await import('../../../api/bills/[id].put');
    return (h as Function)(ev);
  };

  it('POST accepts YYYY-MM-DD', async () => {
    await expect(post({})).resolves.toMatchObject({ success: true });
  });

  it.each(['tomorrow', '2026-13-45', '2026-12-31T10:00:00Z', ''])(
    'POST rejects next_due_date %j',
    async (d) => {
      await expect(post({ next_due_date: d })).rejects.toThrow();
    },
  );

  it('PUT rejects a non-date next_due_date', async () => {
    await expect(put({ next_due_date: 'soon' })).rejects.toThrow();
  });

  it('PUT accepts a valid date', async () => {
    await expect(put({ next_due_date: '2026-05-01' })).resolves.toMatchObject({
      success: true,
    });
  });

  it('PUT caps monthly_cost and payment_period', async () => {
    await expect(put({ monthly_cost: 1_000_001 })).rejects.toThrow();
    await expect(put({ payment_period: 121 })).rejects.toThrow();
  });
});

describe('bill categories', () => {
  const create = vi
    .fn()
    .mockResolvedValue({ data: { id: 'b-1' }, error: null });
  const update = vi
    .fn()
    .mockResolvedValue({ data: { id: 'b-1' }, error: null });
  beforeEach(() => {
    create.mockClear();
    update.mockClear();
    vi.mocked(getRepositories).mockReturnValue({
      bills: {
        create,
        update,
        getById: vi
          .fn()
          .mockResolvedValue({ data: { house_id: HOUSE }, error: null }),
      },
    } as never);
  });
  const post = async (categories?: unknown) => {
    body = {
      house_id: HOUSE,
      description: 'x',
      monthly_cost: 10,
      next_due_date: '2026-12-31',
      categories,
    };
    const { default: h } = await import('../../../api/bills/index.post');
    return (h as Function)(ev);
  };
  const put = async (categories: unknown) => {
    body = { categories };
    const { default: h } = await import('../../../api/bills/[id].put');
    return (h as Function)(ev);
  };

  it('POST persists valid categories', async () => {
    await post(['utilities', 'rent']);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ categories: ['utilities', 'rent'] }),
    );
  });
  it('POST defaults omitted categories to an empty list', async () => {
    await post(undefined);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ categories: [] }),
    );
  });
  it('POST and PUT reject unknown, duplicate or more than 3 categories', async () => {
    for (const bad of [
      ['pets'],
      ['rent', 'rent'],
      ['rent', 'gifts', 'travel', 'other'],
      null,
    ]) {
      await expect(post(bad)).rejects.toThrow();
      await expect(put(bad)).rejects.toThrow();
    }
  });
  it('PUT passes categories through', async () => {
    await put(['utilities']);
    expect(update).toHaveBeenLastCalledWith('b-1', {
      categories: ['utilities'],
    });
    await put([]);
    expect(update).toHaveBeenLastCalledWith('b-1', { categories: [] });
  });
});
