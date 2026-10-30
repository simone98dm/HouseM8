import { defineStore } from 'pinia';
import type { Expense, CreateExpensePayload } from '~/types';
import type { ExpenseCategory } from '~~/shared/constants/categories';

/**
 * Layer 3: Expenses Store
 *
 * Responsibilities:
 * - State management (reactive data)
 * - Business logic and validation
 * - Data manipulation and transformation
 * - Computed properties (derived state)
 * - Call Layer 4 composables for API operations
 * - Handle notifications (success/error)
 */
export const useExpensesStore = defineStore('expenses', () => {
  const expensesApi = useExpensesApi();
  const userStore = useUserStore();
  const housesStore = useHousesStore();
  const notificationStore = useNotificationStore();

  const expenses = ref<Expense[]>([]);
  const currentExpense = ref<Expense | null>(null);

  const isLoading = ref(false);

  const unpaidExpenses = computed(() => {
    return expenses.value.filter((expense) =>
      expense.shares?.some(
        (share) =>
          share.user_id === userStore.currentUser?.id && !share.is_paid,
      ),
    );
  });

  const expensesByCategory = computed(() => {
    const categories: Record<string, Expense[]> = {};
    expenses.value.forEach((expense) => {
      // A multi-category expense is listed under each of its categories.
      const keys = expense.categories?.length
        ? expense.categories
        : ['uncategorized'];
      for (const key of keys) (categories[key] ??= []).push(expense);
    });
    return categories;
  });

  const totalAmount = computed(() => {
    return expenses.value.reduce(
      (sum, exp) => sum + (exp.total_amount || 0),
      0,
    );
  });

  /**
   * Load expenses for current house
   */
  // See the matching note in stores/bills.ts: several callers request the same
  // house concurrently on boot. Concurrent callers join the in-flight promise
  // rather than each firing their own request. Declared inside the setup (not
  // at module scope) so it cannot leak across SSR requests.
  let inFlightHouseId: string | null = null;
  let inFlight: Promise<void> | null = null;

  async function loadHouseExpenses(houseId?: string): Promise<void> {
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
    inFlight = fetchHouseExpenses(targetHouseId).finally(() => {
      inFlight = null;
      inFlightHouseId = null;
    });
    return inFlight;
  }

  async function fetchHouseExpenses(targetHouseId: string): Promise<void> {
    isLoading.value = true;
    try {
      const result = await expensesApi.getHouseExpenses(targetHouseId);

      if (result?.data) {
        expenses.value = result.data;
      } else {
        expenses.value = [];
        notificationStore.addNotification(
          'error',
          'errors.generic',
          'common.failedToLoadExpenses',
          { i18n: true },
        );
      }
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Load a single expense by ID
   */
  async function loadExpense(expenseId: string): Promise<void> {
    const houseId = housesStore.currentHouse?.id;
    if (!houseId) return;

    const expense = await expensesApi.getExpense(expenseId, houseId);

    if (expense) {
      currentExpense.value = expense;
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
   * Create a new expense
   * Business logic: validation, state updates, notifications
   */
  async function createExpense(data: {
    description: string;
    total_amount: number;
    due_date?: string;
    user_ids: string[];
    categories?: ExpenseCategory[];
    payer_id?: string;
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
    if (data.total_amount <= 0) {
      notificationStore.addNotification(
        'error',
        'errors.validation',
        'common.amountMustBeGreaterThanZero',
        { i18n: true },
      );
      return false;
    }

    if (!data.user_ids || data.user_ids.length === 0) {
      notificationStore.addNotification(
        'error',
        'errors.validation',
        'common.pleaseSelectAtLeastOneUser',
        { i18n: true },
      );
      return false;
    }

    // Get user's preferred currency
    const userCurrency = userStore.currentUser?.preferred_currency || 'EUR';

    // Prepare payload
    const payload: CreateExpensePayload = {
      description: data.description,
      total_amount: data.total_amount,
      due_date: data.due_date,
      user_ids: data.user_ids,
      categories: data.categories,
      payer_id: data.payer_id,
      currency: userCurrency,
    };

    const newExpense = await expensesApi.createExpense({
      ...payload,
      house_id: houseId,
    });

    if (newExpense) {
      // Business logic: add to state at beginning
      expenses.value.unshift(newExpense);
      notificationStore.addNotification(
        'success',
        'common.success',
        'success.expenseCreated',
        { i18n: true },
      );
      return true;
    }

    notificationStore.addNotification(
      'error',
      'errors.generic',
      'errors.failedToCreateExpense',
      { i18n: true },
    );
    return false;
  }

  /**
   * Update an existing expense
   */
  async function updateExpense(
    expenseId: string,
    updates: Partial<CreateExpensePayload>,
  ): Promise<boolean> {
    const updatedExpense = await expensesApi.updateExpense(expenseId, updates);

    if (updatedExpense) {
      // Business logic: update in state
      const index = expenses.value.findIndex((e) => e.id === expenseId);
      if (index !== -1) {
        expenses.value[index] = updatedExpense;
      }

      if (currentExpense.value?.id === expenseId) {
        currentExpense.value = updatedExpense;
      }

      notificationStore.addNotification(
        'success',
        'common.success',
        'success.expenseUpdated',
        { i18n: true },
      );
      return true;
    }

    notificationStore.addNotification(
      'error',
      'errors.generic',
      'common.failedToUpdateExpense',
      { i18n: true },
    );
    return false;
  }

  /**
   * Delete an expense
   */
  async function deleteExpense(expenseId: string): Promise<boolean> {
    const success = await expensesApi.deleteExpense(expenseId);

    if (success) {
      // Business logic: remove from state
      expenses.value = expenses.value.filter((e) => e.id !== expenseId);

      if (currentExpense.value?.id === expenseId) {
        currentExpense.value = null;
      }

      notificationStore.addNotification(
        'success',
        'common.success',
        'success.expenseDeleted',
        { i18n: true },
      );
      return true;
    }

    notificationStore.addNotification(
      'error',
      'errors.generic',
      'errors.failedToDeleteExpense',
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
    if (forceRefresh || expenses.value.length === 0) {
      await loadHouseExpenses();
    }
  }

  /**
   * Reset store to initial state
   */
  function reset(): void {
    expenses.value = [];
    currentExpense.value = null;
  }

  return {
    expenses,
    currentExpense,
    isLoading,

    unpaidExpenses,
    expensesByCategory,
    totalAmount,

    loadHouseExpenses,
    loadExpense,
    createExpense,
    updateExpense,
    deleteExpense,
    initialize,
    reset,
  };
});
