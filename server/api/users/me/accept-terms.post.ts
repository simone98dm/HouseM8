import { z } from 'zod';
import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { logger } from '~~/server/utils/logger';
import { LEGAL_POLICY_VERSION } from '~~/shared/utils/legal';

/**
 * POST /api/users/me/accept-terms
 * (Re-)acceptance of the current Terms and Privacy notice, plus the age
 * statement. The version is always the server's, never the client's.
 */
const acceptSchema = z.object({
  terms_accepted: z.literal(true),
  privacy_acknowledged: z.literal(true),
  age_confirmed: z.literal(true),
});

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  await readValidatedBody(event, acceptSchema.parse);

  const { data, error } = await getRepositories().users.update(user.id, {
    terms_accepted_at: new Date().toISOString(),
    consent_version: LEGAL_POLICY_VERSION,
  });
  if (error || !data) {
    logger.error('Failed to record terms acceptance', {
      userId: user.id,
      error,
    });
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
  return { data };
});
