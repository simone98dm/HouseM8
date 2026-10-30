import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';
import { verifyAuth } from '~~/server/utils/auth';
import { assertProfileSharingConsent } from '~~/server/utils/profile-consent';
import { getStorageProvider } from '~~/server/providers/storage/factory';

vi.stubGlobal('defineEventHandler', (fn: (...a: unknown[]) => unknown) => fn);
const readMultipart = vi.fn();
vi.stubGlobal('readMultipartFormData', readMultipart);
vi.stubGlobal('createError', (p: { statusCode: number; message?: string }) =>
  Object.assign(new Error(p.message), p),
);
vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/auth', () => ({
  verifyAuth: vi.fn().mockResolvedValue({ id: 'u-1' }),
}));
vi.mock('~~/server/utils/profile-consent', () => ({
  assertProfileSharingConsent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('~~/server/providers/storage/factory', () => ({
  getStorageProvider: vi.fn(),
}));

const event = {} as never;
const png = (over: Record<string, unknown> = {}) => ({
  name: 'picture',
  type: 'image/png',
  data: Buffer.from('x'),
  ...over,
});
const load = async () =>
  (await import('../../../api/users/me/pictures.post')).default;

describe('POST /api/users/me/pictures (validation + upload)', () => {
  const getById = vi.fn();
  const update = vi.fn();
  const upload = vi.fn();
  const del = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(verifyAuth).mockResolvedValue({ id: 'u-1' } as never);
    vi.mocked(assertProfileSharingConsent).mockResolvedValue(undefined);
    vi.mocked(getRepositories).mockReturnValue({
      users: { getById, update },
    } as never);
    vi.mocked(getStorageProvider).mockReturnValue({
      upload,
      delete: del,
    } as never);
    getById.mockResolvedValue({
      data: { profile_pictures: ['a'] },
      error: null,
    });
    upload.mockResolvedValue({
      data: { publicUrl: 'http://cdn/p.png' },
      error: null,
    });
    update.mockResolvedValue({ data: { id: 'u-1' }, error: null });
  });

  it('400 when no form data', async () => {
    readMultipart.mockResolvedValue(undefined);
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('400 when picture field is missing', async () => {
    readMultipart.mockResolvedValue([png({ name: 'other' })]);
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('400 on disallowed mime type', async () => {
    readMultipart.mockResolvedValue([png({ type: 'image/gif' })]);
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(upload).not.toHaveBeenCalled();
  });

  it('400 on missing mime type', async () => {
    readMultipart.mockResolvedValue([png({ type: undefined })]);
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('400 when file exceeds 5MB', async () => {
    readMultipart.mockResolvedValue([
      png({ data: Buffer.alloc(5 * 1024 * 1024 + 1) }),
    ]);
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('accepts a file of exactly 5MB', async () => {
    readMultipart.mockResolvedValue([
      png({ data: Buffer.alloc(5 * 1024 * 1024) }),
    ]);
    await expect((await load())(event)).resolves.toBeDefined();
  });

  it('500 when the current user cannot be loaded', async () => {
    readMultipart.mockResolvedValue([png()]);
    getById.mockResolvedValue({ data: null, error: 'x' });
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it('400 when user already has 6 pictures', async () => {
    readMultipart.mockResolvedValue([png()]);
    getById.mockResolvedValue({
      data: { profile_pictures: ['1', '2', '3', '4', '5', '6'] },
      error: null,
    });
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(upload).not.toHaveBeenCalled();
  });

  it('uploads under the user folder and appends the url', async () => {
    readMultipart.mockResolvedValue([png({ type: 'image/webp' })]);
    const res = await (await load())(event);
    expect(upload.mock.calls[0]![0]).toBe('profile-pictures');
    expect(upload.mock.calls[0]![1]).toMatch(/^u-1\/\d+\.webp$/);
    expect(update).toHaveBeenCalledWith('u-1', {
      profile_pictures: ['a', 'http://cdn/p.png'],
    });
    expect(res).toMatchObject({ data: { pictureUrl: 'http://cdn/p.png' } });
  });

  it('treats null profile_pictures as empty', async () => {
    readMultipart.mockResolvedValue([png()]);
    getById.mockResolvedValue({
      data: { profile_pictures: null },
      error: null,
    });
    await (
      await load()
    )(event);
    expect(update).toHaveBeenCalledWith('u-1', {
      profile_pictures: ['http://cdn/p.png'],
    });
  });

  it('500 when storage upload fails', async () => {
    readMultipart.mockResolvedValue([png()]);
    upload.mockResolvedValue({ data: null, error: 'nope' });
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 500,
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('rolls back the uploaded file when the profile update fails', async () => {
    readMultipart.mockResolvedValue([png()]);
    update.mockResolvedValue({ data: null, error: 'db' });
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 500,
    });
    expect(del).toHaveBeenCalledWith(
      'profile-pictures',
      expect.stringMatching(/^u-1\//),
    );
  });

  it('hides unexpected error details behind a generic 500', async () => {
    readMultipart.mockResolvedValue([png()]);
    upload.mockRejectedValue(new Error('secret internals'));
    await expect((await load())(event)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Failed to upload picture',
    });
  });
});
