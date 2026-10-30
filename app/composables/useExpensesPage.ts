import type { CreateExpensePayload, Expense } from '~/types';

/**
 * Owns the /expenses page's state and actions: derived filtering, grouping
 * and totals over the house's expenses, the create/view/delete modal flow,
 * and the initial house-scoped load. Mirrors the useXPage composable
 * pattern already used for bills/[id], house/[id] and house/join/[token]
 * in this phase. Extracted from expenses/index.vue so the page's script
 * stays focused on rendering the resulting state.
 */
export function useExpensesPage() {
  const housesStore = useHousesStore();
  const expensesStore = useExpensesStore();
  const userStore = useUserStore();

  const currentHouse = computed(() => housesStore.currentHouse);
  const members = computed(() => housesStore.members);
  const expenses = computed(() => expensesStore.expenses);
  // Skeleton until the first house-scoped load has settled: before the house
  // resolves the store is idle (isLoading=false) and an empty list would
  // flash the empty state, then rows pop in late.
  const hasLoaded = ref(false);
  const loading = computed(() => expensesStore.isLoading || !hasLoaded.value);

  const currentFilter = ref<'all' | 'pending' | 'settled'>('all');
  const searchQuery = ref('');
  const showCreateModal = ref(false);
  const deletingExpenseId = ref<string | null>(null);
  const showViewModal = ref(false);
  const selectedExpense = ref<Expense | null>(null);

  const filteredExpenses = computed(() => {
    let list = expenses.value;

    if (currentFilter.value !== 'all') {
      list = list.filter((expense) => {
        const userShare = expense.shares?.find(
          (share) => share.user_id === userStore.currentUser?.id,
        );
        if (currentFilter.value === 'pending')
          return userShare && !userShare.is_paid;
        if (currentFilter.value === 'settled')
          return userShare && userShare.is_paid;
        return false;
      });
    }

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase();
      list = list.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.creator?.first_name?.toLowerCase().includes(q) ||
          e.payer?.first_name?.toLowerCase().includes(q),
      );
    }

    return list;
  });

  const groupedExpenses = computed(() =>
    groupByDay(filteredExpenses.value, (e) => e.created_at),
  );

  const totalOwed = computed(() =>
    expenses.value.reduce((total, expense) => {
      // The payer's own share is spending, not a debt.
      if (expense.created_by === userStore.currentUser?.id) return total;
      const share = expense.shares?.find(
        (s) => s.user_id === userStore.currentUser?.id,
      );
      return share && !share.is_paid && share.amount_due > 0
        ? total + share.amount_due
        : total;
    }, 0),
  );

  const totalOwedToYou = computed(() =>
    expenses.value.reduce((total, expense) => {
      if (expense.created_by !== userStore.currentUser?.id) return total;
      const unpaid =
        expense.shares?.filter(
          (s) => !s.is_paid && s.user_id !== userStore.currentUser?.id,
        ) ?? [];
      return total + unpaid.reduce((sum, s) => sum + (s.amount_due ?? 0), 0);
    }, 0),
  );

  const totalExpenses = computed(() =>
    expenses.value.reduce((sum, e) => sum + e.total_amount, 0),
  );

  const handleCreateExpense = async (payload: CreateExpensePayload) => {
    try {
      // The store returns false (and toasts) on failure: keep the sheet open.
      if (await expensesStore.createExpense(payload))
        showCreateModal.value = false;
    } catch {
      // Handled by store
    }
  };

  const deleteExpense = async (expenseId: string) => {
    deletingExpenseId.value = expenseId;
    try {
      await expensesStore.deleteExpense(expenseId);
    } catch {
      // Handled by store
    } finally {
      deletingExpenseId.value = null;
    }
  };

  const handleExpenseClick = (expense: Expense) => {
    selectedExpense.value = expense;
    showViewModal.value = true;
  };

  const handleCloseViewModal = () => {
    showViewModal.value = false;
    selectedExpense.value = null;
  };

  const handleDeleteExpense = async (expenseId: string) => {
    await deleteExpense(expenseId);
    handleCloseViewModal();
  };

  // Single load owner (same pattern as pages/bills): the immediate watcher
  // covers both the already-initialized and the post-initialize() case.
  watch(
    currentHouse,
    async (newHouse) => {
      if (!newHouse) return;
      try {
        await expensesStore.loadHouseExpenses();
      } finally {
        hasLoaded.value = true;
      }
    },
    { immediate: true },
  );

  onMounted(() => housesStore.initialize());

  return {
    currentHouse,
    expenses,
    members,
    loading,
    currentFilter,
    searchQuery,
    showCreateModal,
    deletingExpenseId,
    showViewModal,
    selectedExpense,
    filteredExpenses,
    groupedExpenses,
    totalOwed,
    totalOwedToYou,
    totalExpenses,
    handleCreateExpense,
    deleteExpense,
    handleExpenseClick,
    handleCloseViewModal,
    handleDeleteExpense,
  };
}
