import {
  verifyAuthCompat,
  ensureHouseMember,
} from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const query = getQuery(event);
  const { house_id } = query;

  if (!house_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'House ID is required',
    });
  }

  // Verify user is member of house
  await ensureHouseMember(house_id as string, user.id);

  const repos = getRepositories();
  const { data, error } = await repos.bills.getByHouse(house_id as string, {
    activeOnly: true,
  });

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error,
    });
  }

  return { data };
});
