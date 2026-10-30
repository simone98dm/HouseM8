import {
  verifyAuthCompat,
  ensureExpenseCreator,
} from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const expenseId = getRouterParam(event, 'id');

  if (!expenseId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Expense ID is required',
    });
  }

  // Verify user created this expense
  await ensureExpenseCreator(expenseId, user.id);

  const repos = getRepositories();
  const { error } = await repos.expenses.delete(expenseId);

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error,
    });
  }

  return { success: true };
});
