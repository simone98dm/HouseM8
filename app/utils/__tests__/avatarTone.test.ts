import { describe, it, expect } from 'vitest';
import { AVATAR_TONES, avatarTone } from '../avatarTone';

describe('avatarTone', () => {
  it('is stable for the same key', () => {
    expect(avatarTone('user-42')).toBe(avatarTone('user-42'));
  });

  it('always returns one of the five tones, including for an empty key', () => {
    for (const key of ['', 'a', 'zz', 'ab12-cd34', 'Marco Rossi']) {
      expect(AVATAR_TONES).toContain(avatarTone(key));
    }
  });

  it('spreads keys across tones by character-code sum', () => {
    // 'a' (97) % 5 = 2 → 'c'; 'b' (98) % 5 = 3 → 'd'
    expect(avatarTone('a')).toBe('c');
    expect(avatarTone('b')).toBe('d');
  });
});
