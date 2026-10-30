/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 */
import { isFeatureEnabled } from '~~/server/utils/feature-flags';
import { getAuthProvider } from '~~/server/providers/auth/factory';
import { getRepositories } from '~~/server/repositories/factory';
import { logger } from '~~/server/utils/logger';
import { logSecurityEvent } from '~~/server/utils/security-events';
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
} from '~~/server/utils/jwt';
import { upsertOAuthUserProfile } from '~~/server/utils/oauthProfile';
export default defineEventHandler(async (event) => {
  if (!(await isFeatureEnabled('showSignup'))) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' });
  }

  const config = useRuntimeConfig();
  const query = getQuery(event);

  const { code, state, error: oauthError } = query;

  if (oauthError) {
    const errorMsg: string = Array.isArray(oauthError)
      ? (oauthError[0] ?? 'unknown')
      : oauthError;
    throw createError({
      statusCode: 400,
      statusMessage: `OAuth error: ${errorMsg}`,
    });
  }

  // Validate OAuth state to prevent CSRF
  const storedState = getCookie(event, 'oauth_state');
  deleteCookie(event, 'oauth_state');
  if (!state || typeof state !== 'string' || state !== storedState) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid OAuth state parameter',
    });
  }

  if (!code || typeof code !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Authorization code missing',
    });
  }

  if (!config.googleClientId || !config.googleClientSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Google OAuth not configured',
    });
  }

  const baseUrl = config.public.baseUrl || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await $fetch<{
      access_token: string;
      refresh_token: string;
      id_token?: string;
      expires_in: number;
      token_type: string;
    }>('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.access_token || !tokenResponse.refresh_token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Failed to obtain tokens from Google',
      });
    }

    // Get user info from Google (just to validate token)
    await $fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenResponse.access_token}`,
      },
    });

    // Call the confirm logic directly
    const authProvider = getAuthProvider();

    if (!authProvider.confirmOAuthSession) {
      throw createError({
        statusCode: 501,
        statusMessage:
          'OAuth confirmation not supported by current auth provider',
      });
    }

    const result = await authProvider.confirmOAuthSession(
      tokenResponse.access_token,
      tokenResponse.refresh_token,
      {
        expires_in: tokenResponse.expires_in,
        token_type: tokenResponse.token_type || 'Bearer',
        provider: 'google',
      },
    );

    if (!result) {
      await logSecurityEvent('signin_failed', { event });
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid OAuth tokens',
      });
    }

    const { user, metadata } = result;
    const repos = getRepositories();

    // Check if user profile already exists — fall back to email lookup if
    // getById fails (e.g. a schema/query error swallowed by repoQuery).
    const { data: existingById, error: getByIdError } =
      await repos.users.getById(user.id);

    if (getByIdError && getByIdError !== 'User not found') {
      logger.warn(
        'getById error during Google OAuth, falling back to email lookup',
        {
          userId: user.id,
          error: getByIdError,
        },
      );
    }

    let existingUser = existingById;
    if (!existingUser && user.email) {
      const { data: userByEmail } = await repos.users.getByEmail(user.email);
      existingUser = userByEmail;
    }

    // Create or update user profile
    const isOAuth = metadata?.provider === 'google';
    const needsProfileUpdate =
      !existingUser ||
      (isOAuth && (!existingUser.first_name || existingUser.is_first_access));

    if (needsProfileUpdate) {
      await upsertOAuthUserProfile(
        repos.users,
        user.id,
        user.email || '',
        metadata as Record<string, unknown>,
        existingUser,
      );
    }

    // New OAuth users get no terms_accepted_at / consent_version: the
    // re-acceptance modal collects terms, privacy and age (POST
    // /api/users/me/accept-terms).

    // Generate and set JWT tokens for the authenticated user
    const accessToken = await generateAccessToken(user.id, user.email || '');
    const refreshToken = await generateRefreshToken(user.id, user.email || '');
    setAuthCookies(event, accessToken, refreshToken);
    await logSecurityEvent('signin_success', { userId: user.id, event });

    // Redirect directly to home page with OAuth completion indicator
    await sendRedirect(event, `${baseUrl}/?oauth_completed=true`);
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    logger.error('Google OAuth callback error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'OAuth callback failed',
    });
  }
});
