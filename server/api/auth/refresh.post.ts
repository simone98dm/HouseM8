import {
  getRefreshToken,
  verifyToken,
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from '~~/server/utils/jwt';
import { getPostgresPool } from '~~/server/utils/postgres';

export default defineEventHandler(async (event) => {
  const refreshToken = getRefreshToken(event);

  if (!refreshToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No refresh token found',
    });
  }

  const payload = await verifyToken(refreshToken, 'refresh');

  if (!payload) {
    clearAuthCookies(event);
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid refresh token',
    });
  }

  // Rotation is one atomic statement: of two concurrent requests presenting
  // the same token only one can revoke it, and only that one gets a new pair.
  // A token without jti, or one already revoked/unknown, is rejected.
  const rotated = payload.jti
    ? await getPostgresPool().query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE jti = $1 AND revoked_at IS NULL',
        [payload.jti],
      )
    : null;

  if (!rotated?.rowCount) {
    clearAuthCookies(event);
    throw createError({ statusCode: 401, statusMessage: 'Token revoked' });
  }

  // Generate new tokens
  const newAccessToken = await generateAccessToken(
    payload.userId,
    payload.email,
  );
  const newRefreshToken = await generateRefreshToken(
    payload.userId,
    payload.email,
  );

  // Set cookies
  setAuthCookies(event, newAccessToken, newRefreshToken);

  return { status: 'success' };
});
