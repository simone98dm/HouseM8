import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useUserStore } from '~/stores/user';
import { useHousesStore } from '~/stores/houses';
import { useExpensesStore } from '~/stores/expenses';
import { useBillsStore } from '~/stores/bills';

vi.mock('~/stores/user', () => ({
  useUserStore: vi.fn(),
}));

vi.mock('~/stores/houses', () => ({
  useHousesStore: vi.fn(),
}));

vi.mock('~/stores/expenses', () => ({
  useExpensesStore: vi.fn(),
}));

vi.mock('~/stores/bills', () => ({
  useBillsStore: vi.fn(),
}));

describe('useInitializeStores', () => {
  let mockUserStore: any;
  let mockHousesStore: any;
  let mockExpensesStore: any;
  let mockBillsStore: any;

  beforeEach(() => {
    vi.resetModules();

    mockUserStore = {
      initialize: vi.fn().mockResolvedValue(undefined),
      reset: vi.fn(),
      currentUser: null,
    };
    mockHousesStore = {
      currentHouse: null,
      initialize: vi.fn().mockResolvedValue(undefined),
      reset: vi.fn(),
    };
    mockExpensesStore = {
      initialize: vi.fn().mockResolvedValue(undefined),
      reset: vi.fn(),
    };
    mockBillsStore = {
      initialize: vi.fn().mockResolvedValue(undefined),
      reset: vi.fn(),
    };

    vi.mocked(useUserStore).mockReturnValue(mockUserStore as any);
    vi.mocked(useHousesStore).mockReturnValue(mockHousesStore as any);
    vi.mocked(useExpensesStore).mockReturnValue(mockExpensesStore as any);
    vi.mocked(useBillsStore).mockReturnValue(mockBillsStore as any);
  });

  describe('initialize', () => {
    it('calls user and houses store initialize in sequence', async () => {
      const { useInitializeStores } =
        await import('~/composables/useInitializeStores');
      const { initialize } = useInitializeStores();

      await initialize();

      expect(mockUserStore.initialize).toHaveBeenCalled();
      expect(mockHousesStore.initialize).toHaveBeenCalled();
    });

    it('initializes expenses and bills when current house exists', async () => {
      const { useInitializeStores } =
        await import('~/composables/useInitializeStores');
      mockHousesStore.currentHouse = { id: 'h-1' };
      vi.mocked(useHousesStore).mockReturnValue(mockHousesStore as any);

      const { initialize } = useInitializeStores();
      await initialize();

      expect(mockExpensesStore.initialize).toHaveBeenCalledWith(false);
      expect(mockBillsStore.initialize).toHaveBeenCalledWith(false);
    });

    it('does NOT initialize expenses and bills when no current house', async () => {
      const { useInitializeStores } =
        await import('~/composables/useInitializeStores');
      mockHousesStore.currentHouse = null;

      const { initialize } = useInitializeStores();
      await initialize();

      expect(mockExpensesStore.initialize).not.toHaveBeenCalled();
      expect(mockBillsStore.initialize).not.toHaveBeenCalled();
    });

    it('sets initialized to true after completion', async () => {
      const { useInitializeStores } =
        await import('~/composables/useInitializeStores');
      const { initialize, initialized } = useInitializeStores();

      await initialize();

      expect(initialized.value).toBe(true);
    });

    it('skips when already initialized', async () => {
      const { useInitializeStores } =
        await import('~/composables/useInitializeStores');
      const { initialize } = useInitializeStores();

      await initialize(); // first call
      vi.clearAllMocks();
      await initialize(); // second call should skip

      expect(mockUserStore.initialize).not.toHaveBeenCalled();
    });

    it('forces refresh even if already initialized', async () => {
      const { useInitializeStores } =
        await import('~/composables/useInitializeStores');
      mockHousesStore.currentHouse = { id: 'h-1' };
      vi.mocked(useHousesStore).mockReturnValue(mockHousesStore as any);

      const { initialize } = useInitializeStores();
      await initialize(); // first call
      vi.clearAllMocks();
      vi.mocked(useUserStore).mockReturnValue(mockUserStore as any);
      vi.mocked(useHousesStore).mockReturnValue(mockHousesStore as any);
      vi.mocked(useExpensesStore).mockReturnValue(mockExpensesStore as any);
      vi.mocked(useBillsStore).mockReturnValue(mockBillsStore as any);
      await initialize(true); // force refresh

      expect(mockUserStore.initialize).toHaveBeenCalled();
    });

    it('clears initializing flag after completion', async () => {
      const { useInitializeStores } =
        await import('~/composables/useInitializeStores');
      const { initialize, initializing } = useInitializeStores();

      await initialize();

      expect(initializing.value).toBe(false);
    });

    it('clears initializing flag even if an error occurs', async () => {
      const { useInitializeStores } =
        await import('~/composables/useInitializeStores');
      mockUserStore.initialize.mockRejectedValue(new Error('Init failed'));

      const { initialize, initializing } = useInitializeStores();

      try {
        await initialize();
      } catch {
        // expected
      }

      expect(initializing.value).toBe(false);
    });
  });

  describe('reset', () => {
    it('resets all stores and sets initialized to false', async () => {
      const { useInitializeStores } =
        await import('~/composables/useInitializeStores');
      const { initialize, reset, initialized } = useInitializeStores();

      await initialize();
      expect(initialized.value).toBe(true);

      reset();

      expect(mockUserStore.reset).toHaveBeenCalled();
      expect(mockHousesStore.reset).toHaveBeenCalled();
      expect(mockExpensesStore.reset).toHaveBeenCalled();
      expect(mockBillsStore.reset).toHaveBeenCalled();
      expect(initialized.value).toBe(false);
    });
  });

  describe('computed properties', () => {
    it('initialized starts as false', async () => {
      const { useInitializeStores } =
        await import('~/composables/useInitializeStores');
      const { initialized } = useInitializeStores();

      expect(initialized.value).toBe(false);
    });

    it('initializing starts as false', async () => {
      const { useInitializeStores } =
        await import('~/composables/useInitializeStores');
      const { initializing } = useInitializeStores();

      expect(initializing.value).toBe(false);
    });
  });
});
