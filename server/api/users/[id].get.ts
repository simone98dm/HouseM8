import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { toPublicProfile } from '~~/server/utils/public-profile';

/**
 * GET /api/users/[id]
 * Get a user by ID
 * Only users in the same house can view each other's profiles
 */
export default defineEventHandler(async (event) => {
  const currentUser = await verifyAuthCompat(event);

  const userId = getRouterParam(event, 'id');

  if (!userId) {
    throw createError({
      statusCode: 400,
      message: 'User ID is required',
    });
  }

  const repos = getRepositories();

  // Get the target user
  const { data: targetUser, error: userError } =
    await repos.users.getById(userId);

  if (userError) {
    throw createError({
      statusCode: 500,
      message: userError,
    });
  }

  // Accounts in the deletion grace period are hidden from everyone else.
  if (!targetUser || targetUser.deleted_at) {
    throw createError({
      statusCode: 404,
      message: 'User not found',
    });
  }

  // Verify both users are in the same house
  // Get current user's house
  const { data: currentUserHouse } = await repos.houses.getCurrentForUser(
    currentUser.id,
  );

  if (!currentUserHouse) {
    throw createError({
      statusCode: 403,
      message: 'You must be in a house to view other user profiles',
    });
  }

  // Get target user's house
  const { data: targetUserHouse } =
    await repos.houses.getCurrentForUser(userId);

  if (!targetUserHouse) {
    throw createError({
      statusCode: 404,
      message: 'User is not in a house',
    });
  }

  // Check if both users are in the same house
  if (targetUserHouse.id !== currentUserHouse.id) {
    throw createError({
      statusCode: 403,
      message: 'You can only view profiles of users in your house',
    });
  }

  const { data: consents } = await repos.consents.listActive(userId);
  const hasSharing = consents?.some((c) => c.purpose === 'profile_sharing');

  return { data: toPublicProfile(targetUser, Boolean(hasSharing)) };
});
