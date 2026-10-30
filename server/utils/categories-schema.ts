import { z } from 'zod';
import {
  EXPENSE_CATEGORIES,
  MAX_EXPENSE_CATEGORIES,
} from '~~/shared/constants/categories';

/** Up to MAX_EXPENSE_CATEGORIES distinct keys; shared by expenses and bills. */
export const categoriesSchema = z
  .array(z.enum(EXPENSE_CATEGORIES))
  .max(MAX_EXPENSE_CATEGORIES)
  .refine((list) => new Set(list).size === list.length, 'Duplicate category');
