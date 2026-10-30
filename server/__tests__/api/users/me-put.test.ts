import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getRepositories } from '~~/server/repositories/factory';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
vi.stubGlobal(
  'readValidatedBody',
  async (_e: unknown, parse: (b: unknown) => unknown) =>
    parse(await bodyMock()),
);
const bodyMock = vi.fn();
vi.stubGlobal('createError', (p: { statusCode: number; message?: string }) =>
  Object.assign(new Error(p.message), { statusCode: p.statusCode }),
);

vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi.fn().mockResolvedValue({ id: 'u-1', email: 'a@b.com' }),
}));

describe('PUT /api/users/me', () => {
  const update = vi.fn();
  const listActive = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    update.mockResolvedValue({ data: { id: 'u-1' }, error: null });
    listActive.mockResolvedValue({ data: [], error: null });
    vi.mocked(getRepositories).mockReturnValue({
      users: { update },
      consents: { listActive },
    } as unknown as ReturnType<typeof getRepositories>);
  });

  it('never forwards email to the repository (sign-in email is changed only via the confirmed flow)', async () => {
    bodyMock.mockResolvedValue({ first_name: 'Jo', email: 'evil@x.com' });
    const { default: handler } = await import('../../../api/users/me.put');
    await handler({} as never);
    expect(update).toHaveBeenCalledWith('u-1', { first_name: 'Jo' });
  });

  it('rejects a body that only contains email', async () => {
    bodyMock.mockResolvedValue({ email: 'evil@x.com' });
    const { default: handler } = await import('../../../api/users/me.put');
    await expect(handler({} as never)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects optional profile fields without profile_sharing consent (403)', async () => {
    bodyMock.mockResolvedValue({ first_name: 'Jo', telephone: '123' });
    const { default: handler } = await import('../../../api/users/me.put');
    await expect(handler({} as never)).rejects.toMatchObject({
      statusCode: 403,
      data: { code: 'PROFILE_SHARING_CONSENT_REQUIRED' },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('allows optional fields when profile_sharing is active', async () => {
    listActive.mockResolvedValue({
      data: [{ purpose: 'profile_sharing' }],
      error: null,
    });
    bodyMock.mockResolvedValue({ telephone: '123' });
    const { default: handler } = await import('../../../api/users/me.put');
    await handler({} as never);
    expect(update).toHaveBeenCalledWith('u-1', { telephone: '123' });
  });

  it('keeps name and currency editable without consent, and never takes consent fields', async () => {
    bodyMock.mockResolvedValue({
      first_name: 'Jo',
      preferred_currency: 'EUR',
      consent_version: 99,
      terms_accepted_at: '2020-01-01',
    });
    const { default: handler } = await import('../../../api/users/me.put');
    await handler({} as never);
    expect(listActive).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith('u-1', {
      first_name: 'Jo',
      preferred_currency: 'EUR',
    });
  });

  describe('avatar_url', () => {
    const put = async (avatar_url: unknown) => {
      bodyMock.mockResolvedValue({ avatar_url });
      const { default: handler } = await import('../../../api/users/me.put');
      return handler({} as never);
    };

    it.each(['/uploads/a.png', null])('accepts %s', async (v) => {
      await put(v);
      expect(update).toHaveBeenCalledWith('u-1', { avatar_url: v });
    });

    it.each([
      'http://localhost:3000/a.png',
      'https://evil.example/a.png',
      'javascript:alert(1)',
      '//evil.example/a.png',
      'data:image/png;base64,AAAA',
    ])('rejects %s', async (v) => {
      await expect(put(v)).rejects.toBeTruthy();
      expect(update).not.toHaveBeenCalled();
    });
  });
});
