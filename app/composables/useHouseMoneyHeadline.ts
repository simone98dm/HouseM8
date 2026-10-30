import type { WatchSource } from 'vue';
import type { HouseBalance } from '~/types/composables/balance';

/**
 * Loads a house's settle-up plan and exposes the shared money sentence for the
 * current user. For pages that do not already own the balance (e.g. expenses);
 * the dashboard and /balance load it in their own page composables.
 */
export function useHouseMoneyHeadline(
  houseId: MaybeRefOrGetter<string | undefined>,
  /**
   * Reload the plan whenever this changes (e.g. a share was paid on the
   * page): the sentence comes from the server's plan, not from local state.
   */
  refreshOn: WatchSource<unknown> = () => null,
) {
  const userStore = useUserStore();
  const balanceService = useBalance();
  const houseBalance = ref<HouseBalance | null>(null);
  const isLoading = ref(false);
  // Only the latest request may write: a slow earlier reload must not
  // overwrite the newer plan.
  let requestId = 0;

  watch(
    [() => toValue(houseId), refreshOn],
    async ([id]) => {
      if (!id) return;
      const current = ++requestId;
      isLoading.value = true;
      const response = await balanceService.getHouseBalance(id);
      if (current !== requestId) return;
      // A failed load leaves the headline out; the page keeps its facts.
      houseBalance.value = response.error ? null : response.data;
      isLoading.value = false;
    },
    { immediate: true },
  );

  const headline = useMoneyHeadline(
    houseBalance,
    () => userStore.currentUser?.id,
  );

  return { headline, isLoading };
}
