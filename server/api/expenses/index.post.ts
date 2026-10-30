import {
  verifyAuthCompat,
  ensureHouseMember,
} from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { z } from 'zod';
import { categoriesSchema } from '~~/server/utils/categories-schema';

// `expenses.due_date` is a DATE column and the form posts a bare YYYY-MM-DD
// from <input type="date">, which `.datetime()` alone rejects outright — that
// was a hard 400 on every expense carrying a due date. A full ISO datetime is
// still accepted: the API serialises due_date back as date-time, so a value
// read from the API and posted again stays valid. Postgres truncates the time
// on the way into the DATE column.
const dueDateSchema = z.union([
  z.string().date(),
  z.string().datetime({ offset: true }),
]);

// Exported so the validation itself is testable: every existing handler test
// mocks readValidatedBody, so the schema had no coverage at all.
export const createExpenseSchema = z.object({
  house_id: z.string().uuid(),
  description: z.string().min(1).max(500),
  total_amount: z.number().positive().max(1_000_000),
  currency: z.enum(['USD', 'EUR']).optional(),
  due_date: dueDateSchema.optional().nullable(),
  recurring: z.boolean().optional().default(false),
  recurring_period: z
    .enum(['weekly', 'monthly', 'yearly'])
    .optional()
    .nullable(),
  categories: categoriesSchema.optional().default([]),
  // Who paid; must belong to the house. Defaults to the current user.
  payer_id: z.string().uuid().optional(),
  user_ids: z.array(z.string().uuid()).min(1),
});

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const {
    house_id,
    description,
    total_amount,
    due_date,
    recurring,
    recurring_period,
    user_ids,
    currency,
    categories,
    payer_id,
  } = await readValidatedBody(event, createExpenseSchema.parse);

  // Verify user is member of house
  await ensureHouseMember(house_id, user.id);

  const repos = getRepositories();
  if (payer_id && payer_id !== user.id) {
    // Recording for someone else is only allowed when you share the cost,
    // so a member can't create a debt between two other housemates.
    if (!user_ids.includes(user.id)) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'You must be part of the split to record a payment by someone else',
      });
    }
    const payerIsMember = await repos.houses.isMember(house_id, payer_id);
    if (!payerIsMember) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Payer is not a member of this house',
      });
    }
  }

  // Get user's preferred currency or default to EUR
  let expenseCurrency = currency || 'EUR';

  if (!currency) {
    // If currency not provided, get from user's preferences
    const { data: userData } = await repos.users.getById(user.id);
    expenseCurrency = userData?.preferred_currency || 'EUR';
  }

  // Create expense with shares
  const { data: expense, error } = await repos.expenses.create({
    house_id,
    created_by: payer_id ?? user.id,
    description: description.trim(),
    total_amount,
    currency: expenseCurrency,
    due_date: due_date || null,
    recurring: recurring || false,
    recurring_period: recurring_period || null,
    categories,
    user_ids,
  });

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error,
    });
  }

  if (!expense) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create expense',
    });
  }

  return { data: expense };
});
