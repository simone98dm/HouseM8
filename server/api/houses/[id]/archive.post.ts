import {
  verifyAuthCompat,
  ensureHouseOwner,
} from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';

/**
 * Archive a house. Owner only.
 *
 * Houses are never hard-deleted: `houses.status` moves to 'archived', which the
 * schema already allowed but nothing ever set. Archiving is also the owner's
 * only exit — there is exactly one owner per house and no ownership transfer,
 * so `leave` refuses them (see houses/[id]/leave.post.ts).
 */
export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const houseId = getRouterParam(event, 'id');

  if (!houseId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'House ID is required',
    });
  }

  await ensureHouseOwner(houseId, user.id);

  const repos = getRepositories();
  const { error } = await repos.houses.archiveHouse(houseId);

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error || 'Failed to archive house',
    });
  }

  return { success: true, status: 'archived' };
});
