import { z } from 'zod';
import {
  verifyAuthCompat,
  ensureHouseOwner,
} from '~~/server/utils/repository-auth';
import { transferHouseOwnership } from '~~/server/utils/house-ownership';

const bodySchema = z.object({
  user_id: z.string().uuid(),
});

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

  const { user_id: newOwnerId } = await readValidatedBody(
    event,
    bodySchema.parse,
  );
  await transferHouseOwnership(houseId, user.id, newOwnerId);

  return { data: { message: 'Ownership transferred' } };
});
