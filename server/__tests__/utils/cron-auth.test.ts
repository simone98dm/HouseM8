import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { verifyCronSecret, isCronRequest } from '~~/server/utils/cron-auth';

// Minimal H3-like event: isCronRequest only reads request headers.
const eventWith = (headers: Record<string, string>) =>
  ({ node: { req: { headers } } }) as never;

const SECRET = 'super-secret-cron-value';

describe('cron auth', () => {
  const original = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
    vi.stubGlobal('getRequestHeader', (event: never, name: string) => {
      const e = event as unknown as {
        node: { req: { headers: Record<string, string> } };
      };
      return e.node.req.headers[name.toLowerCase()];
    });
  });

  afterEach(() => {
    process.env.CRON_SECRET = original;
    vi.unstubAllGlobals();
  });

  describe('verifyCronSecret', () => {
    it('accepts the exact secret', () => {
      expect(verifyCronSecret(SECRET)).toBe(true);
    });

    it('rejects a wrong secret of the same length', () => {
      expect(verifyCronSecret('x'.repeat(SECRET.length))).toBe(false);
    });

    it('rejects undefined', () => {
      expect(verifyCronSecret(undefined)).toBe(false);
    });

    // Without this guard an attacker learns the secret's length from timing.
    it('rejects a length mismatch without throwing', () => {
      expect(verifyCronSecret(SECRET + 'extra')).toBe(false);
      expect(verifyCronSecret(SECRET.slice(0, 3))).toBe(false);
    });

    it('rejects everything when CRON_SECRET is unset', () => {
      delete process.env.CRON_SECRET;
      expect(verifyCronSecret(SECRET)).toBe(false);
      expect(verifyCronSecret('')).toBe(false);
    });
  });

  describe('isCronRequest', () => {
    it('accepts x-cron-secret, used by external schedulers', () => {
      expect(isCronRequest(eventWith({ 'x-cron-secret': SECRET }))).toBe(true);
    });

    // Vercel Cron sends this shape and cannot be configured to send a custom
    // header. Before this, every scheduled run 401'd.
    it('accepts Authorization: Bearer, which is what Vercel Cron sends', () => {
      expect(
        isCronRequest(eventWith({ authorization: `Bearer ${SECRET}` })),
      ).toBe(true);
    });

    it('rejects a Bearer token that is not the secret', () => {
      expect(
        isCronRequest(eventWith({ authorization: 'Bearer not-the-secret' })),
      ).toBe(false);
    });

    it('rejects a bare Authorization value without the Bearer scheme', () => {
      expect(isCronRequest(eventWith({ authorization: SECRET }))).toBe(false);
    });

    it('rejects a request carrying no credential at all', () => {
      expect(isCronRequest(eventWith({}))).toBe(false);
    });
  });
});
