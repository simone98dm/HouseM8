import {
  verifyAuthCompat,
  ensureHouseMember,
} from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { z } from 'zod';

const createNoteSchema = z.object({
  house_id: z.string().uuid(),
  message: z.string().min(1).max(1000),
  dismiss_date: z.coerce.date().optional().nullable(),
});

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const { house_id, message, dismiss_date } = await readValidatedBody(
    event,
    createNoteSchema.parse,
  );

  // Verify user has access to this house
  await ensureHouseMember(house_id, user.id);

  const repos = getRepositories();
  const { data, error } = await repos.bulletinNotes.create({
    house_id,
    user_id: user.id,
    message: message.trim(),
    dismiss_date: dismiss_date ? dismiss_date.toISOString() : null,
  });

  if (error) {
    throw createError({
      statusCode: 500,
      message: error,
    });
  }

  if (!data) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create bulletin note',
    });
  }

  return data;
});
