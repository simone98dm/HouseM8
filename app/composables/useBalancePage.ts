import type {
  HouseBalance,
  RecentPayment,
  SettlementTransaction,
} from '~/types/composables/balance';
import { useCurrency } from '~/composables/useCurrency';

/**
 * Owns the /balance page's state and actions: loading the house balance
 * (single-load-owner watcher pattern), the derived display values (net
 * standing, amounts to receive/pay, personal debts, formatted amounts), and
 * the immediate settle + undo flow. Extracted from balance/index.vue so the
 * page's script stays focused on rendering the resulting states.
 */
export function useBalancePage() {
  const housesStore = useHousesStore();
  const userStore = useUserStore();
  const balanceService = useBalance();
  const notificationStore = useNotificationStore();
  const { t } = useI18n();
  const { formatAmount } = useCurrency();
  const showUndoToast = useUndoToast();

  // ── State ────────────────────────────────────────────────────────────────────
  const currentHouse = computed(() => housesStore.currentHouse);
  const houseBalance = ref<HouseBalance | null>(null);
  /** First load only: the page shows a skeleton. */
  const loading = ref(true);
  /** Background reload: content (and any open modal) stays mounted. */
  const refreshing = ref(false);
  const recentPayments = ref<RecentPayment[]>([]);
  const processingSettlement = ref<string | null>(null);

  // ── Derived display values ───────────────────────────────────────────────────
  const currency = computed(
    () => (houseBalance.value?.currency ?? 'EUR') as 'USD' | 'EUR',
  );

  /** Current user's balance entry */
  const myUserBalance = computed(() => {
    const currentUserId = userStore.currentUser?.id;
    return (
      houseBalance.value?.user_balances.find(
        (b) => b.user_id === currentUserId,
      ) ?? null
    );
  });

  /** Current user's personal net balance (positive = owed, negative = owes) */
  const netStanding = computed(() => myUserBalance.value?.net_balance ?? 0);

  /** Settlement transactions where the current user is the debtor */
  const myDebts = computed(() => {
    const uid = userStore.currentUser?.id;
    if (!uid || !houseBalance.value) return [];
    return houseBalance.value.settlement_transactions.filter(
      (t) => t.from_user_id === uid,
    );
  });

  /** Settlement transactions where the current user is the creditor */
  const myCredits = computed(() => {
    const uid = userStore.currentUser?.id;
    if (!uid || !houseBalance.value) return [];
    return houseBalance.value.settlement_transactions.filter(
      (t) => t.to_user_id === uid,
    );
  });

  /**
   * Summed in integer cents: `settlement_transactions[].amount` arrives as
   * cents/100, so adding several of them in floats produces 12.000000000000002.
   */
  const sumTransactions = (transactions: SettlementTransaction[]) =>
    transactions.reduce((cents, t) => cents + Math.round(t.amount * 100), 0) /
    100;

  /**
   * Both figures come from the SETTLEMENT PLAN, not from the raw per-share
   * totals the API also returns (`total_paid` / `total_owed`).
   *
   * Those raw totals are gross and pairwise-unnetted, so they disagreed with
   * every other number on this page. Measured against the dev database: a user
   * with a 20.00 share in a flatmate's expense and 8.00 owed back to them has a
   * net position of -12.00, which is what Net Standing showed and what the
   * settle-up list asked them to pay — while this card read "Total to pay
   * 20.00". Three numbers, one obligation.
   *
   * Because the plan nets each person to a single side, one of these is always
   * zero and `netStanding === totalToReceive - totalToPay` holds exactly.
   */
  const totalToReceive = computed(() => sumTransactions(myCredits.value));
  const totalToPay = computed(() => sumTransactions(myDebts.value));

  /**
   * The viewer's only transfer, when there is exactly one (debt or credit).
   * The hero carries its action, so the section row would just repeat it.
   */
  const soleTransfer = computed(() => {
    const all = [...myDebts.value, ...myCredits.value];
    return all.length === 1 ? all[0]! : null;
  });
  const soleTransferIsCredit = computed(
    () => soleTransfer.value?.to_user_id === userStore.currentUser?.id,
  );

  const fmtNet = computed(() =>
    formatAmount(Math.abs(netStanding.value), currency.value),
  );
  const fmtToReceive = computed(() =>
    formatAmount(totalToReceive.value, currency.value),
  );
  const fmtToPay = computed(() =>
    formatAmount(totalToPay.value, currency.value),
  );

  const headline = useMoneyHeadline(
    houseBalance,
    () => userStore.currentUser?.id,
  );

  /** Everyone but the viewer, for "You and Silvia are square." */
  const otherPeople = computed(() =>
    (houseBalance.value?.user_balances ?? [])
      .filter((b) => b.user_id !== userStore.currentUser?.id)
      .map((b) => b.user),
  );
  const me = computed(
    () =>
      houseBalance.value?.user_balances.find(
        (b) => b.user_id === userStore.currentUser?.id,
      )?.user ?? null,
  );

  // ── Data loading ─────────────────────────────────────────────────────────────
  const loadRecentPayments = async () => {
    if (!currentHouse.value) return;
    const response = await balanceService.getRecentPayments(
      currentHouse.value.id,
    );
    // Best effort: the list is secondary, keep the last good one on failure.
    if (!response.error && response.data) recentPayments.value = response.data;
  };

  /**
   * First call shows the skeleton; later calls reload in the background and
   * keep the stale content on screen (a failed refresh must not blank it).
   */
  const loadBalance = async () => {
    if (!currentHouse.value) return;
    const background = houseBalance.value !== null;
    if (background) refreshing.value = true;
    else loading.value = true;
    try {
      const [response] = await Promise.all([
        balanceService.getHouseBalance(currentHouse.value.id),
        loadRecentPayments(),
      ]);
      if (response.error) throw new Error(response.error);
      houseBalance.value = response.data;
    } catch {
      if (!background) houseBalance.value = null;
    } finally {
      loading.value = false;
      refreshing.value = false;
    }
  };

  // Single load owner: the watcher (immediate: true) covers both the
  // already-initialized case (fires immediately with the current house) and
  // the not-yet-initialized case (fires once housesStore.initialize() below
  // populates currentHouse). See pages/bills/index.vue for the same pattern
  // and its explanatory comment — an onMounted that also awaited initialize()
  // and then loaded used to fire a second, redundant load alongside this
  // watcher.
  watch(
    currentHouse,
    (newHouse) => {
      if (newHouse) loadBalance();
    },
    { immediate: true },
  );

  // housesStore always sets lastFetch once initialize() settles, even when the
  // user has no house (see stores/houses.ts) — that's the terminal signal for
  // "there's genuinely no house", distinct from "still loading". Without this,
  // a house-less user would sit on the loading skeleton forever, since the
  // watcher above only calls loadBalance() (and only loadBalance clears
  // `loading`) when a house shows up.
  watch(
    () => housesStore.lastFetch,
    (fetched) => {
      if (fetched && !currentHouse.value) loading.value = false;
    },
  );

  onMounted(() => {
    housesStore.initialize();
  });

  // ── Settlement flow ───────────────────────────────────────────────────────────
  /** Settles immediately; the undo toast is the safety net, not a modal. */
  const markSettlementComplete = async (transaction: SettlementTransaction) => {
    const key = `${transaction.from_user_id}-${transaction.to_user_id}`;
    processingSettlement.value = key;
    try {
      if (!currentHouse.value) throw new Error('No current house');
      const result = await balanceService.settleUserToUser(
        currentHouse.value.id,
        transaction.from_user_id,
        transaction.to_user_id,
      );
      if (result.error || !result.data) {
        throw new Error(result.error ?? 'Failed to settle transaction');
      }
      const settlementId = result.data.settlement_id;
      const amount = formatAmount(result.data.amount, currency.value);
      const isCredit = transaction.to_user_id === userStore.currentUser?.id;
      showUndoToast(
        isCredit
          ? t('balance.recordedReceived', {
              amount,
              name: transaction.from_user.first_name,
            })
          : t('balance.recordedPaid', {
              amount,
              name: transaction.to_user.first_name,
            }),
        () => void undoSettlement(settlementId),
      );
      await loadBalance();
    } catch (error) {
      const planChanged =
        error instanceof Error && error.message === 'NOT_IN_PLAN';
      const errorId: string = notificationStore.error(
        t(planChanged ? 'balance.planChanged' : 'balance.markPaidFailed'),
        t(
          planChanged
            ? 'balance.planChangedCause'
            : 'balance.markPaidFailedCause',
        ),
        planChanged
          ? undefined
          : {
              action: {
                label: t('common.retry'),
                action: () => {
                  notificationStore.dismissNotification(errorId);
                  void markSettlementComplete(transaction);
                },
              },
            },
      );
      // The plan may have moved under us: show what the server says now.
      if (planChanged) await loadBalance();
    } finally {
      processingSettlement.value = null;
    }
  };

  /** Server 409 codes → copy. Anything else is a generic failure. */
  const UNDO_ERROR_KEYS: Record<string, string> = {
    UNDO_WINDOW_EXPIRED: 'balance.undoExpired',
    ALREADY_UNDONE: 'balance.undoAlready',
  };

  const undoSettlement = async (settlementId: string) => {
    if (!currentHouse.value) return;
    const result = await balanceService.undoSettlement(
      currentHouse.value.id,
      settlementId,
    );
    if (result.error) {
      notificationStore.error(
        t(UNDO_ERROR_KEYS[result.error] ?? 'balance.undoFailed'),
        '',
      );
    } else {
      notificationStore.success(t('balance.recordUndone'), '');
    }
    // Success or 409, the server state is the truth.
    await loadBalance();
  };

  return {
    houseBalance,
    loading,
    refreshing,
    recentPayments,
    soleTransfer,
    soleTransferIsCredit,
    processingSettlement,
    myCredits,
    me,
    otherPeople,
    currency,
    netStanding,
    totalToReceive,
    totalToPay,
    myDebts,
    headline,
    fmtNet,
    fmtToReceive,
    fmtToPay,
    formatAmount,
    loadBalance,
    markSettlementComplete,
    undoSettlement,
    currentUserId: computed(() => userStore.currentUser?.id ?? ''),
  };
}
