import { defineStore } from 'pinia';
import type { Bill } from '~/types';
import type { ExpenseCategory } from '~~/shared/constants/categories';

/**
 * Layer 3: Bills Store
 *
 * Responsibilities:
 * - State management (reactive data)
 * - Business logic and validation
 * - Data manipulation and transformation
 * - Computed properties (derived state)
 * - Call Layer 4 composables for API operations
 * - Handle notifications (success/error)
 */
export const useBillsStore = defineStore('bills', () => {
  const billsApi = useBillsApi();
  const housesStore = useHousesStore();
  const notificationStore = useNotificationStore();

  const bills = ref<Bill[]>([]);
  const currentBill = ref<Bill | null>(null);

  const isLoading = ref(false);

  const upcomingBills = computed(() =>
    bills.value
      .filter((bill) => {
        if (!bill.next_due_date) return false;
        const dueDate = new Date(bill.next_due_date);
        const now = new Date();
        const daysUntilDue =
          (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntilDue <= 30 && daysUntilDue >= 0;
      })
      .sort((a, b) => {
        if (!a.next_due_date || !b.next_due_date) return 0;
        const dateA = new Date(a.next_due_date).getTime();
        const dateB = new Date(b.next_due_date).getTime();
        return dateA - dateB;
      }),
  );

  const overdueBills = computed(() =>
    bills.value.filter((bill) => {
      if (!bill.next_due_date) return false;
      const dueDate = new Date(bill.next_due_date);
      const now = new Date();
      return dueDate < now;
    }),
  );

  const nextMonthBills = computed(() => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthAfter = new Date(now.getFullYear(), now.getMonth() + 2, 1);

    return bills.value.filter((bill) => {
      if (!bill.next_due_date) return false;
      const dueDate = new Date(bill.next_due_date);
      return dueDate >= nextMonth && dueDate < monthAfter;
    });
  });

  const totalMonthlyCost = computed(() => {
    return bills.value.reduce((sum, bill) => sum + (bill.monthly_cost || 0), 0);
  });

  /**
   * Load bills for current house
   */
  // Three independent callers request the same house on boot — the stores
  // plugin, app.vue's initialize(), and the page's own watcher — each firing
  // its own request. Measured: 2x GET /api/bills on a single /bills load.
  // Concurrent callers now join the in-flight promise instead of duplicating
  // it. Declared inside the setup (not at module scope) so it cannot leak
  // across SSR requests.
  let inFlightHouseId: string | null = null;
  let inFlight: Promise<void> | null = null;

  async function loadHouseBills(houseId?: string): Promise<void> {
    const targetHouseId = houseId || housesStore.currentHouse?.id;
    if (!targetHouseId) {
      notificationStore.addNotification(
        'error',
        'errors.generic',
        'errors.noHouseSelected',
        { i18n: true },
      );
      return;
    }

    if (inFlight && inFlightHouseId === targetHouseId) return inFlight;

    inFlightHouseId = targetHouseId;
    inFlight = fetchHouseBills(targetHouseId).finally(() => {
      inFlight = null;
      inFlightHouseId = null;
    });
    return inFlight;
  }

  async function fetchHouseBills(targetHouseId: string): Promise<void> {
    isLoading.value = true;
    try {
      const fetchedBills = await billsApi.getHouseBills(targetHouseId);

      if (fetchedBills) {
        bills.value = fetchedBills;
      } else {
        notificationStore.addNotification(
          'error',
          'errors.generic',
          'errors.failedToLoadBills',
          { i18n: true },
        );
      }
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Load a single bill by ID
   */
  // Same in-flight dedupe as loadHouseBills above. `bills/[id].vue` calls this
  // from both onMounted and a watch(currentHouse), so a house resolving during
  // mount can fire two identical GETs. Declared inside the setup, not at module
  // scope, so it cannot leak across SSR requests.
  let inFlightBillId: string | null = null;
  let inFlightBill: Promise<void> | null = null;

  async function loadBill(billId: string): Promise<void> {
    if (inFlightBill && inFlightBillId === billId) return inFlightBill;
    inFlightBillId = billId;
    inFlightBill = fetchBill(billId).finally(() => {
      inFlightBill = null;
      inFlightBillId = null;
    });
    return inFlightBill;
  }

  async function fetchBill(billId: string): Promise<void> {
    const bill = await billsApi.getBill(billId);

    if (bill) {
      currentBill.value = bill;

      // Also update in bills array if exists
      const index = bills.value.findIndex((b) => b.id === billId);
      if (index !== -1) {
        bills.value[index] = bill;
      }
    } else {
      notificationStore.addNotification(
        'error',
        'errors.generic',
        'errors.failedToLoad',
        { i18n: true },
      );
    }
  }

  /**
   * Create a new bill
   * Business logic: validation, state updates, notifications
   */
  async function createBill(data: {
    description: string;
    monthly_cost: number;
    next_due_date: string;
    payment_period: number;
    currency: string;
    categories?: ExpenseCategory[];
  }): Promise<boolean> {
    const houseId = housesStore.currentHouse?.id;
    if (!houseId) {
      notificationStore.addNotification(
        'error',
        'errors.generic',
        'errors.noHouseSelected',
        { i18n: true },
      );
      return false;
    }

    // Business logic: validation
    if (data.monthly_cost <= 0) {
      notificationStore.addNotification(
        'error',
        'errors.validation',
        'common.monthlyCostMustBeGreaterThanZero',
        { i18n: true },
      );
      return false;
    }

    if (!data.next_due_date) {
      notificationStore.addNotification(
        'error',
        'errors.validation',
        'common.pleaseSelectDueDate',
        { i18n: true },
      );
      return false;
    }

    const newBill = await billsApi.createBill({ ...data, house_id: houseId });

    if (newBill) {
      // Business logic: add to state
      bills.value.unshift(newBill);
      // The bill's page is where its contract documents go, whichever form
      // created it (bills page or the expense sheet's "Does it repeat?").
      notificationStore.addNotification(
        'success',
        'common.success',
        'success.billCreated',
        {
          i18n: true,
          action: {
            label: 'success.openBill',
            action: () => navigateTo(`/bills/${newBill.id}`),
          },
        },
      );
      return true;
    }

    notificationStore.addNotification(
      'error',
      'errors.generic',
      'errors.failedToCreateBill',
      { i18n: true },
    );
    return false;
  }

  /**
   * Update an existing bill
   */
  async function updateBill(
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
  ): Promise<Bill | null> {
    const updatedBill = await billsApi.updateBill(billId, updates);

    if (updatedBill) {
      // Business logic: update in state
      const index = bills.value.findIndex((b) => b.id === billId);
      if (index !== -1) {
        bills.value[index] = updatedBill;
      }

      if (currentBill.value?.id === billId) {
        currentBill.value = updatedBill;
      }

      notificationStore.addNotification(
        'success',
        'common.success',
        'success.billUpdated',
        { i18n: true },
      );
      return updatedBill;
    }

    notificationStore.addNotification(
      'error',
      'errors.generic',
      'errors.failedToUpdateBill',
      { i18n: true },
    );
    return null;
  }

  /**
   * Delete a bill
   */
  async function deleteBill(billId: string): Promise<boolean> {
    const success = await billsApi.deleteBill(billId);

    if (success) {
      // Business logic: remove from state
      bills.value = bills.value.filter((b) => b.id !== billId);

      if (currentBill.value?.id === billId) {
        currentBill.value = null;
      }

      notificationStore.addNotification(
        'success',
        'common.success',
        'success.billDeleted',
        { i18n: true },
      );
      return true;
    }

    notificationStore.addNotification(
      'error',
      'errors.generic',
      'errors.failedToDeleteBill',
      { i18n: true },
    );
    return false;
  }

  /**
   * Initialize store - load initial data
   */
  async function initialize(forceRefresh: boolean = false): Promise<void> {
    if (!housesStore.currentHouse) return;

    // Only load if forced or no data
    if (forceRefresh || bills.value.length === 0) {
      await loadHouseBills();
    }
  }

  /**
   * Advance the due date of a bill by its payment period.
   */
  async function advanceBill(billId: string): Promise<boolean> {
    const updatedBill = await billsApi.advanceBill(billId);

    if (updatedBill) {
      const index = bills.value.findIndex((b) => b.id === billId);
      if (index !== -1) bills.value[index] = updatedBill;
      if (currentBill.value?.id === billId) currentBill.value = updatedBill;

      notificationStore.addNotification(
        'success',
        'common.success',
        'success.billAdvanced',
        { i18n: true },
      );
      return true;
    }

    notificationStore.addNotification(
      'error',
      'errors.generic',
      'errors.failedToAdvanceBill',
      { i18n: true },
    );
    return false;
  }

  /**
   * Reset store to initial state
   */
  function reset(): void {
    bills.value = [];
    currentBill.value = null;
  }

  return {
    bills,
    currentBill,
    isLoading,

    upcomingBills,
    overdueBills,
    nextMonthBills,
    totalMonthlyCost,

    loadHouseBills,
    loadBill,
    createBill,
    updateBill,
    deleteBill,
    advanceBill,
    initialize,
    reset,
  };
});
