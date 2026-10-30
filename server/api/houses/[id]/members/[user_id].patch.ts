import { z } from 'zod';
import {
  verifyAuthCompat,
  ensureHouseOwner,
} from '~~/server/utils/repository-auth';
import { logSecurityEvent } from '~~/server/utils/security-events';
import { getRepositories } from '~~/server/repositories/factory';

// 'owner' is deliberately NOT assignable. There is exactly one owner per house
// (DB-enforced by house_members_one_owner_per_house) and no ownership transfer,
// so the only roles that can ever be granted are the delegated admin and the
// base member.
const bodySchema = z.object({
  role: z.enum(['admin', 'member']),
});

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);

  const houseId = getRouterParam(event, 'id');
  const targetUserId = getRouterParam(event, 'user_id');

  if (!houseId || !targetUserId) {
    throw createError({
      statusCode: 400,
      message: 'House ID and user ID are required',
    });
  }

  if (targetUserId === user.id) {
    throw createError({
      statusCode: 400,
      message: 'Cannot change your own role',
    });
  }

  // Owner only. Delegating is the owner's call alone: letting a delegate
  // promote further delegates makes the set of people who can add members
  // grow without the owner's involvement.
  await ensureHouseOwner(houseId, user.id);

  const repos = getRepositories();

  // The owner cannot be demoted by anyone, including an admin. Without this an
  // admin could strip the single owner and leave the house with none.
  const { data: targetRole } = await repos.houses.getMemberRole(
    houseId,
    targetUserId,
  );
  if (targetRole === 'owner') {
    throw createError({
      statusCode: 403,
      statusMessage: "The house owner's role cannot be changed",
    });
  }

  const { role } = await readValidatedBody(event, bodySchema.parse);
  const result = await repos.houses.updateMemberRole(
    houseId,
    targetUserId,
    role,
  );

  if (result.error || !result.data) {
    throw createError({
      statusCode: 500,
      message: result.error || 'Failed to update role',
    });
  }

  await logSecurityEvent('role_changed', {
    userId: user.id,
    event,
    metadata: { target_user_id: targetUserId, house_id: houseId, role },
  });

  return { data: result.data };
});
