import { z } from 'zod';
import { getRepositories } from '~~/server/repositories/factory';

// Public on purpose (a logged-out invitee sees who invited them before
// signing up), so it is token-scoped and returns only what the card needs:
// house name and member count. Rate limit: server/middleware/rate-limit.ts.
const tokenSchema = z.string().uuid();

export default defineEventHandler(async (event) => {
  const parsed = tokenSchema.safeParse(getRouterParam(event, 'token'));
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid token' });
  }

  const { data } = await getRepositories().houses.getInvitationPreview(
    parsed.data,
  );

  // Unknown, used and expired tokens are indistinguishable to the caller.
  if (!data) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Invitation not found or expired',
    });
  }

  return {
    data: { house_name: data.house_name, member_count: data.member_count },
  };
});
