/**
 * JWT Token Management Utilities
 * Uses 'jose' library for secure JWT operations
 */

import { SignJWT, jwtVerify } from 'jose';
import type { H3Event } from 'h3';
import { getCookie, setCookie, deleteCookie } from 'h3';
import { randomUUID } from 'node:crypto';
import { getPostgresPool } from '~~/server/utils/postgres';

const ACCESS_TOKEN_NAME = 'house_m8_access_token';
const REFRESH_TOKEN_NAME = 'house_m8_refresh_token';

// Token expiration times
const ACCESS_TOKEN_EXPIRES = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRES = '7d'; // 7 days

interface TokenPayload {
  userId: string;
  email: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

/**
 * Get JWT secret from environment
 * In production, use a strong random secret
 */
function getJWTSecret(): Uint8Array {
  const config = useRuntimeConfig();
  const secret = config.jwtSecret || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('jwtSecret runtime config is required and missing');
  }
  return new TextEncoder().encode(secret as string);
}

/**
 * Generate an access token (short-lived)
 */
export async function generateAccessToken(
  userId: string,
  email: string,
): Promise<string> {
  const secret = getJWTSecret();

  const token = await new SignJWT({ userId, email, typ: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRES)
    .sign(secret);

  return token;
}

/**
 * Generate a refresh token (long-lived)
 */
export async function generateRefreshToken(
  userId: string,
  email: string,
): Promise<string> {
  const secret = getJWTSecret();
  const jti = randomUUID();

  const token = await new SignJWT({ userId, email, typ: 'refresh', jti })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRES)
    .sign(secret);

  const pool = getPostgresPool();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO refresh_tokens (jti, user_id, expires_at) VALUES ($1, $2, $3)',
    [jti, userId, expiresAt],
  );

  return token;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(
  token: string,
  expectedTyp: 'access' | 'refresh',
): Promise<TokenPayload | null> {
  try {
    const secret = getJWTSecret();
    const { payload } = await jwtVerify(token, secret);

    if (
      typeof payload.userId !== 'string' ||
      typeof payload.email !== 'string'
    ) {
      throw createError({ statusCode: 401, message: 'Invalid token claims' });
    }

    if (payload.typ !== expectedTyp) return null;

    return {
      userId: payload.userId,
      email: payload.email,
      jti: typeof payload.jti === 'string' ? payload.jti : undefined,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Set authentication cookies
 * @param rememberMe - If true, refresh token persists for 7 days; otherwise it is a session cookie
 */
export function setAuthCookies(
  event: H3Event,
  accessToken: string,
  refreshToken: string,
  rememberMe: boolean = false,
): void {
  const isSecure = process.env.NODE_ENV !== 'development';

  // Set access token cookie (httpOnly, secure in production)
  setCookie(event, ACCESS_TOKEN_NAME, accessToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 15 * 60, // 15 minutes
    path: '/',
  });

  // Set refresh token cookie (httpOnly, secure in production)
  // maxAge is only set when rememberMe is true; otherwise it's a session cookie
  setCookie(event, REFRESH_TOKEN_NAME, refreshToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    ...(rememberMe ? { maxAge: 7 * 24 * 60 * 60 } : {}), // 7 days or session cookie
    path: '/',
  });
}

/**
 * Get access token from cookie or Authorization header
 */
export function getAccessToken(event: H3Event): string | null {
  // Try cookie first
  const cookieToken = getCookie(event, ACCESS_TOKEN_NAME);
  if (cookieToken) return cookieToken;

  // Try Authorization header
  const authHeader = event.node.req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Get refresh token from cookie
 */
export function getRefreshToken(event: H3Event): string | null {
  return getCookie(event, REFRESH_TOKEN_NAME) || null;
}

/**
 * Clear authentication cookies
 */
export function clearAuthCookies(event: H3Event): void {
  deleteCookie(event, ACCESS_TOKEN_NAME);
  deleteCookie(event, REFRESH_TOKEN_NAME);
}

/**
 * Get current user from JWT token
 */
export async function getUserFromToken(
  event: H3Event,
): Promise<TokenPayload | null> {
  const token = getAccessToken(event);
  if (!token) return null;

  return await verifyToken(token, 'access');
}

/**
 * A refresh token is active only if its jti has a row in refresh_tokens
 * that has not been revoked (sign-out / password reset revoke rows).
 */
export async function isRefreshTokenActive(jti: string): Promise<boolean> {
  const pool = getPostgresPool();
  const result = await pool.query(
    'SELECT revoked_at FROM refresh_tokens WHERE jti = $1',
    [jti],
  );
  const row = result.rows[0];
  return Boolean(row) && !row.revoked_at;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  event: H3Event,
): Promise<string | null> {
  const refreshToken = getRefreshToken(event);
  if (!refreshToken) return null;

  const payload = await verifyToken(refreshToken, 'refresh');
  if (!payload?.jti || !(await isRefreshTokenActive(payload.jti))) return null;

  // Generate new access token
  const newAccessToken = await generateAccessToken(
    payload.userId,
    payload.email,
  );

  // Update access token cookie
  const isSecure = process.env.NODE_ENV !== 'development';
  setCookie(event, ACCESS_TOKEN_NAME, newAccessToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 15 * 60, // 15 minutes
    path: '/',
  });

  return newAccessToken;
}
