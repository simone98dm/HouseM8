import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';

export default defineEventHandler(async (event) => {
  try {
    const user = await verifyAuthCompat(event);

    const token = getRouterParam(event, 'token');

    if (!token) {
      throw createError({
        statusCode: 400,
        message: 'Token is required',
      });
    }

    const repos = getRepositories();

    // Get invitation with house details
    const result = await repos.houses.getInvitationByToken(token);

    if (result.error || !result.data) {
      throw createError({
        statusCode: 404,
        message: result.error || 'Invalid or expired invitation',
      });
    }

    const invitation = result.data;

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

    // Get house details
    const houseResult = await repos.houses.getById(invitation.house_id, false);
    if (houseResult.error || !houseResult.data) {
      throw createError({
        statusCode: 404,
        message: 'House not found',
      });
    }

    // Check if this user already belongs to any house
    const currentHouseResult = await repos.houses.getCurrentForUser(user.id);
    const userInHouse = !!currentHouseResult.data;

    return {
      data: {
        house: houseResult.data,
        invitation: {
          id: invitation.id,
          expires_at: invitation.expires_at,
        },
        user_in_house: userInHouse,
      },
    };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to load invitation details',
    });
  }
});
