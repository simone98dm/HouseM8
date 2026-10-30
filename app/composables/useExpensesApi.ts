import type { Expense, CreateExpensePayload, ExpenseFilters } from '~/types';

/**
 * Layer 4: API Composable for Expenses
 *
 * Responsibilities:
 * - Make HTTP requests via useApi()
 * - Map DTOs to domain objects
 * - Return typed data or null on error
 * - NO business logic
 * - NO state management
 * - NO notifications (stores handle this)
 */
export const useExpensesApi = () => {
  const api = useApi();
  const baseUrl = '/api/expenses';

  /**
   * Get expenses for a specific house
   */
  async function getHouseExpenses(
    houseId: string,
    page: number = 1,
    limit: number = 20,
    filters?: ExpenseFilters,
  ): Promise<{
    data: Expense[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  } | null> {
    try {
      const params: Record<string, string> = {
        house_id: houseId,
        page: page.toString(),
        limit: limit.toString(),
      };

      if (filters?.isPaid !== undefined) {
        params.status = filters.isPaid ? 'settled' : 'pending';
      }
      if (filters?.createdBy) {
        params.user_id = filters.createdBy;
      }
      if (filters?.category) {
        params.category = filters.category;
      }
      if (filters?.dateFrom) {
        params.date_from = filters.dateFrom;
      }
      if (filters?.dateTo) {
        params.date_to = filters.dateTo;
      }

      const result = await api.fetch<{
        data: Expense[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          total_pages: number;
        };
      }>(baseUrl, { params }, false);

      return result;
    } catch {
      return null;
    }
  }

  /**
   * Get a single expense by ID
   */
  async function getExpense(
    expenseId: string,
    houseId: string,
  ): Promise<Expense | null> {
    try {
      const result = await api.fetch<{ data: Expense }>(
        `${baseUrl}/${expenseId}`,
        {
          params: { house_id: houseId },
        },
        false,
      );
      return result.data;
    } catch {
      return null;
    }
  }

  /**
   * Create a new expense
   */
  async function createExpense(
    input: CreateExpensePayload & { house_id: string },
  ): Promise<Expense | null> {
    try {
      // The endpoint answers `{ data: expense }`. Typing that envelope as
      // `Expense` and returning it whole handed the store `{ data: {...} }`,
      // which it unshifted into the list — an entry with no id/description, so
      // the new expense never appeared and the page looked like it hadn't
      // refreshed. `getExpense` already unwraps; this now matches it.
      const result = await api.fetch<{ data: Expense }>(
        baseUrl,
        {
          method: 'POST',
          body: input,
        },
        false,
      );
      return result.data;
    } catch {
      return null;
    }
  }

  /**
   * Update an existing expense
   */
  async function updateExpense(
    expenseId: string,
    input: Partial<CreateExpensePayload>,
  ): Promise<Expense | null> {
    try {
      // Same envelope as createExpense: unwrap, don't return `{ data: ... }`.
      const result = await api.fetch<{ data: Expense }>(
        `${baseUrl}/${expenseId}`,
        {
          method: 'PUT',
          body: input,
        },
        false,
      );
      return result.data;
    } catch {
      return null;
    }
  }

  /**
   * Delete an expense
   */
  async function deleteExpense(expenseId: string): Promise<boolean> {
    try {
      await api.fetch(`${baseUrl}/${expenseId}`, { method: 'DELETE' }, false);
      return true;
    } catch {
      return false;
    }
  }

  return {
    getHouseExpenses,
    getExpense,
    createExpense,
    updateExpense,
    deleteExpense,
  };
};
