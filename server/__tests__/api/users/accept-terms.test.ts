import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';
import { LEGAL_POLICY_VERSION } from '~~/shared/utils/legal';

vi.stubGlobal('defineEventHandler', (fn: (...a: unknown[]) => unknown) => fn);
const bodyMock = vi.fn();
vi.stubGlobal(
  'readValidatedBody',
  async (_e: unknown, parse: (b: unknown) => unknown) =>
    parse(await bodyMock()),
);
vi.stubGlobal('createError', (p: { statusCode: number }) =>
  Object.assign(new Error('x'), p),
);
vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi.fn().mockResolvedValue({ id: 'u1' }),
}));

const update = vi.fn();
const ok = {
  terms_accepted: true,
  privacy_acknowledged: true,
  age_confirmed: true,
};

describe('POST /api/users/me/accept-terms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    update.mockResolvedValue({ data: { id: 'u1' }, error: null });
    vi.mocked(getRepositories).mockReturnValue({ users: { update } } as never);
  });

  it('stores acceptance time and the server legal version', async () => {
    bodyMock.mockResolvedValue(ok);
    const { default: h } =
      await import('../../../api/users/me/accept-terms.post');
    await h({} as never);
    expect(update).toHaveBeenCalledWith('u1', {
      terms_accepted_at: expect.any(String),
      consent_version: LEGAL_POLICY_VERSION,
    });
  });

  it.each(['terms_accepted', 'privacy_acknowledged', 'age_confirmed'])(
    'rejects when %s is missing or false',
    async (key) => {
      bodyMock.mockResolvedValue({ ...ok, [key]: false });
      const { default: h } =
        await import('../../../api/users/me/accept-terms.post');
      await expect(h({} as never)).rejects.toBeTruthy();
      expect(update).not.toHaveBeenCalled();
    },
  );
});
