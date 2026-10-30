import { z } from 'zod';
import { verifyAuth } from '~~/server/utils/auth';
import { ensureHouseAdmin } from '~~/server/utils/repository-auth';
import { createHouseInvite } from '~~/server/utils/house-invitations';

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email format'),
});

/**
 * POST /api/houses/:id/members
 * Invite-only: sends an invitation email and never adds anyone directly.
 * The response is identical whether or not the email belongs to a registered
 * user, so it cannot be used to enumerate accounts or read profiles.
 */
export default defineEventHandler(async (event) => {
  const user = await verifyAuth(event);
  const houseId = getRouterParam(event, 'id');

  if (!houseId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'House ID is required',
    });
  }

  // Owner or delegated admin only.
  await ensureHouseAdmin(houseId, user.id);

  const { email } = await readValidatedBody(event, inviteMemberSchema.parse);

  await createHouseInvite({
    houseId,
    inviter: { id: user.id, email: user.email },
    inviteeEmail: email,
  });

  return { data: { invited: true } };
});
