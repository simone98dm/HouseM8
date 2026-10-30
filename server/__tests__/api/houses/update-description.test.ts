import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
vi.stubGlobal('getRouterParam', () => 'h-1');
const readBodyMock = vi.fn<() => Promise<unknown>>();
vi.stubGlobal(
  'readValidatedBody',
  async (_event: unknown, validator: (body: unknown) => unknown) =>
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
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi.fn().mockResolvedValue({ id: 'u-1' }),
  ensureHouseOwner: vi.fn().mockResolvedValue(undefined),
}));

const run = async (event: unknown) => {
  const { default: handler } = await import('../../../api/houses/[id].put');
  return (handler as unknown as (e: unknown) => Promise<unknown>)(event);
};

describe('PUT /api/houses/:id description', () => {
  const update = vi.fn();
  const getMembers = vi.fn();

  beforeEach(() => {
    update.mockReset().mockResolvedValue({ data: { id: 'h-1' }, error: null });
    getMembers
      .mockReset()
      .mockResolvedValue({ data: [{}, {}, {}], error: null });
    vi.mocked(getRepositories).mockReturnValue({
      houses: { update, getMembers },
    } as never);
  });

  it('saves a description without a name (About card patch)', async () => {
    readBodyMock.mockResolvedValue({ description: 'Bins on Tuesday' });
    await run({});
    expect(update.mock.calls[0]![1]).toMatchObject({
      description: 'Bins on Tuesday',
      name: undefined,
    });
    expect(update.mock.calls[0]![1]).not.toHaveProperty('address');
  });

  it('clears the address with an empty string', async () => {
    readBodyMock.mockResolvedValue({ name: 'Home', address: '  ' });
    await run({});
    expect(update.mock.calls[0]![1].address).toBeNull();
  });

  it('rejects a size below the current member count', async () => {
    readBodyMock.mockResolvedValue({ name: 'Home', max_members: 2 });
    await expect(run({})).rejects.toMatchObject({ statusCode: 400 });
    expect(update).not.toHaveBeenCalled();
  });

  it('accepts a size equal to the current member count', async () => {
    readBodyMock.mockResolvedValue({ name: 'Home', max_members: 3 });
    await run({});
    expect(update.mock.calls[0]![1].max_members).toBe(3);
  });

  it('saves a trimmed description', async () => {
    readBodyMock.mockResolvedValue({ name: 'Home', description: '  Hello  ' });
    await run({});
    expect(update).toHaveBeenCalledWith(
      'h-1',
      expect.objectContaining({ description: 'Hello' }),
    );
  });

  it('turns an empty description into null', async () => {
    readBodyMock.mockResolvedValue({ name: 'Home', description: '   ' });
    await run({});
    expect(update.mock.calls[0]![1].description).toBeNull();
  });

  it('leaves the description untouched when omitted', async () => {
    readBodyMock.mockResolvedValue({ name: 'Home' });
    await run({});
    expect(update.mock.calls[0]![1]).not.toHaveProperty('description');
  });

  it('rejects a description over 1000 characters', async () => {
    readBodyMock.mockResolvedValue({
      name: 'Home',
      description: 'a'.repeat(1001),
    });
    await expect(run({})).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
  });
});
