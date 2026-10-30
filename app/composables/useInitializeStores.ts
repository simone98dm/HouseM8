/**
 * Composable to initialize all application stores
 *
 * This should be called once when the app starts and when user authenticates.
 * Handles sequential initialization to avoid race conditions.
 */
export const useInitializeStores = () => {
  const userStore = useUserStore();
  const housesStore = useHousesStore();
  const expensesStore = useExpensesStore();
  const billsStore = useBillsStore();

  const initialized = ref(false);
  const initializing = ref(false);

  const initialize = async (forceRefresh: boolean = false) => {
    if (initializing.value) return;
    if (initialized.value && !forceRefresh) return;

    initializing.value = true;

    try {
      // Initialize in sequence to avoid race conditions
      await userStore.initialize();
      await housesStore.initialize();

      // Initialize expenses and bills in parallel once house is loaded
      if (housesStore.currentHouse) {
        await Promise.all([
          expensesStore.initialize(forceRefresh),
          billsStore.initialize(forceRefresh),
        ]);
      }

      initialized.value = true;
    } finally {
      initializing.value = false;
    }
  };

  const reset = () => {
    userStore.reset();
    housesStore.reset();
    expensesStore.reset();
    billsStore.reset();

    initialized.value = false;
  };

  return {
    initialize,
    reset,
    initialized: computed(() => initialized.value),
    initializing: computed(() => initializing.value),
  };
};
