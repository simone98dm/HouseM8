/**
 * Expenses Store Tests — real store with mocked dependencies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

import { useExpensesApi } from '~/composables/useExpensesApi';
import { useUserStore } from '~/stores/user';
import { useHousesStore } from '~/stores/houses';
import { useNotificationStore } from '~/stores/notifications';
import { useExpensesStore } from '~/stores/expenses';
import {
  createMockExpense,
  createMockExpenseShare,
  createMockHouse,
} from '~/tests/utils';

vi.mock('~/composables/useExpensesApi', () => ({ useExpensesApi: vi.fn() }));
vi.mock('~/stores/user', () => ({ useUserStore: vi.fn() }));
vi.mock('~/stores/houses', () => ({ useHousesStore: vi.fn() }));
vi.mock('~/stores/notifications', () => ({ useNotificationStore: vi.fn() }));

describe('useExpensesStore', () => {
  let mockExpensesApi: {
    getHouseExpenses: ReturnType<typeof vi.fn>;
    getExpense: ReturnType<typeof vi.fn>;
    createExpense: ReturnType<typeof vi.fn>;
    updateExpense: ReturnType<typeof vi.fn>;
    deleteExpense: ReturnType<typeof vi.fn>;
    markShareAsPaid: ReturnType<typeof vi.fn>;
    markShareAsUnpaid: ReturnType<typeof vi.fn>;
  };
  let mockNotificationStore: { addNotification: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    setActivePinia(createPinia());

    mockExpensesApi = {
      getHouseExpenses: vi.fn(),
      getExpense: vi.fn(),
      createExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
      markShareAsPaid: vi.fn(),
      markShareAsUnpaid: vi.fn(),
    };
    mockNotificationStore = { addNotification: vi.fn() };

    vi.mocked(useExpensesApi).mockReturnValue(mockExpensesApi as any);
    vi.mocked(useUserStore).mockReturnValue({
      currentUser: { id: 'test-user-id', preferred_currency: 'EUR' },
    } as any);
    vi.mocked(useHousesStore).mockReturnValue({
      currentHouse: createMockHouse(),
    } as any);
    vi.mocked(useNotificationStore).mockReturnValue(
      mockNotificationStore as any,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('initializes with empty expenses array', () => {
      const store = useExpensesStore();
      expect(store.expenses).toEqual([]);
    });

    it('initializes with null currentExpense', () => {
      const store = useExpensesStore();
      expect(store.currentExpense).toBeNull();
    });

    it('initializes with isLoading false', () => {
      const store = useExpensesStore();
      expect(store.isLoading).toBe(false);
    });
  });

  describe('computed: unpaidExpenses', () => {
    it('returns expenses where current user has an unpaid share', async () => {
      const paidShare = createMockExpenseShare({
        user_id: 'test-user-id',
        is_paid: true,
      });
      const unpaidShare = createMockExpenseShare({
        user_id: 'test-user-id',
        is_paid: false,
      });
      const expWithPaid = createMockExpense({ id: 'e1', shares: [paidShare] });
      const expWithUnpaid = createMockExpense({
        id: 'e2',
        shares: [unpaidShare],
      });

      mockExpensesApi.getHouseExpenses.mockResolvedValue({
        data: [expWithPaid, expWithUnpaid],
      });
      const store = useExpensesStore();
      await store.loadHouseExpenses('house-1');

      expect(store.unpaidExpenses).toHaveLength(1);
      expect(store.unpaidExpenses[0]!.id).toBe('e2');
    });

    it('excludes expenses from other users', async () => {
      const otherShare = createMockExpenseShare({
        user_id: 'other-user',
        is_paid: false,
      });
      mockExpensesApi.getHouseExpenses.mockResolvedValue({
        data: [createMockExpense({ shares: [otherShare] })],
      });
      const store = useExpensesStore();
      await store.loadHouseExpenses('house-1');
      expect(store.unpaidExpenses).toHaveLength(0);
    });
  });

  describe('computed: expensesByCategory', () => {
    it('groups expenses under each of their categories', async () => {
      mockExpensesApi.getHouseExpenses.mockResolvedValue({
        data: [
          createMockExpense({ id: 'e1', categories: ['groceries'] }),
          createMockExpense({
            id: 'e2',
            categories: ['groceries', 'transport'],
          }),
          createMockExpense({ id: 'e3', categories: [] }),
        ],
      });
      const store = useExpensesStore();
      await store.loadHouseExpenses('house-1');
      expect(store.expensesByCategory['groceries']).toHaveLength(2);
      expect(store.expensesByCategory['transport']).toHaveLength(1);
      expect(store.expensesByCategory['uncategorized']).toHaveLength(1);
    });
  });

  describe('computed: totalAmount', () => {
    it('sums total_amount of all expenses', async () => {
      mockExpensesApi.getHouseExpenses.mockResolvedValue({
        data: [
          createMockExpense({ total_amount: 100 }),
          createMockExpense({ total_amount: 50 }),
        ],
      });
      const store = useExpensesStore();
      await store.loadHouseExpenses('house-1');
      expect(store.totalAmount).toBe(150);
    });
  });

  describe('loadHouseExpenses', () => {
    it('loads expenses and populates state', async () => {
      const mockExp = [createMockExpense({ id: 'e1' })];
      mockExpensesApi.getHouseExpenses.mockResolvedValue({ data: mockExp });
      const store = useExpensesStore();
      await store.loadHouseExpenses('house-1');
      expect(store.expenses).toEqual(mockExp);
      expect(store.isLoading).toBe(false);
    });

    it('falls back to housesStore.currentHouse.id when no arg', async () => {
      mockExpensesApi.getHouseExpenses.mockResolvedValue({ data: [] });
      const store = useExpensesStore();
      await store.loadHouseExpenses();
      expect(mockExpensesApi.getHouseExpenses).toHaveBeenCalledWith(
        'test-house-id',
      );
    });

    it('notifies and sets empty array when no house selected', async () => {
      vi.mocked(useHousesStore).mockReturnValue({ currentHouse: null } as any);
      const store = useExpensesStore();
      await store.loadHouseExpenses();
      expect(mockNotificationStore.addNotification).toHaveBeenCalled();
    });

    it('notifies when result has no data', async () => {
      mockExpensesApi.getHouseExpenses.mockResolvedValue(null);
      const store = useExpensesStore();
      await store.loadHouseExpenses('house-1');
      expect(store.expenses).toEqual([]);
      expect(mockNotificationStore.addNotification).toHaveBeenCalled();
    });
  });

  describe('createExpense', () => {
    const validData = {
      description: 'Dinner',
      total_amount: 60,
      user_ids: ['user-1', 'user-2'],
    };

    it('creates expense and prepends to state', async () => {
      const newExp = createMockExpense({ id: 'new-exp' });
      mockExpensesApi.createExpense.mockResolvedValue(newExp);
      const store = useExpensesStore();
      const result = await store.createExpense(validData);
      expect(result).toBe(true);
      expect(store.expenses[0]!.id).toBe('new-exp');
    });

    it('returns false and notifies when total_amount <= 0', async () => {
      const store = useExpensesStore();
      const result = await store.createExpense({
        ...validData,
        total_amount: 0,
      });
      expect(result).toBe(false);
      expect(mockExpensesApi.createExpense).not.toHaveBeenCalled();
    });

    it('returns false and notifies when user_ids is empty', async () => {
      const store = useExpensesStore();
      const result = await store.createExpense({ ...validData, user_ids: [] });
      expect(result).toBe(false);
      expect(mockExpensesApi.createExpense).not.toHaveBeenCalled();
    });

    it('returns false and notifies when no house selected', async () => {
      vi.mocked(useHousesStore).mockReturnValue({ currentHouse: null } as any);
      const store = useExpensesStore();
      const result = await store.createExpense(validData);
      expect(result).toBe(false);
    });

    it('returns false and notifies when API returns null', async () => {
      mockExpensesApi.createExpense.mockResolvedValue(null);
      const store = useExpensesStore();
      const result = await store.createExpense(validData);
      expect(result).toBe(false);
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('deleteExpense', () => {
    it('removes expense from state on success', async () => {
      mockExpensesApi.getHouseExpenses.mockResolvedValue({
        data: [
          createMockExpense({ id: 'e1' }),
          createMockExpense({ id: 'e2' }),
        ],
      });
      mockExpensesApi.deleteExpense.mockResolvedValue(true);
      const store = useExpensesStore();
      await store.loadHouseExpenses('house-1');
      const result = await store.deleteExpense('e1');
      expect(result).toBe(true);
      expect(store.expenses).toHaveLength(1);
      expect(store.expenses[0]!.id).toBe('e2');
    });

    it('returns false and notifies on failure', async () => {
      mockExpensesApi.deleteExpense.mockResolvedValue(false);
      const store = useExpensesStore();
      const result = await store.deleteExpense('e1');
      expect(result).toBe(false);
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('reset', () => {
    it('clears expenses and currentExpense', async () => {
      mockExpensesApi.getHouseExpenses.mockResolvedValue({
        data: [createMockExpense()],
      });
      const store = useExpensesStore();
      await store.loadHouseExpenses('house-1');
      store.reset();
      expect(store.expenses).toEqual([]);
      expect(store.currentExpense).toBeNull();
    });
  });

  describe('loadExpense', () => {
    it('loads and sets currentExpense', async () => {
      const expense = createMockExpense({ id: 'e-99' });
      vi.mocked(useHousesStore).mockReturnValue({
        currentHouse: { id: 'h-1' },
      } as any);
      mockExpensesApi.getExpense.mockResolvedValue(expense);
      const store = useExpensesStore();
      await store.loadExpense('e-99');
      expect(store.currentExpense).toEqual(expense);
    });

    it('notifies when expense not found', async () => {
      vi.mocked(useHousesStore).mockReturnValue({
        currentHouse: { id: 'h-1' },
      } as any);
      mockExpensesApi.getExpense.mockResolvedValue(null);
      const store = useExpensesStore();
      await store.loadExpense('nonexistent');
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('returns early when no house', async () => {
      vi.mocked(useHousesStore).mockReturnValue({ currentHouse: null } as any);
      const store = useExpensesStore();
      await store.loadExpense('e-1');
      expect(mockExpensesApi.getExpense).not.toHaveBeenCalled();
    });
  });

  describe('updateExpense', () => {
    it('updates expense in state and notifies success', async () => {
      const original = createMockExpense({ id: 'e-1', description: 'Old' });
      const updated = createMockExpense({ id: 'e-1', description: 'New' });
      mockExpensesApi.getHouseExpenses.mockResolvedValue({ data: [original] });
      mockExpensesApi.updateExpense.mockResolvedValue(updated);
      const store = useExpensesStore();
      await store.loadHouseExpenses('house-1');
      const result = await store.updateExpense('e-1', { description: 'New' });
      expect(result).toBe(true);
      expect(store.expenses[0]?.description).toBe('New');
    });

    it('also updates currentExpense when it matches', async () => {
      const original = createMockExpense({ id: 'e-1' });
      const updated = createMockExpense({ id: 'e-1', description: 'Updated' });
      vi.mocked(useHousesStore).mockReturnValue({
        currentHouse: { id: 'h-1' },
      } as any);
      mockExpensesApi.getExpense.mockResolvedValue(original);
      mockExpensesApi.getHouseExpenses.mockResolvedValue({ data: [original] });
      mockExpensesApi.updateExpense.mockResolvedValue(updated);
      const store = useExpensesStore();
      await store.loadHouseExpenses('house-1');
      await store.loadExpense('e-1');
      await store.updateExpense('e-1', { description: 'Updated' });
      expect(store.currentExpense?.description).toBe('Updated');
    });

    it('returns false and notifies when API returns null', async () => {
      mockExpensesApi.updateExpense.mockResolvedValue(null);
      const store = useExpensesStore();
      const result = await store.updateExpense('e-1', { description: 'X' });
      expect(result).toBe(false);
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('deleteExpense clears currentExpense', () => {
    it('clears currentExpense when deleted expense is the current one', async () => {
      const expense = createMockExpense({ id: 'e-curr' });
      mockExpensesApi.getHouseExpenses.mockResolvedValue({ data: [expense] });
      mockExpensesApi.getExpense.mockResolvedValue(expense);
      mockExpensesApi.deleteExpense.mockResolvedValue(true);
      vi.mocked(useHousesStore).mockReturnValue({
        currentHouse: { id: 'h-1' },
      } as any);
      const store = useExpensesStore();
      await store.loadHouseExpenses('house-1');
      await store.loadExpense('e-curr');
      expect(store.currentExpense?.id).toBe('e-curr');
      await store.deleteExpense('e-curr');
      expect(store.currentExpense).toBeNull();
    });
  });

  describe('initialize', () => {
    it('skips when no current house', async () => {
      vi.mocked(useHousesStore).mockReturnValue({ currentHouse: null } as any);
      const store = useExpensesStore();
      await store.initialize();
      expect(mockExpensesApi.getHouseExpenses).not.toHaveBeenCalled();
    });

    it('loads when expenses empty', async () => {
      mockExpensesApi.getHouseExpenses.mockResolvedValue({
        data: [createMockExpense()],
      });
      vi.mocked(useHousesStore).mockReturnValue({
        currentHouse: { id: 'h-1' },
      } as any);
      const store = useExpensesStore();
      await store.initialize();
      expect(mockExpensesApi.getHouseExpenses).toHaveBeenCalled();
    });

    it('skips when expenses already loaded', async () => {
      mockExpensesApi.getHouseExpenses.mockResolvedValue({
        data: [createMockExpense()],
      });
      vi.mocked(useHousesStore).mockReturnValue({
        currentHouse: { id: 'h-1' },
      } as any);
      const store = useExpensesStore();
      await store.loadHouseExpenses('h-1');
      mockExpensesApi.getHouseExpenses.mockClear();
      await store.initialize();
      expect(mockExpensesApi.getHouseExpenses).not.toHaveBeenCalled();
    });

    it('force-refreshes when forceRefresh=true', async () => {
      mockExpensesApi.getHouseExpenses.mockResolvedValue({
        data: [createMockExpense()],
      });
      vi.mocked(useHousesStore).mockReturnValue({
        currentHouse: { id: 'h-1' },
      } as any);
      const store = useExpensesStore();
      await store.loadHouseExpenses('h-1');
      mockExpensesApi.getHouseExpenses.mockClear();
      await store.initialize(true);
      expect(mockExpensesApi.getHouseExpenses).toHaveBeenCalled();
    });
  });
});
