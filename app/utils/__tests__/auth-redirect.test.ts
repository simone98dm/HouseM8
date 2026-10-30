import { describe, it, expect, beforeEach } from 'vitest';
import {
  isSafeRedirect,
  isJoinRedirect,
  stashAuthRedirect,
  takeStashedAuthRedirect,
} from '../auth-redirect';

describe('auth-redirect', () => {
  beforeEach(() => localStorage.clear());

  it('accepts only same-origin absolute paths', () => {
    expect(isSafeRedirect('/house/join/abc')).toBe(true);
    expect(isSafeRedirect('//evil.com')).toBe(false);
    expect(isSafeRedirect('https://evil.com')).toBe(false);
    expect(isSafeRedirect('/\\evil.com')).toBe(false);
    expect(isSafeRedirect(undefined)).toBe(false);
  });

  it('rejects control characters and backslashes that URL parsers strip into another host', () => {
    expect(isSafeRedirect('/\t/evil.com')).toBe(false);
    expect(isSafeRedirect('/\n/evil.com')).toBe(false);
    expect(isSafeRedirect('/\t\\evil.com')).toBe(false);
    expect(isSafeRedirect('/expenses\\x')).toBe(false);
    // Percent-encoded slashes stay same-origin: allowed.
    expect(isSafeRedirect('/%2F%2Fevil.com')).toBe(true);
    expect(isSafeRedirect('/expenses?tab=1#x')).toBe(true);
  });

  it('recognises invite paths only', () => {
    expect(
      isJoinRedirect('/house/join/3f2b8c1e-5d4a-4b6e-9c7a-1a2b3c4d5e6f'),
    ).toBe(true);
    expect(isJoinRedirect('/house/join/x/../../admin')).toBe(false);
    expect(isJoinRedirect('/dashboard')).toBe(false);
  });

  it('stashes once and clears on take', () => {
    stashAuthRedirect('/house/join/3f2b8c1e-5d4a-4b6e-9c7a-1a2b3c4d5e6f');
    expect(takeStashedAuthRedirect()).toBe(
      '/house/join/3f2b8c1e-5d4a-4b6e-9c7a-1a2b3c4d5e6f',
    );
    expect(takeStashedAuthRedirect()).toBeNull();
  });

  it('refuses to stash or return an unsafe target', () => {
    stashAuthRedirect('//evil.com');
    expect(takeStashedAuthRedirect()).toBeNull();
    localStorage.setItem('auth_redirect', 'https://evil.com');
    expect(takeStashedAuthRedirect()).toBeNull();
  });
});
