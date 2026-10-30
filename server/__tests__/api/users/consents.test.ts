import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';
import { LEGAL_POLICY_VERSION } from '~~/shared/utils/legal';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const getRouterParamMock = vi.fn();
vi.stubGlobal('getRouterParam', getRouterParamMock);
const readBodyMock = vi.fn<() => Promise<unknown>>();
vi.stubGlobal(
  'readValidatedBody',
  async (_e: unknown, validator: (b: unknown) => unknown) =>
    validator(await readBodyMock()),
);
vi.stubGlobal(
  'createError',
  (p: { statusCode: number; statusMessage?: string }) => {
    const e = new Error(p.statusMessage ?? 'Error') as Error & {
      statusCode: number;
    };
    e.statusCode = p.statusCode;
    return e;
  },
);

vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi.fn().mockResolvedValue({ id: 'u-1', email: 'a@b.com' }),
}));

const repo = (consents: Record<string, unknown>) =>
  vi.mocked(getRepositories).mockReturnValue({
    consents,
  } as unknown as ReturnType<typeof getRepositories>);

describe('users/me/consents endpoints', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET lists active consents', async () => {
    const listActive = vi
      .fn()
      .mockResolvedValue({ data: [{ id: 'c' }], error: null });
    repo({ listActive });
    const { default: h } = await import('../../../api/users/me/consents.get');
    expect(await h({} as never)).toEqual({ data: [{ id: 'c' }] });
    expect(listActive).toHaveBeenCalledWith('u-1');
  });

  it('GET maps repo errors to 500', async () => {
    repo({ listActive: vi.fn().mockResolvedValue({ data: null, error: 'x' }) });
    const { default: h } = await import('../../../api/users/me/consents.get');
    await expect(h({} as never)).rejects.toMatchObject({ statusCode: 500 });
  });

  it('POST grants with the current policy version', async () => {
    const grant = vi.fn().mockResolvedValue({ data: { id: 'c' }, error: null });
    repo({ grant });
    readBodyMock.mockResolvedValue({ purpose: 'profile_sharing' });
    const { default: h } = await import('../../../api/users/me/consents.post');
    await h({} as never);
    expect(grant).toHaveBeenCalledWith(
      'u-1',
      'profile_sharing',
      LEGAL_POLICY_VERSION,
    );
  });

  it('POST rejects unknown purposes (withdrawal_waiver is checkout-only)', async () => {
    const grant = vi.fn();
    repo({ grant });
    readBodyMock.mockResolvedValue({ purpose: 'withdrawal_waiver' });
    const { default: h } = await import('../../../api/users/me/consents.post');
    await expect(h({} as never)).rejects.toThrow();
    expect(grant).not.toHaveBeenCalled();
  });

  it('DELETE withdraws the consent', async () => {
    const withdraw = vi
      .fn()
      .mockResolvedValue({ data: undefined, error: null });
    repo({ withdraw });
    getRouterParamMock.mockReturnValue('profile_sharing');
    const { default: h } =
      await import('../../../api/users/me/consents/[purpose].delete');
    expect(await h({} as never)).toEqual({ success: true });
    expect(withdraw).toHaveBeenCalledWith('u-1', 'profile_sharing');
  });

  it('DELETE refuses to withdraw withdrawal_waiver', async () => {
    const withdraw = vi.fn();
    repo({ withdraw });
    getRouterParamMock.mockReturnValue('withdrawal_waiver');
    const { default: h } =
      await import('../../../api/users/me/consents/[purpose].delete');
    await expect(h({} as never)).rejects.toMatchObject({ statusCode: 400 });
    expect(withdraw).not.toHaveBeenCalled();
  });

  it('DELETE rejects an invalid purpose with 400', async () => {
    const withdraw = vi.fn();
    repo({ withdraw });
    getRouterParamMock.mockReturnValue('nope');
    const { default: h } =
      await import('../../../api/users/me/consents/[purpose].delete');
    await expect(h({} as never)).rejects.toMatchObject({ statusCode: 400 });
    expect(withdraw).not.toHaveBeenCalled();
  });
});
