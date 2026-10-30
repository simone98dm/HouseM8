import {
  verifyAuthCompat,
  ensureBillCreator,
} from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const billId = getRouterParam(event, 'id');

  if (!billId) {
    throw createError({ statusCode: 400, statusMessage: 'Bill ID required' });
  }

  await ensureBillCreator(billId, user.id);

  const repos = getRepositories();
  const { data: bill, error } = await repos.bills.advanceDueDate(billId);

  if (error || !bill) {
    throw createError({
      statusCode: 500,
      statusMessage: error ?? 'Failed to advance bill',
    });
  }

  return { data: bill };
});
