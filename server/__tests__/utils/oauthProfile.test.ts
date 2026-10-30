import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractNameFromMetadata,
  upsertOAuthUserProfile,
} from '~~/server/utils/oauthProfile';

vi.stubGlobal(
  'createError',
  (p: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(p.statusMessage), { statusCode: p.statusCode }),
);
vi.mock('~~/server/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe('extractNameFromMetadata', () => {
  it('uses trimmed first_name/last_name when present', () => {
    expect(
      extractNameFromMetadata(
        { first_name: ' Ann ', last_name: ' Lee ' },
        'a@b.c',
      ),
    ).toEqual({ firstName: 'Ann', lastName: 'Lee' });
  });

  it('splits full_name into first and remaining last name', () => {
    expect(
      extractNameFromMetadata({ full_name: 'Ann Marie Lee' }, 'a@b.c'),
    ).toEqual({ firstName: 'Ann', lastName: 'Marie Lee' });
  });

  it('falls back to name when full_name is absent', () => {
    expect(extractNameFromMetadata({ name: 'Bob' }, 'a@b.c')).toEqual({
      firstName: 'Bob',
      lastName: '',
    });
  });

  it('falls back to email local part when no name info', () => {
    expect(extractNameFromMetadata({}, 'jane@x.io')).toEqual({
      firstName: 'jane',
      lastName: '',
    });
  });

  it('falls back to "User" when email is empty', () => {
    expect(extractNameFromMetadata({}, '')).toEqual({
      firstName: 'User',
      lastName: '',
    });
  });

  it('ignores non-string first/last names', () => {
    expect(
      extractNameFromMetadata(
        { first_name: 1, last_name: {}, name: 'Zed Q' },
        'a@b.c',
      ),
    ).toEqual({ firstName: 'Zed', lastName: 'Q' });
  });
});

describe('upsertOAuthUserProfile', () => {
  const create = vi.fn();
  const update = vi.fn();
  const repo = { create, update } as never;

  beforeEach(() => {
    vi.resetAllMocks();
    create.mockResolvedValue({ error: null });
    update.mockResolvedValue({ error: null });
  });

  it('creates the profile when no existing user', async () => {
    await upsertOAuthUserProfile(
      repo,
      'u1',
      'a@b.c',
      { name: 'Ann Lee' },
      null,
    );
    expect(create).toHaveBeenCalledWith('u1', {
      email: 'a@b.c',
      first_name: 'Ann',
      last_name: 'Lee',
      is_first_access: true,
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('updates by existing id and honours is_first_access metadata', async () => {
    await upsertOAuthUserProfile(
      repo,
      'u1',
      'a@b.c',
      { first_name: 'Ann', is_first_access: false },
      { id: 'existing-id' },
    );
    expect(update).toHaveBeenCalledWith(
      'existing-id',
      expect.objectContaining({ is_first_access: false }),
    );
  });

  it('updates with userId when existing user has no id; tolerates undefined metadata', async () => {
    await upsertOAuthUserProfile(repo, 'u1', 'a@b.c', undefined, {});
    expect(update).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ first_name: 'a' }),
    );
  });

  it('never stores a photo/picture field', async () => {
    await upsertOAuthUserProfile(
      repo,
      'u1',
      'a@b.c',
      { picture: 'http://x/p.png', avatar_url: 'y' },
      null,
    );
    const payload = create.mock.calls[0]![1];
    expect(Object.keys(payload).sort()).toEqual([
      'email',
      'first_name',
      'is_first_access',
      'last_name',
    ]);
  });

  it('throws 500 when the repository returns an error', async () => {
    create.mockResolvedValue({ error: 'db down' });
    await expect(
      upsertOAuthUserProfile(repo, 'u1', 'a@b.c', {}, null),
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});
