import {
  verifyAuthCompat,
  ensureHouseMember,
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

    const repos = getRepositories();

    // Get bill
    const result = await repos.bills.getById(billId);
    if (result.error || !result.data) {
      throw createError({
        statusCode: 404,
        statusMessage: result.error || 'Bill not found',
      });
    }

    // Verify user is member of house
    await ensureHouseMember(result.data.house_id, user.id);

    // Get documents for this bill
    const documentsResult = await repos.bills.getDocuments(billId);
    if (documentsResult.error) {
      throw createError({
        statusCode: 500,
        statusMessage: documentsResult.error,
      });
    }

    return {
      data: {
        ...result.data,
        documents: documentsResult.data || [],
      },
    };
  } catch (error) {
    logger.error(error);
    throw error;
  }
});
