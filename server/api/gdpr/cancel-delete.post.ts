import { z } from 'zod';
import consola from 'consola';
import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { resumeSubscriptionAfterCancelledErasure } from '~~/server/utils/stripe-erasure';
import { logSecurityEvent } from '~~/server/utils/security-events';

// token is optional: the in-app "Cancel deletion" button sends no token and
// relies on the authenticated user's id; the emailed link sends the real
// cancel_token. An empty/malformed token falls through to the userId lookup
// (see PostgresGdprRepository.cancelDeletion), it is never rejected here.
const schema = z.object({
  token: z.string().optional().default(''),
});

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const { token } = await readValidatedBody(event, schema.parse);
  const repos = getRepositories();

  const result = await repos.gdpr.cancelDeletion(token, user.id);

  if (!result) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No scheduled deletion found for this account',
    });
  }

  await logSecurityEvent('deletion_cancelled', { userId: user.id, event });

  // Stripe failure must not undo the cancellation: report it to the UI.
  let subscriptionRestored: boolean | null = null;
  if (result.stripeCancelScheduled) {
    try {
      subscriptionRestored = await resumeSubscriptionAfterCancelledErasure(
        user.id,
      );
    } catch (error) {
      consola.error('Stripe resume failed after deletion cancelled', {
        userId: user.id,
        error,
      });
      subscriptionRestored = false;
    }
  }

  return {
    message: 'Account deletion cancelled successfully.',
    data: {
      restored_house_ids: result.restoredHouseIds,
      subscription_restored: subscriptionRestored,
    },
  };
});
