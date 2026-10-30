import { z } from 'zod';
import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { sendAccountDeletionRequestedEmail } from '~~/server/emails/index';
import { cancelSubscriptionForErasure } from '~~/server/utils/stripe-erasure';
import { logSecurityEvent } from '~~/server/utils/security-events';
import consola from 'consola';

const schema = z.object({
  confirm: z.literal(true, { message: 'confirm must be true' }),
});

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  await readValidatedBody(event, schema.parse);

  const config = useRuntimeConfig();
  const baseUrl = config.public.baseUrl || 'http://localhost:3000';
  const repos = getRepositories();

  // An owner with other active members must hand the house over first.
  const blockingHouses = await repos.gdpr.getOwnedHousesBlockingDeletion(
    user.id,
  );
  if (blockingHouses.length > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'OWNER_MUST_TRANSFER',
      data: { houses: blockingHouses },
    });
  }

  // Billing must stop before we accept the request: never "deleted" while
  // Stripe keeps charging. Nothing is written yet, so the user can just retry.
  let stripeCancelScheduled: boolean;
  try {
    stripeCancelScheduled = await cancelSubscriptionForErasure(user.id);
  } catch (error) {
    consola.error('Stripe cancellation failed during deletion request', {
      userId: user.id,
      error,
    });
    throw createError({
      statusCode: 502,
      statusMessage: 'BILLING_CANCEL_FAILED',
    });
  }

  const { scheduledFor, cancelToken } = await repos.gdpr.softDeleteUser(
    user.id,
    stripeCancelScheduled,
  );
  await logSecurityEvent('deletion_requested', { userId: user.id, event });

  const cancelLink = `${baseUrl}/settings/privacy?cancel_token=${cancelToken}`;
  const scheduledForStr = scheduledFor.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const { data: profile } = await repos.users.getById(user.id);

  sendAccountDeletionRequestedEmail({
    email: user.email,
    userName: profile?.first_name ?? user.email,
    cancelLink,
    scheduledFor: scheduledForStr,
  }).catch(() => {});

  // ponytail: deletion is a 30-day soft-delete, not immediate — keeping the
  // session alive lets the user reach the in-app "Cancel deletion" button on
  // this same settings page instead of only via the emailed link.
  return {
    message: 'Account deletion scheduled.',
    scheduled_for: scheduledFor.toISOString(),
  };
});
