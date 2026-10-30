import {
  verifyAuthCompat,
  ensureHouseMember,
} from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const query = getQuery(event);
  const { house_id, page = '1', limit = '20' } = query;

  if (!house_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'House ID is required',
    });
  }

  // Verify user is member of house
  await ensureHouseMember(house_id as string, user.id);

  const repos = getRepositories();

  const pageNum = Math.max(1, Number.parseInt(page as string, 10) || 1);
  const limitNum = Math.min(
    Math.max(1, Number.parseInt(limit as string, 10) || 20),
    100,
  );

  const { data, error, total } = await repos.expenses.getByHouse(
    house_id as string,
    { page: pageNum, limit: limitNum },
  );

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error,
    });
  }

  return {
    data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: total || 0,
      total_pages: Math.ceil((total || 0) / limitNum),
    },
  };
});
