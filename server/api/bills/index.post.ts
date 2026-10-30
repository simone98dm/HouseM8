import {
  verifyAuthCompat,
  ensureHouseMember,
} from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { logger } from '~~/server/utils/logger';
import { z } from 'zod';
import { categoriesSchema } from '~~/server/utils/categories-schema';

const createBillSchema = z.object({
  house_id: z.string().uuid(),
  description: z.string().min(1).max(500),
  monthly_cost: z.number().positive().max(1_000_000),
  payment_period: z.number().int().positive().max(120).optional().default(1),
  next_due_date: z.string().date(),
  categories: categoriesSchema.optional().default([]),
});

export default defineEventHandler(async (event) => {
  try {
    const user = await verifyAuthCompat(event);
    const body = await readValidatedBody(event, createBillSchema.parse);

    // Verify user is member of house
    await ensureHouseMember(body.house_id, user.id);

    const repos = getRepositories();
    const { data, error } = await repos.bills.create({
      house_id: body.house_id,
      description: body.description,
      monthly_cost: body.monthly_cost,
      payment_period: body.payment_period,
      next_due_date: body.next_due_date,
      created_by: user.id,
      active: true,
      categories: body.categories,
    });

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: error,
      });
    }

    if (!data) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create bill',
      });
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    logger.error(error);
    throw error;
  }
});
