import { z } from 'zod';
import { categoriesSchema } from '~~/server/utils/categories-schema';
import {
  verifyAuthCompat,
  ensureHouseMember,
} from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { logger } from '~~/server/utils/logger';

const updateBillSchema = z.object({
  description: z.string().min(1).max(500).optional(),
  monthly_cost: z.number().positive().max(1_000_000).optional(),
  payment_period: z.number().int().positive().max(120).optional(),
  next_due_date: z.string().date().optional(),
  active: z.boolean().optional(),
  categories: categoriesSchema.optional(),
});

export default defineEventHandler(async (event) => {
  try {
    const user = await verifyAuthCompat(event);
    const billId = getRouterParam(event, 'id');
    const body = await readValidatedBody(event, updateBillSchema.parse);

    if (!billId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bill ID is required',
      });
    }

    const repos = getRepositories();

    // Get bill to verify house membership
    const bill = await repos.bills.getById(billId);
    if (bill.error || !bill.data) {
      throw createError({
        statusCode: 404,
        statusMessage: bill.error || 'Bill not found',
      });
    }

    // Verify user is member of house
    await ensureHouseMember(bill.data.house_id, user.id);

    // Update bill
    const { data, error } = await repos.bills.update(billId, body);
    if (error || !data) {
      throw createError({
        statusCode: 500,
        statusMessage: error || 'Failed to update bill',
      });
    }

    return { success: true, data };
  } catch (error) {
    logger.error(error);
    throw error;
  }
});
