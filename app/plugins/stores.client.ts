export default defineNuxtPlugin(async () => {
  if (import.meta.test) return;
  const userStore = useUserStore();
  const housesStore = useHousesStore();
  const expensesStore = useExpensesStore();
  const billsStore = useBillsStore();

  let isInitializing = false;

  async function initializeAllStores() {
    if (isInitializing) return;

    isInitializing = true;
    try {
      // Initialize houses and other stores
      await housesStore.initialize();

      // Initialize expenses and bills in parallel if house exists
      if (housesStore.currentHouse) {
        await Promise.all([
          expensesStore.initialize(),
          billsStore.initialize(),
        ]);
      }
    } catch {
      // Silent error handling for all errors during initialization
      // Errors are handled by individual stores with user notifications
    } finally {
      isInitializing = false;
    }
  }

  // Note: Session restore is now handled by auth.global.ts middleware
  // Only initialize stores if user is already authenticated (from middleware)
  if (userStore.currentUser) {
    await initializeAllStores();
  }

  // Auto-initialize stores on auth state change
  watch(
    () => userStore.currentUser?.id, // Watch the user ID instead of the whole object
    async (newUserId, oldUserId) => {
      if (newUserId && newUserId !== oldUserId) {
        // User logged in (new user ID) - initialize stores
        await initializeAllStores();
      } else if (!newUserId && oldUserId) {
        // User logged out (no user ID, but had one before) - reset all stores
        userStore.reset();
        housesStore.reset();
        expensesStore.reset();
        billsStore.reset();
      }
      // If newUserId === oldUserId, it's just a profile update, don't re-initialize
    },
    { immediate: false },
  );
});
