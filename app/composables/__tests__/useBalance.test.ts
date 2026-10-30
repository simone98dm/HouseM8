import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useApi } from '~/composables/useApi';

vi.mock('~/composables/useApi', () => ({
  useApi: vi.fn(),
}));

describe('useBalance', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockFetch = vi.fn();
    vi.mocked(useApi).mockReturnValue({ fetch: mockFetch } as any);
  });

  it('getHouseBalance calls correct URL and returns data', async () => {
    const { useBalance } = await import('~/composables/useBalance');
    const mockBalance = {
      house_id: 'h-1',
      currency: 'USD',
      user_balances: [],
      settlement_transactions: [],
      total_expenses: 0,
      is_balanced: true,
    };
    mockFetch.mockResolvedValue({ data: mockBalance });

    const { getHouseBalance } = useBalance();
    const result = await getHouseBalance('h-1');

    expect(mockFetch).toHaveBeenCalledWith('/api/balance/h-1', {}, true);
    expect(result.data).toEqual(mockBalance);
    expect(result.error).toBeNull();
  });

  it('getHouseBalance handles error with message in data', async () => {
    const { useBalance } = await import('~/composables/useBalance');
    mockFetch.mockRejectedValue({ data: { message: 'House not found' } });

    const { getHouseBalance } = useBalance();
    const result = await getHouseBalance('invalid-id');

    expect(result.data).toBeNull();
    expect(result.error).toBe('House not found');
  });

  it('getHouseBalance handles error with top-level message', async () => {
    const { useBalance } = await import('~/composables/useBalance');
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { getHouseBalance } = useBalance();
    const result = await getHouseBalance('h-1');

    expect(result.data).toBeNull();
    expect(result.error).toBe('Network error');
  });

  it('getHouseBalance uses fallback message when error has no message', async () => {
    const { useBalance } = await import('~/composables/useBalance');
    mockFetch.mockRejectedValue({});

    const { getHouseBalance } = useBalance();
    const result = await getHouseBalance('h-1');

    expect(result.data).toBeNull();
    expect(result.error).toBe('Failed to fetch balance');
  });

  it('getHouseBalance returns user balances and settlement transactions', async () => {
    const { useBalance } = await import('~/composables/useBalance');
    const mockBalance = {
      house_id: 'h-1',
      currency: 'USD',
      user_balances: [
        {
          user_id: 'u-1',
          user: {
            id: 'u-1',
            first_name: 'John',
            last_name: 'Doe',
            email: 'j@e.com',
          },
          total_paid: 100,
          total_owed: 50,
          net_balance: 50,
        },
      ],
      settlement_transactions: [
        {
          from_user_id: 'u-2',
          to_user_id: 'u-1',
          amount: 50,
          from_user: { id: 'u-2', first_name: 'Jane', last_name: 'Smith' },
          to_user: { id: 'u-1', first_name: 'John', last_name: 'Doe' },
        },
      ],
      total_expenses: 150,
      is_balanced: false,
    };
    mockFetch.mockResolvedValue({ data: mockBalance });

    const { getHouseBalance } = useBalance();
    const result = await getHouseBalance('h-1');

    expect(result.data?.user_balances).toHaveLength(1);
    expect(result.data?.settlement_transactions).toHaveLength(1);
    expect(result.data?.is_balanced).toBe(false);
  });

  describe('settleUserToUser', () => {
    it('calls correct URL with correct body and returns data', async () => {
      const { useBalance } = await import('~/composables/useBalance');
      mockFetch.mockResolvedValue({ data: { settlement_id: 's', amount: 3 } });

      const { settleUserToUser } = useBalance();
      const result = await settleUserToUser('h-1', 'u-from', 'u-to');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/houses/h-1/settle',
        {
          method: 'POST',
          body: { from_user_id: 'u-from', to_user_id: 'u-to' },
        },
        true,
      );
      expect(result.data).toEqual({ settlement_id: 's', amount: 3 });
      expect(result.error).toBeNull();
    });

    it('surfaces a 409 NOT_IN_PLAN as its code', async () => {
      const { useBalance } = await import('~/composables/useBalance');
      mockFetch.mockRejectedValue({
        statusCode: 409,
        data: { message: 'gone', data: { code: 'NOT_IN_PLAN' } },
      });
      const result = await useBalance().settleUserToUser('h', 'a', 'b');
      expect(result.error).toBe('NOT_IN_PLAN');
    });

    it('getRecentPayments reads the limited list', async () => {
      const { useBalance } = await import('~/composables/useBalance');
      mockFetch.mockResolvedValue({ data: [{ id: 'p' }] });
      const result = await useBalance().getRecentPayments('h-1');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/houses/h-1/settlements?limit=20',
        {},
        true,
      );
      expect(result.data).toEqual([{ id: 'p' }]);
    });

    it('handles error with message in data', async () => {
      const { useBalance } = await import('~/composables/useBalance');
      mockFetch.mockRejectedValue({ data: { message: 'Not authorized' } });

      const { settleUserToUser } = useBalance();
      const result = await settleUserToUser('h-1', 'u-1', 'u-2');

      expect(result.data).toBeNull();
      expect(result.error).toBe('Not authorized');
    });

    it('handles error with top-level message', async () => {
      const { useBalance } = await import('~/composables/useBalance');
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { settleUserToUser } = useBalance();
      const result = await settleUserToUser('h-1', 'u-1', 'u-2');

      expect(result.data).toBeNull();
      expect(result.error).toBe('Network error');
    });

    it('uses fallback message when error has no message', async () => {
      const { useBalance } = await import('~/composables/useBalance');
      mockFetch.mockRejectedValue({});

      const { settleUserToUser } = useBalance();
      const result = await settleUserToUser('h-1', 'u-1', 'u-2');

      expect(result.data).toBeNull();
      expect(result.error).toBe('Failed to settle transaction');
    });
  });

  describe('undoSettlement', () => {
    it('posts to the undo endpoint', async () => {
      const { useBalance } = await import('~/composables/useBalance');
      mockFetch.mockResolvedValue({ data: { reverted_count: 2 } });

      const result = await useBalance().undoSettlement('h-1', 's-1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/houses/h-1/settlements/s-1/undo',
        { method: 'POST' },
        true,
      );
      expect(result).toEqual({ data: { reverted_count: 2 }, error: null });
    });

    it('surfaces a 409 as its machine code', async () => {
      const { useBalance } = await import('~/composables/useBalance');
      mockFetch.mockRejectedValue({
        response: { status: 409 },
        data: {
          message: 'Undo window expired',
          data: { code: 'UNDO_WINDOW_EXPIRED' },
        },
      });

      const result = await useBalance().undoSettlement('h-1', 's-1');

      expect(result.data).toBeNull();
      expect(result.error).toBe('UNDO_WINDOW_EXPIRED');
    });

    it('falls back to the server message, then a default', async () => {
      const { useBalance } = await import('~/composables/useBalance');
      mockFetch.mockRejectedValueOnce({ data: { message: 'Forbidden' } });
      expect((await useBalance().undoSettlement('h', 's')).error).toBe(
        'Forbidden',
      );
      mockFetch.mockRejectedValueOnce({});
      expect((await useBalance().undoSettlement('h', 's')).error).toBe(
        'Failed to undo settlement',
      );
    });
  });
});
