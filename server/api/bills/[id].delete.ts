import {
  verifyAuthCompat,
  ensureBillCreator,
} from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { logger } from '~~/server/utils/logger';

export default defineEventHandler(async (event) => {
  try {
    const user = await verifyAuthCompat(event);
    const billId = getRouterParam(event, 'id');

    if (!billId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bill ID is required',
      });
    }

    // Verify user created this bill or is house owner
    await ensureBillCreator(billId, user.id);

    const repos = getRepositories();
    const { error } = await repos.bills.delete(billId);

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: error,
      });
    }

    return { data: null };
  } catch (error) {
    logger.error(error);
    throw error;
  }
});
