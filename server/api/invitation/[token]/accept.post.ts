import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import {
  sendHomeAcceptanceConfirmation,
  sendNewTenantNotification,
} from '~~/server/emails';

export default defineEventHandler(async (event) => {
  try {
    // Verify user authentication
    const user = await verifyAuthCompat(event);

    const token = getRouterParam(event, 'token');

    if (!token) {
      throw createError({
        statusCode: 400,
        message: 'Token is required',
      });
    }

    const repos = getRepositories();

    // Get invitation
    const invitationResult = await repos.houses.getInvitationByToken(token);
    if (invitationResult.error || !invitationResult.data) {
      throw createError({
        statusCode: 404,
        message: invitationResult.error || 'Invalid or expired invitation',
      });
    }

    const invitation = invitationResult.data;

    // Check if invitation has expired
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);

    if (now > expiresAt) {
      throw createError({
        statusCode: 410,
        message: 'Invitation has expired',
      });
    }

    // Check if invitation was already used
    if (invitation.used) {
      throw createError({
        statusCode: 410,
        message: 'Invitation has already been used',
      });
    }

    // Check if user is already a member of this house
    const isMember = await repos.houses.isMember(invitation.house_id, user.id);
    if (isMember) {
      throw createError({
        statusCode: 409,
        message: 'You are already a member of this house',
      });
    }

    // Check if user already belongs to any other house
    const currentHouseResult = await repos.houses.getCurrentForUser(user.id);
    if (currentHouseResult.data) {
      throw createError({
        statusCode: 409,
        message: 'You must leave your current house before joining another',
      });
    }

    // Accept invitation (adds member and marks invitation as used)
    const acceptResult = await repos.houses.acceptInvitation(token, user.id);
    if (acceptResult.error === 'HOUSE_FULL') {
      throw createError({
        statusCode: 409,
        message: 'This house is full',
      });
    }
    if (acceptResult.error === 'duplicate key') {
      throw createError({
        statusCode: 409,
        message: 'You are already a member of a house',
      });
    }
    if (acceptResult.error) {
      throw createError({
        statusCode: 500,
        message: acceptResult.error || 'Failed to accept invitation',
      });
    }

    // Get house and user details for email notifications
    const houseResult = await repos.houses.getById(invitation.house_id, false);
    const userResult = await repos.users.getById(user.id);

    if (houseResult.data && userResult.data) {
      const house = houseResult.data;
      const userProfile = userResult.data;

      // Send confirmation email to user who accepted (non-blocking)
      sendHomeAcceptanceConfirmation({
        email: userProfile.email,
        userName: `${userProfile.first_name} ${userProfile.last_name}`,
        houseName: house.name,
        houseAddress: house.address || '',
      }).catch(() => {
        // Silent fail for email sending
      });

      // Notify existing members about new tenant
      const membersResult = await repos.houses.getMembers(invitation.house_id);
      if (membersResult.data) {
        const notifications = membersResult.data
          .filter((m) => m.user_id !== user.id && m.user?.email)
          .map((member) => {
            const memberUser = member.user;
            if (!memberUser?.email) return Promise.resolve();

            return sendNewTenantNotification({
              email: memberUser.email,
              tenantName: memberUser.first_name || 'Member',
              newTenantName: `${userProfile.first_name} ${userProfile.last_name}`,
              houseName: house.name,
            }).catch(() => {
              // Silent fail for email sending
            });
          });

        Promise.all(notifications).catch(() => {
          // Silent fail for email batch
        });
      }
    }

    // Award referral rewards for both inviter and joiner
    const inviterId = invitation.invited_by;
    if (inviterId !== user.id) {
      const alreadyRewarded = await repos.referrals.existsForPair(
        inviterId,
        user.id,
      );
      if (!alreadyRewarded) {
        await repos.referrals.createReward(inviterId, user.id, invitation.id);
        await repos.referrals.createReward(user.id, inviterId, invitation.id);
      }
    }

    return {
      data: {
        house_id: invitation.house_id,
      },
    };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to accept invitation',
    });
  }
});
