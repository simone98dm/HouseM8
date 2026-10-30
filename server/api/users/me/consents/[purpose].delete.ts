import { z } from 'zod';
import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { logSecurityEvent } from '~~/server/utils/security-events';
import { logger } from '~~/server/utils/logger';

/**
 * DELETE /api/users/me/consents/[purpose]
 * Withdraw a consent. Withdrawing profile_sharing also clears the optional
 * profile fields (single transaction in the repository).
 */
const purposeSchema = z.enum(['profile_sharing']);

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const parsed = purposeSchema.safeParse(getRouterParam(event, 'purpose'));
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid purpose' });
  }

  const { error } = await getRepositories().consents.withdraw(
    user.id,
    parsed.data,
  );
  if (error) {
    logger.error('Failed to withdraw consent', {
      userId: user.id,
      purpose: parsed.data,
      error,
    });
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
  await logSecurityEvent('consent_withdrawn', { userId: user.id, event });
  return { success: true };
});
