import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const bodyMock = vi.fn();
vi.stubGlobal(
  'readValidatedBody',
  async (_e: unknown, parse: (b: unknown) => unknown) =>
    parse(await bodyMock()),
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
}));

const getById = vi.fn();
const update = vi.fn();

const run = async () => {
  const { default: handler } =
    await import('../../../api/user/complete-setup.post');
  return handler({} as never);
};

describe('POST /api/user/complete-setup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getById.mockResolvedValue({ data: { first_name: null }, error: null });
    update.mockResolvedValue({ data: {}, error: null });
    vi.mocked(getRepositories).mockReturnValue({
      users: { getById, update },
    } as unknown as ReturnType<typeof getRepositories>);
  });

  it('saves the name only', async () => {
    bodyMock.mockResolvedValue({ firstName: 'Ada', lastName: 'Lovelace' });
    await expect(run()).resolves.toEqual({ success: true });
    expect(update).toHaveBeenCalledWith('u-1', {
      first_name: 'Ada',
      last_name: 'Lovelace',
    });
  });

  it('never touches the password, even if one is sent', async () => {
    bodyMock.mockResolvedValue({
      firstName: 'Ada',
      lastName: 'Lovelace',
      password: 'attacker-choice',
    });
    await run();
    const [, fields] = update.mock.calls[0]!;
    expect(fields).not.toHaveProperty('password');
    expect(fields).not.toHaveProperty('password_hash');
  });

  it('refuses an account whose setup is already complete', async () => {
    getById.mockResolvedValue({ data: { first_name: 'Ada' }, error: null });
    bodyMock.mockResolvedValue({ firstName: 'Eve', lastName: 'X' });
    await expect(run()).rejects.toMatchObject({ statusCode: 409 });
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a missing last name', async () => {
    bodyMock.mockResolvedValue({ firstName: 'Ada', lastName: '' });
    await expect(run()).rejects.toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });
});
