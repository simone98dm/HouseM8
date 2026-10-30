import { z } from 'zod';
import { getAuthProvider } from '~~/server/providers/auth/factory';
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
} from '~~/server/utils/jwt';
import { logSecurityEvent } from '~~/server/utils/security-events';

const confirmSchema = z.object({
  token: z.string().min(1),
  // Same floor as password reset; bcrypt ignores bytes past 72.
  password: z.string().min(8).max(72).optional(),
});

/**
 * POST /api/auth/confirm
 *
 * Magic-link (email verification):
 *   Body: { token: string, password?: string }
 *   Verifies the email token. A sign-up confirmation also mints a session.
 *   A sign-up with no password yet answers 409 PASSWORD_REQUIRED without
 *   using the token; the page then asks for one and posts it with the token.
 *   An email-change confirmation does not: the link went to the new address,
 *   and holding that mailbox alone must not grant access to the account.
 *
 * Google sign-in is handled server-side by /api/auth/google/callback; this
 * endpoint must never accept client-supplied third-party tokens.
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, confirmSchema.parse);

  const authProvider = getAuthProvider();

  const identity = await authProvider.confirmEmailVerificationToken(
    body.token,
    body.password,
  );

  if (identity === 'password_required') {
    throw createError({ statusCode: 409, statusMessage: 'PASSWORD_REQUIRED' });
  }

  if (!identity) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid or expired verification token',
    });
  }

  if (!identity.isEmailChange) {
    const accessToken = await generateAccessToken(
      identity.userId,
      identity.email,
    );
    const refreshToken = await generateRefreshToken(
      identity.userId,
      identity.email,
    );
    setAuthCookies(event, accessToken, refreshToken);
  }

  if (identity.passwordSet) {
    await logSecurityEvent('password_set', { userId: identity.userId, event });
  }

  return {
    success: true,
    message: 'Email confirmed successfully',
  };
});
