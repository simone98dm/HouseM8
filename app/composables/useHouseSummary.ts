import type { Currency, House } from '~/types';
import type { HouseBalance } from '~/types/composables/balance';

const DEFAULT_MAX_MEMBERS = 10;

/**
 * The one sentence the house page leads with:
 * "2 of 3 places taken · everyone's square · rent due Sat 31 Oct".
 * Parts that are not known yet (balance still loading or failed) are left
 * out rather than guessed.
 */
export function useHouseSummary(
  house: Ref<House | null>,
  activeCount: Ref<number>,
  canView: Ref<boolean>,
) {
  const { t } = useI18n();
  const billsStore = useBillsStore();
  const { getHouseBalance } = useBalance();
  const { formatAmount } = useCurrency();
  const { formatDue } = useDueDate();

  const balance = ref<HouseBalance | null>(null);

  watch(
    () => (canView.value ? house.value?.id : undefined),
    async (id) => {
      balance.value = null;
      if (!id) return;
      const response = await getHouseBalance(id);
      // Ignore a response for a house the page has since moved away from.
      if (house.value?.id !== id) return;
      balance.value = response.error ? null : response.data;
    },
    { immediate: true },
  );

  const summary = computed(() => {
    if (!house.value) return '';
    const parts = [
      t('houseProfile.summary.places', {
        taken: activeCount.value,
        max: house.value.max_members ?? DEFAULT_MAX_MEMBERS,
      }),
    ];
    if (balance.value) {
      const owed = balance.value.settlement_transactions.reduce(
        (sum, x) => sum + x.amount,
        0,
      );
      parts.push(
        owed > 0
          ? t('houseProfile.summary.unsettled', {
              amount: formatAmount(owed, balance.value.currency as Currency),
            })
          : t('houseProfile.summary.square'),
      );
    }
    const next = billsStore.upcomingBills[0];
    if (next?.next_due_date) {
      parts.push(
        t('houseProfile.summary.billDue', {
          name: next.description,
          date: formatDue(next.next_due_date),
        }),
      );
    }
    return parts.join(' · ');
  });

  return { summary, balance };
}
