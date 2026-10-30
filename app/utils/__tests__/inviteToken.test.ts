import { describe, it, expect } from 'vitest';
import { extractInviteToken } from '~/utils/inviteToken';

const TOKEN = '123e4567-e89b-42d3-a456-426614174000';

describe('extractInviteToken', () => {
  it('reads a bare token', () => {
    expect(extractInviteToken(` ${TOKEN} `)).toBe(TOKEN);
  });

  it('reads the token from a full invite URL', () => {
    expect(
      extractInviteToken(`https://house-m8.app/house/join/${TOKEN}?x=1`),
    ).toBe(TOKEN);
  });

  it('returns null when there is no token', () => {
    expect(extractInviteToken('https://house-m8.app/house')).toBeNull();
    expect(extractInviteToken('')).toBeNull();
  });
});
