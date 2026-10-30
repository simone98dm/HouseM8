import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const readMultipart = vi.fn();
vi.stubGlobal('readMultipartFormData', readMultipart);
vi.stubGlobal('createError', (p: { statusCode: number; data?: unknown }) =>
  Object.assign(new Error(), p),
);
vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/auth', () => ({
  verifyAuth: vi.fn().mockResolvedValue({ id: 'u-1' }),
}));
vi.mock('~~/server/providers/storage/factory', () => ({
  getStorageProvider: vi.fn(),
}));

describe('POST /api/users/me/pictures', () => {
  const listActive = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepositories).mockReturnValue({
      consents: { listActive },
    } as never);
  });

  it('refuses uploads without an active profile_sharing consent (403)', async () => {
    listActive.mockResolvedValue({ data: [], error: null });
    const { default: h } = await import('../../../api/users/me/pictures.post');
    await expect(h({} as never)).rejects.toMatchObject({
      statusCode: 403,
      data: { code: 'PROFILE_SHARING_CONSENT_REQUIRED' },
    });
    expect(readMultipart).not.toHaveBeenCalled();
  });

  it('lets a consenting user proceed to body validation', async () => {
    listActive.mockResolvedValue({
      data: [{ purpose: 'profile_sharing' }],
      error: null,
    });
    readMultipart.mockResolvedValue([]);
    const { default: h } = await import('../../../api/users/me/pictures.post');
    await expect(h({} as never)).rejects.toMatchObject({ statusCode: 400 });
  });
});
