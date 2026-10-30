import { timingSafeEqual } from 'node:crypto';
import type { H3Event } from 'h3';

/**
 * Verify the CRON_SECRET header using constant-time comparison
 * to prevent timing-based oracle attacks.
 */
export function verifyCronSecret(provided: string | undefined): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !provided) return false;
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(secret);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * True when the request carries a valid cron credential.
 *
 * Two header shapes are accepted deliberately:
 * - `x-cron-secret: <secret>` — what an external scheduler (or curl) sends.
 * - `Authorization: Bearer <secret>` — what **Vercel Cron** sends. It cannot be
 *   configured to send custom headers, so an endpoint that only reads
 *   `x-cron-secret` can never be driven by a Vercel cron job; it will 401 on
 *   every run. That was the case here before vercel.json existed.
 */
export function isCronRequest(event: H3Event): boolean {
  const direct = getRequestHeader(event, 'x-cron-secret');
  if (verifyCronSecret(direct)) return true;

  const auth = getRequestHeader(event, 'authorization');
  if (auth?.startsWith('Bearer ')) {
    return verifyCronSecret(auth.slice('Bearer '.length));
  }
  return false;
}
