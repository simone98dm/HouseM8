/**
 * Bills Store Tests — real store with mocked dependencies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

import { useBillsApi } from '~/composables/useBillsApi';
import { useHousesStore } from '~/stores/houses';
import { useNotificationStore } from '~/stores/notifications';
import { useBillsStore } from '~/stores/bills';
import { createMockBill, createMockHouse } from '~/tests/utils';

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }));
mockNuxtImport('navigateTo', () => navigateToMock);

vi.mock('~/composables/useBillsApi', () => ({ useBillsApi: vi.fn() }));
vi.mock('~/stores/houses', () => ({ useHousesStore: vi.fn() }));
vi.mock('~/stores/notifications', () => ({ useNotificationStore: vi.fn() }));

describe('useBillsStore', () => {
  let mockBillsApi: {
    getHouseBills: ReturnType<typeof vi.fn>;
    getBill: ReturnType<typeof vi.fn>;
    createBill: ReturnType<typeof vi.fn>;
    updateBill: ReturnType<typeof vi.fn>;
    deleteBill: ReturnType<typeof vi.fn>;
  };
  let mockNotificationStore: { addNotification: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    setActivePinia(createPinia());

    mockBillsApi = {
      getHouseBills: vi.fn(),
      getBill: vi.fn(),
      createBill: vi.fn(),
      updateBill: vi.fn(),
      deleteBill: vi.fn(),
    };
    mockNotificationStore = { addNotification: vi.fn() };

    vi.mocked(useBillsApi).mockReturnValue(mockBillsApi as any);
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
    it('initializes with empty bills array', () => {
      const store = useBillsStore();
      expect(store.bills).toEqual([]);
    });

    it('initializes with null currentBill', () => {
      const store = useBillsStore();
      expect(store.currentBill).toBeNull();
    });

    it('initializes with isLoading false', () => {
      const store = useBillsStore();
      expect(store.isLoading).toBe(false);
    });
  });

  describe('computed: upcomingBills', () => {
    it('includes bills due within 30 days', async () => {
      const now = new Date();
      const soon = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]!;
      const far = new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]!;
      mockBillsApi.getHouseBills.mockResolvedValue([
        createMockBill({ id: 'b1', next_due_date: soon }),
        createMockBill({ id: 'b2', next_due_date: far }),
      ]);
      const store = useBillsStore();
      await store.loadHouseBills('house-1');
      expect(store.upcomingBills).toHaveLength(1);
      expect(store.upcomingBills[0]!.id).toBe('b1');
    });

    it('includes a bill due exactly 30 days from now (boundary inclusive)', async () => {
      const now = new Date();
      const exactly30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]!;
      mockBillsApi.getHouseBills.mockResolvedValue([
        createMockBill({ id: 'boundary', next_due_date: exactly30 }),
      ]);
      const store = useBillsStore();
      await store.loadHouseBills('house-1');
      expect(store.upcomingBills).toHaveLength(1);
      expect(store.upcomingBills[0]!.id).toBe('boundary');
    });
  });

  describe('computed: overdueBills', () => {
    it('includes bills with past due dates', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]!;
      const future = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]!;
      mockBillsApi.getHouseBills.mockResolvedValue([
        createMockBill({ id: 'overdue', next_due_date: past }),
        createMockBill({ id: 'upcoming', next_due_date: future }),
      ]);
      const store = useBillsStore();
      await store.loadHouseBills('house-1');
      expect(store.overdueBills).toHaveLength(1);
      expect(store.overdueBills[0]!.id).toBe('overdue');
    });
  });

  describe('computed: totalMonthlyCost', () => {
    it('sums monthly_cost of all bills', async () => {
      mockBillsApi.getHouseBills.mockResolvedValue([
        createMockBill({ id: 'b1', monthly_cost: 100 }),
        createMockBill({ id: 'b2', monthly_cost: 50.5 }),
        createMockBill({ id: 'b3', monthly_cost: 25.75 }),
      ]);
      const store = useBillsStore();
      await store.loadHouseBills('house-1');
      expect(store.totalMonthlyCost).toBeCloseTo(176.25);
    });

    it('returns 0 for empty bills', () => {
      const store = useBillsStore();
      expect(store.totalMonthlyCost).toBe(0);
    });
  });

  describe('loadHouseBills', () => {
    it('loads bills from API and stores them', async () => {
      const mockBills = [
        createMockBill({ id: 'b1' }),
        createMockBill({ id: 'b2' }),
      ];
      mockBillsApi.getHouseBills.mockResolvedValue(mockBills);
      const store = useBillsStore();
      await store.loadHouseBills('house-1');
      expect(store.bills).toEqual(mockBills);
      expect(store.isLoading).toBe(false);
    });

    it('falls back to housesStore.currentHouse.id when no houseId arg', async () => {
      mockBillsApi.getHouseBills.mockResolvedValue([]);
      const store = useBillsStore();
      await store.loadHouseBills();
      expect(mockBillsApi.getHouseBills).toHaveBeenCalledWith('test-house-id');
    });

    it('notifies when no house is selected and no arg provided', async () => {
      vi.mocked(useHousesStore).mockReturnValue({ currentHouse: null } as any);
      const store = useBillsStore();
      await store.loadHouseBills();
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('notifies when API returns null', async () => {
      mockBillsApi.getHouseBills.mockResolvedValue(null);
      const store = useBillsStore();
      await store.loadHouseBills('house-1');
      expect(mockNotificationStore.addNotification).toHaveBeenCalled();
    });
  });

  describe('createBill', () => {
    const validData = {
      description: 'Netflix',
      monthly_cost: 15,
      next_due_date: '2025-12-01',
      payment_period: 1 as const,
      currency: 'EUR',
    };

    it('creates a bill and prepends it to state', async () => {
      const newBill = createMockBill({ id: 'new-bill' });
      mockBillsApi.createBill.mockResolvedValue(newBill);
      const store = useBillsStore();
      const result = await store.createBill(validData);
      expect(result).toBe(true);
      expect(store.bills[0]!.id).toBe('new-bill');
    });

    it('notifies with success on creation', async () => {
      mockBillsApi.createBill.mockResolvedValue(createMockBill());
      const store = useBillsStore();
      await store.createBill(validData);
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'success',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('success toast offers to open the new bill for its documents', async () => {
      mockBillsApi.createBill.mockResolvedValue(
        createMockBill({ id: 'new-bill' }),
      );
      const store = useBillsStore();
      await store.createBill(validData);
      const options = mockNotificationStore.addNotification.mock.calls[0]![3];
      expect(options.action.label).toBe('success.openBill');
      options.action.action();
      expect(navigateToMock).toHaveBeenCalledWith('/bills/new-bill');
    });

    it('returns false and notifies when monthly_cost <= 0', async () => {
      const store = useBillsStore();
      const result = await store.createBill({ ...validData, monthly_cost: 0 });
      expect(result).toBe(false);
      expect(mockBillsApi.createBill).not.toHaveBeenCalled();
      expect(mockNotificationStore.addNotification).toHaveBeenCalled();
    });

    it('returns false and notifies when next_due_date is empty', async () => {
      const store = useBillsStore();
      const result = await store.createBill({
        ...validData,
        next_due_date: '',
      });
      expect(result).toBe(false);
      expect(mockBillsApi.createBill).not.toHaveBeenCalled();
    });

    it('returns false and notifies when no house is selected', async () => {
      vi.mocked(useHousesStore).mockReturnValue({ currentHouse: null } as any);
      const store = useBillsStore();
      const result = await store.createBill(validData);
      expect(result).toBe(false);
    });

    it('returns false and notifies when API returns null', async () => {
      mockBillsApi.createBill.mockResolvedValue(null);
      const store = useBillsStore();
      const result = await store.createBill(validData);
      expect(result).toBe(false);
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('updateBill', () => {
    it('updates bill in state and returns the updated bill', async () => {
      const existing = createMockBill({ id: 'b1', description: 'Old' });
      const updated = createMockBill({ id: 'b1', description: 'New' });
      mockBillsApi.getHouseBills.mockResolvedValue([existing]);
      mockBillsApi.updateBill.mockResolvedValue(updated);
      const store = useBillsStore();
      await store.loadHouseBills('house-1');
      const result = await store.updateBill('b1', { description: 'New' });
      expect(result).toEqual(updated);
      expect(store.bills[0]!.description).toBe('New');
    });

    it('returns null and notifies on API failure', async () => {
      mockBillsApi.updateBill.mockResolvedValue(null);
      const store = useBillsStore();
      const result = await store.updateBill('b1', {});
      expect(result).toBeNull();
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('deleteBill', () => {
    it('removes bill from state on success', async () => {
      mockBillsApi.getHouseBills.mockResolvedValue([
        createMockBill({ id: 'b1' }),
        createMockBill({ id: 'b2' }),
      ]);
      mockBillsApi.deleteBill.mockResolvedValue(true);
      const store = useBillsStore();
      await store.loadHouseBills('house-1');
      const result = await store.deleteBill('b1');
      expect(result).toBe(true);
      expect(store.bills).toHaveLength(1);
      expect(store.bills[0]!.id).toBe('b2');
    });

    it('returns false and notifies on failure', async () => {
      mockBillsApi.deleteBill.mockResolvedValue(false);
      const store = useBillsStore();
      const result = await store.deleteBill('b1');
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
    it('clears bills and currentBill', async () => {
      mockBillsApi.getHouseBills.mockResolvedValue([createMockBill()]);
      const store = useBillsStore();
      await store.loadHouseBills('house-1');
      store.reset();
      expect(store.bills).toEqual([]);
      expect(store.currentBill).toBeNull();
    });
  });

  describe('computed: upcomingBills with null next_due_date', () => {
    it('excludes bills with no next_due_date', async () => {
      const billWithoutDate = createMockBill({ next_due_date: undefined });
      mockBillsApi.getHouseBills.mockResolvedValue([billWithoutDate]);
      const store = useBillsStore();
      await store.loadHouseBills('house-1');
      expect(store.upcomingBills).toHaveLength(0);
    });
  });

  describe('computed: overdueBills with null next_due_date', () => {
    it('excludes bills with no next_due_date', async () => {
      const billWithoutDate = createMockBill({ next_due_date: undefined });
      mockBillsApi.getHouseBills.mockResolvedValue([billWithoutDate]);
      const store = useBillsStore();
      await store.loadHouseBills('house-1');
      expect(store.overdueBills).toHaveLength(0);
    });
  });

  describe('computed: nextMonthBills', () => {
    it('includes bills due next month', async () => {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
      const nextMonthBill = createMockBill({
        next_due_date: nextMonth.toISOString().split('T')[0]!,
      });
      mockBillsApi.getHouseBills.mockResolvedValue([nextMonthBill]);
      const store = useBillsStore();
      await store.loadHouseBills('house-1');
      expect(store.nextMonthBills).toHaveLength(1);
    });

    it('excludes bills with no next_due_date', async () => {
      const billWithoutDate = createMockBill({ next_due_date: undefined });
      mockBillsApi.getHouseBills.mockResolvedValue([billWithoutDate]);
      const store = useBillsStore();
      await store.loadHouseBills('house-1');
      expect(store.nextMonthBills).toHaveLength(0);
    });
  });

  describe('loadBill', () => {
    it('loads and sets currentBill', async () => {
      const bill = createMockBill({ id: 'b-99' });
      mockBillsApi.getBill.mockResolvedValue(bill);
      const store = useBillsStore();
      await store.loadBill('b-99');
      expect(store.currentBill).toEqual(bill);
    });

    it('updates bill in bills array if already loaded', async () => {
      const original = createMockBill({ id: 'b-1', description: 'Old' });
      const updated = createMockBill({ id: 'b-1', description: 'Updated' });
      mockBillsApi.getHouseBills.mockResolvedValue([original]);
      mockBillsApi.getBill.mockResolvedValue(updated);
      const store = useBillsStore();
      await store.loadHouseBills('house-1');
      await store.loadBill('b-1');
      expect(store.bills[0]?.description).toBe('Updated');
    });

    it('notifies when bill not found', async () => {
      mockBillsApi.getBill.mockResolvedValue(null);
      const store = useBillsStore();
      await store.loadBill('nonexistent');
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('advanceBill', () => {
    it('updates bill in state with advanced due date', async () => {
      const original = createMockBill({
        id: 'b1',
        next_due_date: '2026-05-01',
      });
      const advanced = createMockBill({
        id: 'b1',
        next_due_date: '2026-06-01',
      });
      mockBillsApi.getHouseBills.mockResolvedValue([original]);
      (mockBillsApi as any).advanceBill = vi.fn().mockResolvedValue(advanced);
      vi.mocked(useBillsApi).mockReturnValue(mockBillsApi as any);
      const store = useBillsStore();
      await store.loadHouseBills('house-1');
      const result = await store.advanceBill('b1');
      expect(result).toBe(true);
      expect(store.bills[0]!.next_due_date).toBe('2026-06-01');
    });

    it('notifies success and returns true', async () => {
      const advanced = createMockBill({ id: 'b1' });
      (mockBillsApi as any).advanceBill = vi.fn().mockResolvedValue(advanced);
      vi.mocked(useBillsApi).mockReturnValue(mockBillsApi as any);
      const store = useBillsStore();
      const result = await store.advanceBill('b1');
      expect(result).toBe(true);
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'success',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('returns false and notifies on API failure', async () => {
      (mockBillsApi as any).advanceBill = vi.fn().mockResolvedValue(null);
      vi.mocked(useBillsApi).mockReturnValue(mockBillsApi as any);
      const store = useBillsStore();
      const result = await store.advanceBill('b1');
      expect(result).toBe(false);
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('deleteBill clears currentBill', () => {
    it('clears currentBill when deleted bill is the current bill', async () => {
      mockBillsApi.getHouseBills.mockResolvedValue([
        createMockBill({ id: 'b1' }),
      ]);
      mockBillsApi.deleteBill.mockResolvedValue(true);
      (mockBillsApi as any).getBill = vi
        .fn()
        .mockResolvedValue(createMockBill({ id: 'b1' }));
      vi.mocked(useBillsApi).mockReturnValue(mockBillsApi as any);
      const store = useBillsStore();
      await store.loadHouseBills('house-1');
      await store.loadBill('b1');
      expect(store.currentBill?.id).toBe('b1');
      const result = await store.deleteBill('b1');
      expect(result).toBe(true);
      expect(store.currentBill).toBeNull();
    });
  });

  describe('initialize', () => {
    it('skips when no current house', async () => {
      vi.mocked(useHousesStore).mockReturnValue({ currentHouse: null } as any);
      const store = useBillsStore();
      await store.initialize();
      expect(mockBillsApi.getHouseBills).not.toHaveBeenCalled();
    });

    it('loads bills when empty', async () => {
      mockBillsApi.getHouseBills.mockResolvedValue([createMockBill()]);
      const store = useBillsStore();
      await store.initialize();
      expect(mockBillsApi.getHouseBills).toHaveBeenCalled();
    });

    it('skips loading when bills already loaded and not forced', async () => {
      mockBillsApi.getHouseBills.mockResolvedValue([createMockBill()]);
      const store = useBillsStore();
      await store.loadHouseBills('house-1');
      mockBillsApi.getHouseBills.mockClear();
      await store.initialize();
      expect(mockBillsApi.getHouseBills).not.toHaveBeenCalled();
    });

    it('force-refreshes when forceRefresh=true', async () => {
      mockBillsApi.getHouseBills.mockResolvedValue([createMockBill()]);
      const store = useBillsStore();
      await store.loadHouseBills('house-1');
      mockBillsApi.getHouseBills.mockClear();
      await store.initialize(true);
      expect(mockBillsApi.getHouseBills).toHaveBeenCalled();
    });
  });
});
