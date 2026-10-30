import type { House, CreateBulletinNotePayload } from '~/types';
import type { SettlementTransaction } from '~/types/composables/balance';

const RECENT_PAYMENTS_LIMIT = 10;
const REPORTS_SCAN_LIMIT = 100;

export type HeroAction =
  | {
      kind: 'settle';
      label: string;
      tx: SettlementTransaction;
      isCredit: boolean;
    }
  | { kind: 'link'; label: string; to: string };

export interface AttentionItem {
  key: 'overdueBills' | 'dueSoonBills' | 'openReports' | 'unsettled';
  count: number;
  to: string;
  /** Formatted money, for the `unsettled` item. */
  amount?: string;
}

/**
 * Owns the /dashboard page's state and actions: the OAuth-redirect cleanup,
 * the initial-loading gate, the "Your month" figures, the money sentence and its
 * one action, the owner/admin status line, recent payments, and the create-house / bulletin-note
 * handlers. Extracted from dashboard.vue so the page's script
 * stays focused on rendering the resulting states.
 */
export function useDashboardPage() {
  const route = useRoute();
  const router = useRouter();
  const housesStore = useHousesStore();
  const expensesStore = useExpensesStore();
  const billsStore = useBillsStore();
  const userStore = useUserStore();
  const notificationStore = useNotificationStore();
  const { t } = useI18n();
  const reportsApi = useReportsApi();
  const bulletinNotesStore = useBulletinNotesStore();

  // ── OAuth redirect cleanup ──────────────────────────────────────────────────
  onMounted(async () => {
    if (route.query.oauth_completed === 'true') {
      await router.replace({
        query: { ...route.query, oauth_completed: undefined },
      });
      try {
        await userStore.fetchCurrentUser(true);
      } catch {
        // Error handled by store
      }
    }
  });

  // ── Initial loading gate ────────────────────────────────────────────────────
  const hasInitiallyLoaded = ref(false);

  const isInitialLoading = computed(() => {
    if (!hasInitiallyLoaded.value) {
      if (!userStore.currentUser) return true;
      return housesStore.lastFetch === null || housesStore.isLoading;
    }
    return false;
  });

  watch(
    [
      () => housesStore.lastFetch,
      () => housesStore.isLoading,
      () => userStore.currentUser,
    ],
    ([lastFetch, isLoading, currentUser]) => {
      if (
        currentUser &&
        lastFetch !== null &&
        !isLoading &&
        !hasInitiallyLoaded.value
      ) {
        hasInitiallyLoaded.value = true;
      }
    },
    { immediate: true },
  );

  // ── Derived data ────────────────────────────────────────────────────────────
  const house = computed(() => housesStore.currentHouse);
  const members = computed(() => housesStore.activeMembers);
  const upcomingBills = computed(() => billsStore.upcomingBills.slice(0, 5));
  const notes = computed(() => bulletinNotesStore.activeNotes);
  const currentUserId = computed(() => userStore.currentUser?.id);

  watch(
    house,
    async (newHouse) => {
      if (newHouse?.id) await bulletinNotesStore.loadHouseNotes(newHouse.id);
    },
    { immediate: true },
  );

  // ── Balance, payments and the one settle action ─────────────────────────────
  // /balance owns the plan, the settle call and its undo toast; Home reuses all
  // of it so the two never disagree.
  const balance = useBalancePage();
  const recentPayments = computed(() =>
    // Undone payments never show on Home: filter before the cap so they
    // cannot eat into the 10 rows.
    balance.recentPayments.value
      .filter((p) => !p.undone_at)
      .slice(0, RECENT_PAYMENTS_LIMIT),
  );

  /**
   * The hero's single action, mirroring the headline sentence (debts win). One
   * transaction on that side settles right here, with the undo toast; several
   * go to /balance, where the sentence names only the largest.
   */
  const heroAction = computed<HeroAction | null>(() => {
    const debts = balance.myDebts.value;
    const credits = balance.myCredits.value;
    const [debt] = debts;
    if (debt) {
      return debts.length === 1
        ? {
            kind: 'settle',
            label: t('balance.headline.settleUp'),
            tx: debt,
            isCredit: false,
          }
        : {
            kind: 'link',
            label: t('balance.headline.settleUp'),
            to: '/balance',
          };
    }
    const [credit] = credits;
    if (credit) {
      return credits.length === 1
        ? {
            kind: 'settle',
            label: t('balance.markReceived'),
            tx: credit,
            isCredit: true,
          }
        : { kind: 'link', label: t('balance.headline.view'), to: '/balance' };
    }
    return null;
  });

  // ── "Your month" hero ───────────────────────────────────────────────────────
  const month = computed(() =>
    yourMonth({
      bills: billsStore.bills,
      expenses: expensesStore.expenses,
      userId: currentUserId.value,
      memberCount: members.value.length,
    }),
  );
  const nextBill = computed(() => upcomingBills.value[0] ?? null);

  // ── Owner / admin status line ───────────────────────────────────────────────
  const isStaff = computed(() => {
    const role = members.value.find(
      (m) => m.user_id === currentUserId.value,
    )?.role;
    return role === 'owner' || role === 'admin';
  });

  // Reports reach only the owner; admins get the other two signals.
  const openReportCount = ref<number | null>(null);
  watch(
    [() => house.value?.id, () => housesStore.isOwner],
    async ([id, isOwner]) => {
      openReportCount.value = null;
      if (!id || !isOwner) return;
      const result = await reportsApi.getOwnerReports(
        undefined,
        1,
        REPORTS_SCAN_LIMIT,
      );
      // A failed load leaves the count out rather than claiming "all in order".
      openReportCount.value = result
        ? result.data.filter((r) => r.house_id === id && !r.solved_at).length
        : null;
    },
    { immediate: true },
  );

  const { dueStatus } = useDueDate();
  const attention = computed<AttentionItem[] | null>(() => {
    if (!isStaff.value) return null;
    if (housesStore.isOwner && openReportCount.value === null) return null;
    // Unknown while the balance loads: never claim "all in order" early.
    // A failed balance load is unknown too, not "all in order".
    if (balance.loading.value || !balance.houseBalance.value) return null;
    const dueCount = (status: 'overdue' | 'soon') =>
      billsStore.bills.filter(
        (b) =>
          b.active && b.next_due_date && dueStatus(b.next_due_date) === status,
      ).length;
    const transfers = balance.houseBalance.value?.settlement_transactions ?? [];
    const unsettledTotal = transfers.reduce((sum, x) => sum + x.amount, 0);
    const items: AttentionItem[] = [
      { key: 'overdueBills', count: dueCount('overdue'), to: '/bills' },
      { key: 'dueSoonBills', count: dueCount('soon'), to: '/bills' },
      { key: 'openReports', count: openReportCount.value ?? 0, to: '/reports' },
      {
        key: 'unsettled',
        count: unsettledTotal > 0 ? 1 : 0,
        to: '/balance',
        amount: balance.formatAmount(unsettledTotal, balance.currency.value),
      },
    ];
    return items.filter((item) => item.count > 0);
  });

  // ── Modals ──────────────────────────────────────────────────────────────────
  const showCreateHouse = ref(false);
  const { startLoading, stopLoading } = useLoading();

  const handleCreateHouse = async (payload: Partial<House>) => {
    startLoading();
    try {
      await housesStore.createHouse({
        name: payload.name ?? '',
        description: payload.address,
        currency: payload.currency || 'EUR',
        max_members: payload.max_members,
      });
      showCreateHouse.value = false;
      // Force a real refresh (not the no-op initialize() call) so members load
      // and hasHouse/isMember flip reactively without a manual page reload.
      await Promise.all([
        housesStore.initialize(true),
        expensesStore.initialize(),
        billsStore.initialize(),
        userStore.initialize(),
      ]);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      notificationStore.error('errors.failedToCreateHouse', msg);
    } finally {
      stopLoading();
    }
  };

  // ── Bulletin handlers ────────────────────────────────────────────────────────
  const handleCreateNote = async (payload: CreateBulletinNotePayload) => {
    if (house.value?.id)
      await bulletinNotesStore.createNote(house.value.id, payload);
  };

  const handleDeleteNote = async (noteId: string) => {
    await bulletinNotesStore.deleteNote(noteId);
  };

  return {
    house,
    members,
    upcomingBills,
    notes,
    currentUserId,
    houseBalance: balance.houseBalance,
    headline: balance.headline,
    heroAction,
    isSettling: computed(() => balance.processingSettlement.value !== null),
    markSettlementComplete: balance.markSettlementComplete,
    month,
    nextBill,
    attention,
    recentPayments,
    isBalanceLoading: balance.loading,
    isInitialLoading,
    showCreateHouse,
    handleCreateHouse,
    handleCreateNote,
    handleDeleteNote,
  };
}
