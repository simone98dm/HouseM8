import type { Bill } from '~/types';
import type { ExpenseCategory } from '~~/shared/constants/categories';

/**
 * Layer 4: API Composable for Bills
 *
 * Responsibilities:
 * - Make HTTP requests via useApi()
 * - Map DTOs to domain objects
 * - Return typed data or null on error
 * - NO business logic
 * - NO state management
 * - NO notifications (stores handle this)
 */
export const useBillsApi = () => {
  const api = useApi();
  const baseUrl = '/api/bills';

  /**
   * Get all bills for a house
   */
  const getHouseBills = async (houseId: string): Promise<Bill[] | null> => {
    try {
      const result = await api.fetch<{ data: Bill[] }>(baseUrl, {
        params: { house_id: houseId },
      });
      return result.data;
    } catch {
      return null;
    }
  };

  /**
   * Get a single bill by ID
   */
  const getBill = async (billId: string): Promise<Bill | null> => {
    try {
      const result = await api.fetch<{ data: Bill }>(`${baseUrl}/${billId}`);
      return result.data;
    } catch {
      return null;
    }
  };

  /**
   * Create a new bill
   */
  const createBill = async (data: {
    house_id: string;
    description: string;
    monthly_cost: number;
    next_due_date: string;
    payment_period: number;
    currency: string;
    categories?: ExpenseCategory[];
  }): Promise<Bill | null> => {
    try {
      const result = await api.fetch<{ data: Bill }>(baseUrl, {
        method: 'POST',
        body: data,
      });
      return result.data;
    } catch {
      return null;
    }
  };

  /**
   * Update an existing bill
   */
  const updateBill = async (
    billId: string,
    updates: {
      description?: string;
      monthly_cost?: number;
      next_due_date?: string;
      payment_period?: number;
      currency?: string;
      categories?: ExpenseCategory[];
      active?: boolean;
    },
  ): Promise<Bill | null> => {
    try {
      const result = await api.fetch<{ data: Bill }>(`${baseUrl}/${billId}`, {
        method: 'PUT',
        body: updates,
      });
      return result.data;
    } catch {
      return null;
    }
  };

  /**
   * Delete a bill
   */
  const deleteBill = async (billId: string): Promise<boolean> => {
    try {
      await api.fetch(`${baseUrl}/${billId}`, { method: 'DELETE' });
      return true;
    } catch {
      return false;
    }
  };

  const advanceBill = async (billId: string): Promise<Bill | null> => {
    try {
      const result = await api.fetch<{ data: Bill }>(
        `${baseUrl}/${billId}/advance`,
        {
          method: 'POST',
        },
      );
      return result.data;
    } catch {
      return null;
    }
  };

  return {
    getHouseBills,
    getBill,
    createBill,
    updateBill,
    deleteBill,
    advanceBill,
  };
};
