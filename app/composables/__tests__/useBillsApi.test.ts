import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useApi } from '~/composables/useApi';

vi.mock('~/composables/useApi', () => ({
  useApi: vi.fn(),
}));

describe('useBillsApi', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockFetch = vi.fn();
    vi.mocked(useApi).mockReturnValue({ fetch: mockFetch } as any);
  });

  describe('getHouseBills', () => {
    it('fetches bills for a house', async () => {
      const { useBillsApi } = await import('~/composables/useBillsApi');
      const mockBills = [{ id: 'b-1', description: 'Rent' }];
      mockFetch.mockResolvedValue({ data: mockBills });

      const { getHouseBills } = useBillsApi();
      const result = await getHouseBills('house-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/bills', {
        params: { house_id: 'house-1' },
      });
      expect(result).toEqual(mockBills);
    });

    it('returns null on error', async () => {
      const { useBillsApi } = await import('~/composables/useBillsApi');
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { getHouseBills } = useBillsApi();
      const result = await getHouseBills('house-1');

      expect(result).toBeNull();
    });
  });

  describe('getBill', () => {
    it('fetches a single bill by ID', async () => {
      const { useBillsApi } = await import('~/composables/useBillsApi');
      const mockBill = { id: 'b-1', description: 'Electricity' };
      mockFetch.mockResolvedValue({ data: mockBill });

      const { getBill } = useBillsApi();
      const result = await getBill('b-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/bills/b-1');
      expect(result).toEqual(mockBill);
    });

    it('returns null on error', async () => {
      const { useBillsApi } = await import('~/composables/useBillsApi');
      mockFetch.mockRejectedValue(new Error('Not found'));

      const { getBill } = useBillsApi();
      const result = await getBill('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createBill', () => {
    it('creates a new bill', async () => {
      const { useBillsApi } = await import('~/composables/useBillsApi');
      const newBill = {
        house_id: 'house-1',
        description: 'New Bill',
        monthly_cost: 100,
        next_due_date: '2025-12-01',
        payment_period: 1,
        currency: 'USD',
      };
      const mockBill = { id: 'b-new', ...newBill };
      mockFetch.mockResolvedValue({ data: mockBill });

      const { createBill } = useBillsApi();
      const result = await createBill(newBill);

      expect(mockFetch).toHaveBeenCalledWith('/api/bills', {
        method: 'POST',
        body: newBill,
      });
      expect(result).toEqual(mockBill);
    });

    it('returns null on creation error', async () => {
      const { useBillsApi } = await import('~/composables/useBillsApi');
      mockFetch.mockRejectedValue(new Error('Validation error'));

      const { createBill } = useBillsApi();
      const result = await createBill({
        house_id: 'house-1',
        description: 'x',
        monthly_cost: 0,
        next_due_date: '',
        payment_period: 1,
        currency: 'USD',
      });

      expect(result).toBeNull();
    });
  });

  describe('updateBill', () => {
    it('updates an existing bill', async () => {
      const { useBillsApi } = await import('~/composables/useBillsApi');
      const updates = { description: 'Updated Bill', monthly_cost: 150 };
      const mockBill = { id: 'b-1', ...updates };
      mockFetch.mockResolvedValue({ data: mockBill });

      const { updateBill } = useBillsApi();
      const result = await updateBill('b-1', updates);

      expect(mockFetch).toHaveBeenCalledWith('/api/bills/b-1', {
        method: 'PUT',
        body: updates,
      });
      expect(result?.description).toBe('Updated Bill');
    });

    it('returns null on update error', async () => {
      const { useBillsApi } = await import('~/composables/useBillsApi');
      mockFetch.mockRejectedValue(new Error('Update failed'));

      const { updateBill } = useBillsApi();
      const result = await updateBill('b-1', {});

      expect(result).toBeNull();
    });
  });

  describe('deleteBill', () => {
    it('deletes a bill and returns true', async () => {
      const { useBillsApi } = await import('~/composables/useBillsApi');
      mockFetch.mockResolvedValue({});

      const { deleteBill } = useBillsApi();
      const result = await deleteBill('b-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/bills/b-1', {
        method: 'DELETE',
      });
      expect(result).toBe(true);
    });

    it('returns false on delete error', async () => {
      const { useBillsApi } = await import('~/composables/useBillsApi');
      mockFetch.mockRejectedValue(new Error('Delete failed'));

      const { deleteBill } = useBillsApi();
      const result = await deleteBill('b-1');

      expect(result).toBe(false);
    });
  });
});
