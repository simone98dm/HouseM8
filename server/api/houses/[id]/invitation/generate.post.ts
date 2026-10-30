import { z } from 'zod';
import {
  verifyAuthCompat,
  ensureHouseAdmin,
} from '~~/server/utils/repository-auth';
import { createHouseInvite } from '~~/server/utils/house-invitations';

const generateSchema = z
  .object({
    // Optional: if provided, the invite email (with both link and code) is sent
    email: z.string().email().optional(),
  })
  .optional();

export default defineEventHandler(async (event) => {
  try {
    const user = await verifyAuthCompat(event);
    const houseId = getRouterParam(event, 'id');

    if (!houseId) {
      throw createError({ statusCode: 400, message: 'House ID is required' });
    }

    await ensureHouseAdmin(houseId, user.id);

    const body = await readBody(event).catch(() => null);
    const parsed = generateSchema.safeParse(body);
    const inviteeEmail =
      parsed.success && parsed.data?.email ? parsed.data.email : null;

    const invite = await createHouseInvite({
      houseId,
      inviter: { id: user.id, email: user.email },
      inviteeEmail,
    });

    return { data: invite };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    throw createError({ statusCode: 500, message: 'Internal server error' });
  }
});
