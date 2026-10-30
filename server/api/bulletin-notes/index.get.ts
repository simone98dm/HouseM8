import {
  verifyAuthCompat,
  ensureHouseMember,
} from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const { house_id } = getQuery(event);

  if (!house_id) {
    throw createError({
      statusCode: 400,
      message: 'house_id is required',
    });
  }

  // Verify user has access to this house
  await ensureHouseMember(house_id as string, user.id);

  const repos = getRepositories();
  const { data, error } = await repos.bulletinNotes.getByHouse(
    house_id as string,
    {
      activeOnly: true,
    },
  );

  if (error) {
    throw createError({
      statusCode: 500,
      message: error,
    });
  }

  return data || [];
});
