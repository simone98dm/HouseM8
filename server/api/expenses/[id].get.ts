import {
  verifyAuthCompat,
  ensureHouseMember,
} from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const expenseId = getRouterParam(event, 'id');
  const query = getQuery(event);
  const { house_id } = query;

  if (!expenseId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Expense ID is required',
    });
  }

  if (!house_id || typeof house_id !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'House ID is required',
    });
  }

  // Verify user is member of house
  await ensureHouseMember(house_id, user.id);

  const repos = getRepositories();

  // Get expense with shares
  const result = await repos.expenses.getById(expenseId);
  if (result.error || !result.data) {
    throw createError({
      statusCode: 404,
      statusMessage: result.error || 'Expense not found',
    });
  }

  // Verify expense belongs to the specified house
  if (result.data.house_id !== house_id) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Expense not found',
    });
  }

  return { data: result.data };
});
