/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 */
import { randomBytes } from 'node:crypto';
import { isFeatureEnabled } from '~~/server/utils/feature-flags';

export default defineEventHandler(async (event) => {
  if (!(await isFeatureEnabled('showSignup'))) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' });
  }

  const config = useRuntimeConfig();

  if (!config.googleClientId || !config.googleClientSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Google OAuth not configured',
    });
  }

  const baseUrl = config.public.baseUrl || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  // Google OAuth2 authorization URL
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', config.googleClientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  const state = randomBytes(16).toString('hex');
  const isSecure = process.env.NODE_ENV !== 'development';
  setCookie(event, 'oauth_state', state, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });
  authUrl.searchParams.set('state', state);

  // Redirect to Google OAuth
  await sendRedirect(event, authUrl.toString());
});
