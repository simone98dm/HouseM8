import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';

const sendMemberInviteEmail = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined),
);
vi.mock('~~/server/emails', () => ({ sendMemberInviteEmail }));

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const readBodyMock = vi.fn<() => Promise<unknown>>();
vi.stubGlobal(
  'getRouterParam',
  vi.fn(() => 'h-1'),
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
vi.stubGlobal(
  'readValidatedBody',
  async (_e: unknown, validator: (b: unknown) => unknown) => {
    try {
      return validator(await readBodyMock());
    } catch (err) {
      throw createError({
        statusCode: 400,
        message: err instanceof Error ? err.message : 'Validation failed',
      });
    }
  },
);
vi.stubGlobal('useRuntimeConfig', () => ({
  public: { baseUrl: 'http://localhost:3000' },
}));

const ensureHouseAdmin = vi.hoisted(() => vi.fn());
vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/auth', () => ({
  verifyAuth: vi.fn().mockResolvedValue({ id: 'u-admin', email: 'a@b.com' }),
}));
vi.mock('~~/server/utils/repository-auth', () => ({ ensureHouseAdmin }));

describe('POST /api/houses/[id]/members (invite-only)', () => {
  const houses = {
    createInvitation: vi.fn(),
    attachInviteCode: vi.fn(),
    getById: vi.fn(),
    addMember: vi.fn(),
    isMember: vi.fn(),
  };
  const users = { getById: vi.fn(), getByEmail: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    ensureHouseAdmin.mockResolvedValue(undefined);
    readBodyMock.mockResolvedValue({ email: 'target@example.com' });
    houses.createInvitation.mockResolvedValue({
      data: { id: 'inv-1', token: 'tok', expires_at: 'x' },
      error: null,
    });
    houses.attachInviteCode.mockResolvedValue({
      data: { code: '123456', code_expires_at: new Date().toISOString() },
      error: null,
    });
    houses.getById.mockResolvedValue({ data: { name: 'Casa' }, error: null });
    users.getById.mockResolvedValue({
      data: { first_name: 'Ann', last_name: 'B' },
      error: null,
    });
    vi.mocked(getRepositories).mockReturnValue({
      houses,
      users,
    } as unknown as ReturnType<typeof getRepositories>);
  });

  const call = async () => {
    const { default: handler } =
      await import('../../../api/houses/[id]/members.post');
    return handler({} as never) as Promise<{ data: unknown }>;
  };

  it('sends an invitation email and returns only { invited: true }', async () => {
    const result = await call();

    expect(result).toEqual({ data: { invited: true } });
    expect(houses.createInvitation).toHaveBeenCalledWith(
      'h-1',
      'target@example.com',
      'u-admin',
    );
    expect(sendMemberInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'target@example.com', code: '123456' }),
    );
  });

  it('never adds the member nor looks up the target user', async () => {
    await call();

    expect(houses.addMember).not.toHaveBeenCalled();
    expect(users.getByEmail).not.toHaveBeenCalled();
  });

  it('rejects callers who are not house admins', async () => {
    ensureHouseAdmin.mockRejectedValue(
      Object.assign(new Error('Forbidden'), { statusCode: 403 }),
    );

    await expect(call()).rejects.toMatchObject({ statusCode: 403 });
    expect(houses.createInvitation).not.toHaveBeenCalled();
  });

  it('rejects an invalid email with 400', async () => {
    readBodyMock.mockResolvedValue({ email: 'nope' });

    await expect(call()).rejects.toMatchObject({ statusCode: 400 });
  });
});
