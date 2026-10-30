import { getRepositories } from '~~/server/repositories/factory';
import { logSecurityEvent } from '~~/server/utils/security-events';

/**
 * Shared by the transfer endpoint and the owner's leave flow. Validates the
 * target, runs the atomic repository transfer and maps its errors to HTTP.
 * The caller must already have verified that `fromUserId` is the owner.
 */
export async function transferHouseOwnership(
  houseId: string,
  fromUserId: string,
  toUserId: string,
): Promise<void> {
  if (fromUserId === toUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'You are already the house owner',
    });
  }

  const { error } = await getRepositories().houses.transferOwnership(
    houseId,
    fromUserId,
    toUserId,
  );
  if (!error) {
    // Callers do not pass the request, so the event carries the actor only.
    await logSecurityEvent('ownership_transferred', { userId: fromUserId });
    return;
  }

  if (error === 'NOT_OWNER') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only the house owner can transfer ownership',
    });
  }
  if (error === 'MEMBER_NOT_FOUND') {
    throw createError({
      statusCode: 404,
      statusMessage: 'The new owner must be an active member of the house',
    });
  }
  throw createError({
    statusCode: 500,
    statusMessage: 'Failed to transfer ownership',
  });
}
