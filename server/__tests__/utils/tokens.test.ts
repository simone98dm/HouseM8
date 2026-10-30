import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateSecureToken,
  hashToken,
  generateVerificationToken,
  hashIp,
  getClientIp,
} from '../../utils/tokens';

describe('server/utils/tokens', () => {
  describe('generateSecureToken', () => {
    it('should return a 64-character hex string with default length', () => {
      const token = generateSecureToken();

      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });

    it('should return correct length for custom byte length', () => {
      const token16 = generateSecureToken(16);
      const token32 = generateSecureToken(32);
      const token48 = generateSecureToken(48);

      // Each byte becomes 2 hex characters
      expect(token16).toHaveLength(32);
      expect(token32).toHaveLength(64);
      expect(token48).toHaveLength(96);
    });

    it('should generate unique tokens on each call', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      const token3 = generateSecureToken();

      expect(token1).not.toEqual(token2);
      expect(token2).not.toEqual(token3);
      expect(token1).not.toEqual(token3);
    });

    it('should generate valid hex strings', () => {
      const token = generateSecureToken();

      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });

    it('should scale correctly for different lengths', () => {
      const lengths = [8, 16, 24, 32, 64];

      lengths.forEach((length) => {
        const token = generateSecureToken(length);
        expect(token).toHaveLength(length * 2);
      });
    });
  });

  describe('hashToken', () => {
    it('should return a 64-character hex string (SHA256)', () => {
      const hash = hashToken('test-token');

      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });

    it('should be deterministic - same input produces same output', () => {
      const token = 'my-secret-token';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      const hash3 = hashToken(token);

      expect(hash1).toEqual(hash2);
      expect(hash2).toEqual(hash3);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashToken('token1');
      const hash2 = hashToken('token2');
      const hash3 = hashToken('similar-token');
      const hash4 = hashToken('similar-token-with-extra');

      expect(hash1).not.toEqual(hash2);
      expect(hash3).not.toEqual(hash4);
    });

    it('should handle empty strings', () => {
      const hash = hashToken('');

      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });

    it('should handle special characters and long strings', () => {
      const token = 'special!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const hash = hashToken(token);

      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });

    it('should be case-sensitive for input', () => {
      const hashLower = hashToken('token');
      const hashUpper = hashToken('TOKEN');
      const hashMixed = hashToken('ToKeN');

      expect(hashLower).not.toEqual(hashUpper);
      expect(hashUpper).not.toEqual(hashMixed);
    });
  });

  describe('generateVerificationToken', () => {
    it('should return an object with token and expiresAt', () => {
      const result = generateVerificationToken();

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('expiresAt');
    });

    it('should return a token as a hex string', () => {
      const { token } = generateVerificationToken();

      expect(typeof token).toBe('string');
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
      expect(token).toHaveLength(64);
    });

    it('should return expiresAt as a Date object', () => {
      const { expiresAt } = generateVerificationToken();

      expect(expiresAt).toBeInstanceOf(Date);
      expect(!Number.isNaN(expiresAt.getTime())).toBe(true);
    });

    it('should default to 24 hours expiration', () => {
      const now = new Date();
      const { expiresAt } = generateVerificationToken();

      const diffMs = expiresAt.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Allow 1 minute tolerance for test execution time
      expect(diffHours).toBeGreaterThan(23.98);
      expect(diffHours).toBeLessThan(24.02);
    });

    it('should accept custom expiration hours', () => {
      const now = new Date();
      const { expiresAt } = generateVerificationToken(12);

      const diffMs = expiresAt.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      expect(diffHours).toBeGreaterThan(11.98);
      expect(diffHours).toBeLessThan(12.02);
    });

    it('should work with various custom expiration hours', () => {
      const now = new Date();
      const hours = [1, 6, 12, 48, 72];

      hours.forEach((hour) => {
        const { expiresAt } = generateVerificationToken(hour);
        const diffMs = expiresAt.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        expect(diffHours).toBeGreaterThan(hour - 0.02);
        expect(diffHours).toBeLessThan(hour + 0.02);
      });
    });

    it('should generate unique tokens on each call', () => {
      const result1 = generateVerificationToken();
      const result2 = generateVerificationToken();
      const result3 = generateVerificationToken();

      expect(result1.token).not.toEqual(result2.token);
      expect(result2.token).not.toEqual(result3.token);
    });

    it('should have different expiresAt for each call (even if called immediately)', () => {
      const result1 = generateVerificationToken();
      const result2 = generateVerificationToken();

      // They should be very close but timestamps might differ slightly
      const timeDiff = Math.abs(
        result1.expiresAt.getTime() - result2.expiresAt.getTime(),
      );
      expect(timeDiff).toBeLessThan(100); // Within 100ms
    });

    it('should always return future dates', () => {
      const now = new Date();
      const { expiresAt } = generateVerificationToken();

      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe('hashIp', () => {
    it('is deterministic, hex, and differs from plain SHA-256', () => {
      expect(hashIp('1.2.3.4')).toBe(hashIp('1.2.3.4'));
      expect(hashIp('1.2.3.4')).toMatch(/^[0-9a-f]{64}$/);
      expect(hashIp('1.2.3.4')).not.toBe(hashToken('1.2.3.4'));
      expect(hashIp('1.2.3.4')).not.toBe(hashIp('1.2.3.5'));
    });

    it('is domain-separated from a bare HMAC of the IP', async () => {
      const { createHmac } = await import('node:crypto');
      const bare = createHmac('sha256', String(process.env.JWT_SECRET))
        .update('1.2.3.4')
        .digest('hex');
      expect(hashIp('1.2.3.4')).not.toBe(bare);
    });
  });
});

describe('getClientIp', () => {
  const getRequestIPMock = vi.fn();
  beforeEach(() => {
    getRequestIPMock.mockReset();
    vi.stubGlobal('getRequestIP', getRequestIPMock);
  });
  const ev = (remoteAddress?: string, socket = true) =>
    ({
      node: { req: { socket: socket ? { remoteAddress } : undefined } },
    }) as never;

  it('prefers the proxy-provided address and asks h3 to honour x-forwarded-for', () => {
    getRequestIPMock.mockReturnValue('9.9.9.9');
    const e = ev('10.0.0.1');
    expect(getClientIp(e)).toBe('9.9.9.9');
    expect(getRequestIPMock).toHaveBeenCalledWith(e, { xForwardedFor: true });
  });

  it('falls back to the socket peer when no forwarded address exists', () => {
    getRequestIPMock.mockReturnValue(undefined);
    expect(getClientIp(ev('10.0.0.1'))).toBe('10.0.0.1');
  });

  it('returns undefined when neither source is available (no socket)', () => {
    getRequestIPMock.mockReturnValue(undefined);
    expect(getClientIp(ev(undefined, false))).toBeUndefined();
  });
});
