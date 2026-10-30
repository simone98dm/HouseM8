import { z } from 'zod';
import {
  verifyAuthCompat,
  ensureHouseAdmin,
} from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';

const paramsSchema = z.object({ id: z.string().uuid() });

/**
 * GET /api/houses/:id/invitation/code
 * The house's current shareable join code, or null. Admins only: the same
 * people who can generate one.
 */
export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const { id: houseId } = await getValidatedRouterParams(
    event,
    paramsSchema.parse,
  );

  await ensureHouseAdmin(houseId, user.id);

  const result = await getRepositories().houses.getActiveInviteCode(houseId);
  if (result.error) {
    throw createError({ statusCode: 500, message: 'Internal server error' });
  }
  return { data: result.data };
});
