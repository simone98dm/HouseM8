import { describe, it, expect } from 'vitest';
import {
  toPublicMembers,
  toPublicProfile,
} from '~~/server/utils/public-profile';
import type { User } from '~~/server/repositories/interfaces/IUserRepository';

const user = {
  id: 'u1',
  email: 'secret@example.com',
  first_name: 'Ann',
  last_name: 'Lee',
  avatar_url: 'https://x/a.png',
  bio: 'hi',
  telephone: '123',
  consent_version: 2,
  terms_accepted_at: '2026-01-01',
  deleted_at: null,
} as User;

describe('toPublicProfile', () => {
  it('without consent exposes only id, names and avatar', () => {
    expect(toPublicProfile(user, false)).toEqual({
      id: 'u1',
      first_name: 'Ann',
      last_name: 'Lee',
      avatar_url: 'https://x/a.png',
    });
  });

  it('with consent adds optional fields but never email or internals', () => {
    const p = toPublicProfile(user, true) as unknown as Record<string, unknown>;
    expect(p.bio).toBe('hi');
    expect(p.telephone).toBe('123');
    for (const k of [
      'email',
      'consent_version',
      'terms_accepted_at',
      'deleted_at',
    ]) {
      expect(p).not.toHaveProperty(k);
    }
  });
});

describe('toPublicMembers', () => {
  it('drops email and internal fields from each member user', () => {
    const members = [
      { id: 'm1', role: 'owner', user },
      { id: 'm2', role: 'member', user: undefined },
    ];
    const result = toPublicMembers(members);
    expect(result[0]).toEqual({
      id: 'm1',
      role: 'owner',
      user: {
        id: 'u1',
        first_name: 'Ann',
        last_name: 'Lee',
        avatar_url: 'https://x/a.png',
      },
    });
    expect(JSON.stringify(result)).not.toContain('secret@example.com');
    expect(result[1]).toEqual({ id: 'm2', role: 'member', user: undefined });
  });

  it('does not mutate the repository rows', () => {
    const members = [{ id: 'm1', user }];
    toPublicMembers(members);
    expect(members[0]!.user.email).toBe('secret@example.com');
  });
});
