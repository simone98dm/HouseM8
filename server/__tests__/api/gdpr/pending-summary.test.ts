import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';
import { verifyAuthCompat } from '~~/server/utils/repository-auth';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
vi.stubGlobal('createError', (o: object) => Object.assign(new Error(), o));

vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi.fn(),
}));
vi.mock('~~/server/utils/logger', () => ({ logger: { error: vi.fn() } }));

const ME = 'me';
const ANA = 'ana';
const BOB = 'bob';
const CARL = 'carl';

const person = (id: string) => ({
  id,
  email: `${id}@secret.test`,
  first_name: id,
  last_name: 'X',
  avatar_url: undefined,
  bio: 'private bio',
});

const house = (id: string, status: 'active' | 'archived' = 'active') => ({
  id,
  name: `House ${id}`,
  currency: 'EUR',
  status,
});

const transfer = (from: string, to: string, amount: number) => ({
  from_user_id: from,
  to_user_id: to,
  amount,
  from_user: person(from),
  to_user: person(to),
});

type Counterpart = { user: Record<string, unknown>; net_cents: number };
const getHousesForUser = vi.fn();
const getMembers = vi.fn();
const getHouseBalance = vi.fn();

async function call() {
  const { default: h } = await import('../../../api/gdpr/pending-summary.get');
  return (
    h as unknown as (
      e: unknown,
    ) => Promise<{ data: { houses: { counterparts: Counterpart[] }[] } }>
  )({});
}

describe('GET /api/gdpr/pending-summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAuthCompat).mockResolvedValue({ id: ME } as never);
    getHousesForUser.mockResolvedValue({ data: [house('h1')], error: null });
    getMembers.mockResolvedValue({
      data: [ME, ANA, BOB, CARL].map((user_id) => ({
        user_id,
        user: person(user_id),
      })),
      error: null,
    });
    getHouseBalance.mockResolvedValue({
      data: {
        user_to_user_balances: [
          transfer(ANA, ME, 12.34), // Ana owes me
          transfer(ME, BOB, 5), // I owe Bob
        ],
      },
      error: null,
    });
    vi.mocked(getRepositories).mockReturnValue({
      houses: { getHousesForUser, getMembers },
      balance: { getHouseBalance },
    } as never);
  });

  it('returns signed cents per direction, with 0 when even', async () => {
    const { data } = await call();
    const byId = Object.fromEntries(
      data.houses[0]!.counterparts.map((c) => [c.user.id, c.net_cents]),
    );
    expect(byId).toEqual({ [ANA]: 1234, [BOB]: -500, [CARL]: 0 });
    expect(data.houses[0]).toMatchObject({
      id: 'h1',
      name: 'House h1',
      currency: 'EUR',
    });
  });

  it('returns no houses as an empty list', async () => {
    getHousesForUser.mockResolvedValue({ data: [], error: null });
    expect(await call()).toEqual({ data: { houses: [] } });
  });

  it('excludes archived houses and never reads their balance', async () => {
    getHousesForUser.mockResolvedValue({
      data: [house('h1', 'archived')],
      error: null,
    });
    expect((await call()).data.houses).toEqual([]);
    expect(getHouseBalance).not.toHaveBeenCalled();
  });

  it('only reads houses the caller is a member of', async () => {
    await call();
    expect(getHousesForUser).toHaveBeenCalledWith(ME);
    expect(getHouseBalance).toHaveBeenCalledTimes(1);
    expect(getHouseBalance).toHaveBeenCalledWith('h1');
  });

  it('never exposes email or optional profile fields', async () => {
    const { data } = await call();
    const json = JSON.stringify(data);
    expect(json).not.toContain('email');
    expect(json).not.toContain('secret.test');
    expect(json).not.toContain('private bio');
  });

  it('skips members without a joined user row', async () => {
    getMembers.mockResolvedValue({
      data: [
        { user_id: ME, user: person(ME) },
        { user_id: ANA, user: null },
      ],
      error: null,
    });
    const { data } = await call();
    expect(data.houses[0]!.counterparts).toEqual([]);
  });

  it('answers 401 when unauthenticated', async () => {
    vi.mocked(verifyAuthCompat).mockRejectedValue(
      Object.assign(new Error(), { statusCode: 401 }),
    );
    await expect(call()).rejects.toMatchObject({ statusCode: 401 });
  });

  it('answers a generic 500 when a repository fails', async () => {
    getHouseBalance.mockResolvedValue({ data: null, error: 'pg: boom' });
    await expect(call()).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Could not load balances',
    });
  });
});
