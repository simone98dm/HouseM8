import { z } from 'zod';
import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';

const setupSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
});

/**
 * POST /api/user/complete-setup
 * Wizard Step 1: persist the user's name. The password is chosen earlier, on
 * the sign-up confirmation link (POST /api/auth/confirm), so it is never set
 * here: a session alone must not be able to replace it.
 */
export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const { firstName, lastName } = await readValidatedBody(
    event,
    setupSchema.parse,
  );

  const repos = getRepositories();

  // Guard: only callable before setup is complete (first_name not yet set).
  // This blocks repeat wizard invocations on already-set-up accounts.
  const { data: existing } = await repos.users.getById(user.id);
  if (existing?.first_name) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Setup already completed',
    });
  }

  // Update name fields
  const { error: updateError } = await repos.users.update(user.id, {
    first_name: firstName,
    last_name: lastName,
  });

  if (updateError) {
    throw createError({ statusCode: 500, statusMessage: updateError });
  }

  return { success: true };
});
