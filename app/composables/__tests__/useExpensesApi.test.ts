import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useApi } from '~/composables/useApi';

vi.mock('~/composables/useApi', () => ({
  useApi: vi.fn(),
}));

describe('useExpensesApi', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockFetch = vi.fn();
    vi.mocked(useApi).mockReturnValue({ fetch: mockFetch } as any);
  });

  describe('getHouseExpenses', () => {
    it('fetches expenses with default pagination', async () => {
      const { useExpensesApi } = await import('~/composables/useExpensesApi');
      const mockResponse = {
        data: [{ id: 'e-1', description: 'Groceries' }],
        pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
      };
      mockFetch.mockResolvedValue(mockResponse);

      const { getHouseExpenses } = useExpensesApi();
      const result = await getHouseExpenses('h-1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/expenses',
        { params: { house_id: 'h-1', page: '1', limit: '20' } },
        false,
      );
      expect(result).toEqual(mockResponse);
    });

    it('passes custom page and limit', async () => {
      const { useExpensesApi } = await import('~/composables/useExpensesApi');
      mockFetch.mockResolvedValue({
        data: [],
        pagination: { page: 2, limit: 10, total: 0, total_pages: 0 },
      });

      const { getHouseExpenses } = useExpensesApi();
      await getHouseExpenses('h-1', 2, 10);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/expenses',
        { params: { house_id: 'h-1', page: '2', limit: '10' } },
        false,
      );
    });

    it('returns null on error', async () => {
      const { useExpensesApi } = await import('~/composables/useExpensesApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { getHouseExpenses } = useExpensesApi();
      const result = await getHouseExpenses('h-1');

      expect(result).toBeNull();
    });
  });

  describe('getExpense', () => {
    it('fetches single expense by ID', async () => {
      const { useExpensesApi } = await import('~/composables/useExpensesApi');
      const mockExpense = { id: 'e-1', description: 'Electricity' };
      mockFetch.mockResolvedValue({ data: mockExpense });

      const { getExpense } = useExpensesApi();
      const result = await getExpense('e-1', 'h-1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/expenses/e-1',
        { params: { house_id: 'h-1' } },
        false,
      );
      expect(result).toEqual(mockExpense);
    });

    it('returns null on error', async () => {
      const { useExpensesApi } = await import('~/composables/useExpensesApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { getExpense } = useExpensesApi();
      const result = await getExpense('e-1', 'h-1');

      expect(result).toBeNull();
    });
  });

  describe('createExpense', () => {
    it('creates expense and returns it', async () => {
      const { useExpensesApi } = await import('~/composables/useExpensesApi');
      const payload = {
        house_id: 'house-1',
        description: 'New Expense',
        total_amount: 50,
        user_ids: ['u-1'],
      };
      const mockExpense = { id: 'e-new', ...payload };
      // The endpoint answers with an envelope, not the bare expense. This mock
      // previously returned the bare object, which is why the composable
      // returning `{ data: ... }` unwrapped went unnoticed.
      mockFetch.mockResolvedValue({ data: mockExpense });

      const { createExpense } = useExpensesApi();
      const result = await createExpense(payload);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/expenses',
        { method: 'POST', body: payload },
        false,
      );
      expect(result).toEqual(mockExpense);
    });

    it('returns null on error', async () => {
      const { useExpensesApi } = await import('~/composables/useExpensesApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { createExpense } = useExpensesApi();
      const result = await createExpense({
        house_id: 'house-1',
        description: 'x',
        total_amount: 1,
        user_ids: [],
      });

      expect(result).toBeNull();
    });
  });

  describe('updateExpense', () => {
    it('updates expense and returns it', async () => {
      const { useExpensesApi } = await import('~/composables/useExpensesApi');
      const updates = { description: 'Updated', total_amount: 75 };
      const mockExpense = { id: 'e-1', ...updates };
      mockFetch.mockResolvedValue({ data: mockExpense });

      const { updateExpense } = useExpensesApi();
      const result = await updateExpense('e-1', updates);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/expenses/e-1',
        { method: 'PUT', body: updates },
        false,
      );
      expect(result).toEqual(mockExpense);
    });

    it('returns null on error', async () => {
      const { useExpensesApi } = await import('~/composables/useExpensesApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { updateExpense } = useExpensesApi();
      const result = await updateExpense('e-1', {});

      expect(result).toBeNull();
    });
  });

  describe('deleteExpense', () => {
    it('deletes expense and returns true', async () => {
      const { useExpensesApi } = await import('~/composables/useExpensesApi');
      mockFetch.mockResolvedValue(undefined);

      const { deleteExpense } = useExpensesApi();
      const result = await deleteExpense('e-1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/expenses/e-1',
        { method: 'DELETE' },
        false,
      );
      expect(result).toBe(true);
    });

    it('returns false on error', async () => {
      const { useExpensesApi } = await import('~/composables/useExpensesApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { deleteExpense } = useExpensesApi();
      const result = await deleteExpense('e-1');

      expect(result).toBe(false);
    });
  });
});
