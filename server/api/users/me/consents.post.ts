import { z } from 'zod';
import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { logSecurityEvent } from '~~/server/utils/security-events';
import { logger } from '~~/server/utils/logger';
import { LEGAL_POLICY_VERSION } from '~~/shared/utils/legal';

/**
 * POST /api/users/me/consents
 * Grant a consent (idempotent). The version is always the server's current one.
 */
const grantSchema = z.object({ purpose: z.enum(['profile_sharing']) });

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const { purpose } = await readValidatedBody(event, grantSchema.parse);

  const { data, error } = await getRepositories().consents.grant(
    user.id,
    purpose,
    LEGAL_POLICY_VERSION,
  );
  if (error || !data) {
    logger.error('Failed to grant consent', {
      userId: user.id,
      purpose,
      error,
    });
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
  await logSecurityEvent('consent_granted', { userId: user.id, event });
  return { data };
});
