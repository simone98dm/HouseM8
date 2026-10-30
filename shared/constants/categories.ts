/**
 * Fixed set of expense/bill categories. Stored as these keys (the DB CHECK in
 * `20261028100000_expense_categories_recurring.sql` mirrors this list) and
 * translated at display time via `categories.<key>`.
 */
export const EXPENSE_CATEGORIES = [
  'groceries',
  'rent',
  'utilities',
  'subscriptions',
  'transport',
  'dining',
  'household',
  'health',
  'entertainment',
  'travel',
  'gifts',
  'other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const MAX_EXPENSE_CATEGORIES = 3;
