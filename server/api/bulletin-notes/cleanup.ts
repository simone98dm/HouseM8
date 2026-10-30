/**
 * No `.post` suffix, deliberately: Vercel Cron invokes its target with a **GET**
 * request and cannot be configured otherwise, so a `.post.ts` handler would
 * return 405 on every scheduled run. A method-agnostic handler serves the cron
 * (GET) and the existing POST callers unchanged. Scheduled in vercel.json.
 */
import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { isCronRequest } from '~~/server/utils/cron-auth';
import { getRepositories } from '~~/server/repositories/factory';

export default defineEventHandler(async (event) => {
  // The comment here used to say "could also be a cron job" while the auth
  // made that impossible: verifyAuthCompat requires a user session, which a
  // scheduler does not have, so every cron run would 401. Accept a valid cron
  // credential OR a signed-in user; user behaviour is unchanged.
  if (!isCronRequest(event)) {
    await verifyAuthCompat(event);
  }

  const repos = getRepositories();
  const result = await repos.bulletinNotes.cleanup();

  if (result.error) {
    throw createError({
      statusCode: 500,
      message: result.error,
    });
  }

  return { success: true, message: 'Expired notes deleted' };
});
