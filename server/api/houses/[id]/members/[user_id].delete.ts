import { verifyAuth } from '~~/server/utils/auth';
import { getRepositories } from '~~/server/repositories/factory';
import { sendTenantDepartureNotification } from '~~/server/emails';

export default defineEventHandler(async (event) => {
  const user = await verifyAuth(event);
  const houseId = getRouterParam(event, 'id');
  const userIdToRemove = getRouterParam(event, 'user_id');

  if (!houseId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'House ID is required',
    });
  }

  if (!userIdToRemove) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User ID is required',
    });
  }

  const repos = getRepositories();

  // Verify user is the owner of the house
  const { data: role, error: roleError } = await repos.houses.getMemberRole(
    houseId,
    user.id,
  );

  if (roleError || !role) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Not a member of this house',
    });
  }

  if (role !== 'owner') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only the house owner can remove members',
    });
  }

  // Guard the target as well as the caller: the single owner cannot be removed
  // from their own house. Checked after the caller's authorization so a
  // non-owner cannot probe who the owner is.
  const { data: targetRole } = await repos.houses.getMemberRole(
    houseId,
    userIdToRemove,
  );
  if (targetRole === 'owner') {
    throw createError({
      statusCode: 403,
      statusMessage: 'The house owner cannot be removed from the house',
    });
  }

  // Remove member
  const { error } = await repos.houses.removeMember(houseId, userIdToRemove);

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to remove member',
    });
  }

  // Get house and departed user details for notifications
  const { data: house } = await repos.houses.getById(houseId);
  const { data: departedUser } = await repos.users.getById(userIdToRemove);

  // Notify remaining house members (non-blocking)
  if (house && departedUser) {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    const { data: remainingMembers } = await repos.houses.getMembers(houseId);

    if (remainingMembers) {
      const notifications = remainingMembers
        .filter((m) => m.user?.email && m.user_id !== userIdToRemove)
        .map((member) => {
          const memberUser = member.user;
          if (!memberUser) return Promise.resolve();

          return sendTenantDepartureNotification({
            email: memberUser.email,
            tenantName: memberUser.first_name || 'Member',
            departingTenantName: `${departedUser.first_name} ${departedUser.last_name}`,
            houseName: house.name,
            ratingLink: `${baseURL}/houses/${houseId}/rating`,
          }).catch(() => {
            // Silent fail for email notifications
          });
        });

      Promise.all(notifications).catch(() => {
        // Silent fail for email batch
      });
    }
  }

  return { data: null };
});
