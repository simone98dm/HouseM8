import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { logger } from '~~/server/utils/logger';

/**
 * GET /api/users/me/consents
 * Active consents of the current user.
 */
export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const { data, error } = await getRepositories().consents.listActive(user.id);
  if (error || !data) {
    logger.error('Failed to list consents', { userId: user.id, error });
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
  return { data };
});
