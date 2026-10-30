import { verifyAuthCompatSafe } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { getCookie, getHeader } from 'h3';
import { logger } from '~~/server/utils/logger';

const DELETION_GRACE_DAYS = 30; // matches PostgresGdprRepository purge window
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * GET /api/users/me
 * Get current authenticated user's profile
 */
export default defineEventHandler(async (event) => {
  try {
    // Use safe auth verification for timing-sensitive scenarios
    const user = await verifyAuthCompatSafe(event);

    if (!user?.id) {
      // Check if it's a timing issue or real auth failure
      const hasSessionCookies =
        getCookie(event, 'house_m8_access_token') ||
        getHeader(event, 'authorization');

      if (hasSessionCookies) {
        // Session cookies exist but user not ready - likely timing issue
        throw createError({
          statusCode: 503,
          statusMessage: 'Authentication session not ready - please retry',
        });
      }

      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required',
      });
    }

    const repos = getRepositories();
    const { data, error } = await repos.users.getById(user.id);

    if (error) {
      logger.error('Failed to fetch user profile', { userId: user.id, error });
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal server error',
      });
    }

    if (!data) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found. Please complete registration.',
      });
    }

    const pendingDeletion = Boolean(data.deleted_at);
    return {
      data: {
        ...data,
        pending_deletion: pendingDeletion,
        deletion_scheduled_for: pendingDeletion
          ? new Date(
              new Date(data.deleted_at as string).getTime() +
                DELETION_GRACE_DAYS * MS_PER_DAY,
            ).toISOString()
          : null,
      },
    };
  } catch (error: unknown) {
    // If it's already a created error, re-throw it
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Log unexpected errors
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
