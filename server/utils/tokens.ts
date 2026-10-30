import type { H3Event } from 'h3';
import { randomBytes, createHash, createHmac } from 'node:crypto';

/**
 * Generate a secure random token for email verification
 * @param length Token length (default: 32 bytes = 64 hex characters)
 * @returns Secure random token string
 */
export const generateSecureToken = (length = 32): string => {
  return randomBytes(length).toString('hex');
};

/**
 * Hash a token for secure storage
 * @param token Plain token to hash
 * @returns Hashed token
 */
export const hashToken = (token: string): string => {
  return createHash('sha256').update(token).digest('hex');
};

/**
 * Generate verification token with expiration
 * @param expirationHours Hours until token expires (default: 24)
 * @returns Object with token and expiration date
 */
export const generateVerificationToken = (
  expirationHours = 24,
): { token: string; expiresAt: Date } => {
  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expirationHours);

  return { token, expiresAt };
};

/**
 * Keyed hash of a client IP (HMAC-SHA256 with the JWT secret). Unlike a plain
 * SHA-256, the small IPv4 space cannot be enumerated without the secret.
 * @throws if no JWT secret is configured
 */
export const hashIp = (ip: string): string => {
  let secret: unknown;
  try {
    secret = useRuntimeConfig().jwtSecret;
  } catch {
    // Outside a Nitro request (scripts, unit tests): fall back to the env.
  }
  secret ||= process.env.JWT_SECRET;
  if (!secret) throw new Error('jwtSecret runtime config is required');
  return createHmac('sha256', String(secret)).update(`ip:${ip}`).digest('hex');
};

/**
 * Client address for rate limiting and the audit trail. On Vercel it is the
 * first x-forwarded-for hop / x-real-ip set by the platform, which this trusts
 * to overwrite those headers; off-proxy deployments use the socket peer.
 */
export const getClientIp = (event: H3Event): string | undefined =>
  getRequestIP(event, { xForwardedFor: true }) ??
  event.node.req.socket?.remoteAddress;
