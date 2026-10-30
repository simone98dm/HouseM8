import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const query = getQuery(event);
  const { current } = query;

  const repos = getRepositories();

  if (current === 'true') {
    // Get current user's house
    const { data, error } = await repos.houses.getCurrentForUser(user.id);

    // If there's an actual error (not just "no house"), throw it
    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: error,
      });
    }

    // Return null if user has no active house - this is valid
    return { data: data || null };
  }

  // Default to returning current user's house — never expose all houses
  const { data, error } = await repos.houses.getCurrentForUser(user.id);

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error,
    });
  }

  return { data: data || null };
});
