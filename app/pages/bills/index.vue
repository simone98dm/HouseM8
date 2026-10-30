<script lang="ts" setup>
import type { Bill, CreateBillPayload, Currency } from '~/types';

const { t: $t } = useI18n();

useSeoMeta({
  title: $t('seo.titles.bills'),
});

const billsStore = useBillsStore();
const housesStore = useHousesStore();

const currentHouse = computed(() => housesStore.currentHouse);
const loading = ref(true);
const showCreateModal = ref(false);
const listHeadingId = useId();
const error = ref('');

const activeBills = computed(() =>
  billsStore.bills.filter((bill: Bill) => bill.active),
);

const totalMonthlyBills = computed(() =>
  activeBills.value.reduce((total, bill) => total + bill.monthly_cost, 0),
);

const { formatAmount } = useCurrency();
const { formatDue } = useDueDate();

const currencyCode = computed(
  () => (currentHouse.value?.currency || 'EUR') as Currency,
);

// Equal split across active members: bills carry no per-user split data.
const memberCount = computed(() =>
  Math.max(1, housesStore.activeMembers.length),
);

const nextBill = computed(
  () =>
    [...activeBills.value].sort((a, b) =>
      a.next_due_date.localeCompare(b.next_due_date),
    )[0] ?? null,
);

const nextBillDue = computed(() =>
  nextBill.value
    ? $t('bills.summary.nextDueWhen', {
        date: formatDue(nextBill.value.next_due_date),
      })
    : '',
);

// Supporting phrase under the hero sentence: your share, then the house total.
const nextBillDetail = computed(() =>
  [
    nextBill.value && memberCount.value > 1
      ? $t('bills.summary.nextDueDetail', {
          total: formatAmount(nextBill.value.monthly_cost, currencyCode.value),
        })
      : '',
    $t('bills.summary.monthlyPhrase', {
      total: formatAmount(totalMonthlyBills.value, currencyCode.value),
    }),
  ]
    .filter(Boolean)
    .join(' · '),
);

const loadBills = async () => {
  loading.value = true;
  error.value = '';
  try {
    if (!currentHouse.value) {
      await housesStore.initialize();
    }
    if (!currentHouse.value) {
      error.value = $t('errors.noHouseSelected');
      return;
    }
    await billsStore.loadHouseBills(currentHouse.value.id);
  } catch {
    error.value = $t('bills.loadFailedCause');
  } finally {
    loading.value = false;
  }
};

const handleBillSubmit = async (payload: CreateBillPayload) => {
  try {
    await billsStore.createBill(payload);
    showCreateModal.value = false;
    await loadBills();
  } catch {
    // Error handled by store
  }
};

// Single load owner: the watcher (immediate: true) covers both the
// already-initialized case (fires immediately with the current house) and
// the not-yet-initialized case (fires once housesStore.initialize() below
// populates currentHouse). An onMounted that also called loadBills() after
// initialize() resolved used to fire a second, redundant loadHouseBills()
// alongside this watcher — see docs/OPTIMIZATION_PLAN.md Phase 5 correction.
watch(
  currentHouse,
  (newHouse) => {
    if (newHouse) {
      loadBills();
    }
  },
  { immediate: true },
);

onMounted(() => {
  housesStore.initialize();
});
</script>

<template>
  <AppPageHeader :title="$t('navigation.bills')">
    <template #actions>
      <UiButton
        variant="primary"
        icon="plus"
        class="max-md:hidden"
        @click="showCreateModal = true"
      >
        {{ $t('bills.addBill') }}
      </UiButton>
    </template>
  </AppPageHeader>

  <UiContainer class="flex flex-col pb-24 md:pb-0">
    <UiSummary
      v-if="nextBill"
      class="mb-4"
      :label="$t('bills.summary.nextDue')"
      :detail="nextBillDetail"
    >
      {{ nextBill.description }}
      <span class="text-numeric">
        <UiCurrency
          :amount="nextBill.monthly_cost / memberCount"
          :currency-code="currencyCode"
        />
      </span>
      {{ nextBillDue }}
    </UiSummary>

    <section :aria-labelledby="listHeadingId">
      <BillListHeader :id="listHeadingId" :title="$t('bills.recurringTitle')" />

      <UiCard v-if="loading" class="mt-4" padding="none" role="status">
        <span class="sr-only">{{ $t('common.loading') }}</span>
        <ul class="divide-y divide-line" aria-hidden="true">
          <li
            v-for="n in 3"
            :key="n"
            class="flex items-center gap-4 px-4 py-3 sm:px-5"
          >
            <UiSkeleton class="size-10 shrink-0 rounded-control" />
            <div class="flex-1 space-y-2">
              <UiSkeleton class="h-4 w-40" />
              <UiSkeleton class="h-3 w-28" />
            </div>
            <UiSkeleton class="h-5 w-16" />
          </li>
        </ul>
      </UiCard>

      <!-- Error state: shared state-card pattern. -->
      <div
        v-else-if="error"
        class="state-card state-card--error mt-4"
        role="alert"
      >
        <div class="state-card-icon-chip state-card-icon-chip--error">
          <Icon
            name="heroicons:exclamation-circle"
            class="w-4 h-4"
            aria-hidden="true"
          />
        </div>
        <p class="flex-1 text-sm">{{ error }}</p>
        <UiButton size="sm" variant="secondary" @click="loadBills">
          {{ $t('common.retry') }}
        </UiButton>
      </div>

      <BillEmptyState
        v-else-if="activeBills.length === 0"
        class="mt-4"
        :title="$t('bills.noBills.title')"
        :message="$t('bills.noBills.message')"
        :button-text="$t('bills.addBill')"
        @add-click="showCreateModal = true"
      />

      <UiCard v-else class="mt-4" padding="none">
        <TransitionGroup
          name="list-item"
          tag="ul"
          role="list"
          class="relative divide-y divide-line"
        >
          <BillCard v-for="bill in activeBills" :key="bill.id" :bill="bill" />
        </TransitionGroup>
      </UiCard>
    </section>
  </UiContainer>

  <UiFab
    v-if="!loading"
    :label="$t('bills.addBill')"
    @click="showCreateModal = true"
  />

  <!-- Create Bill Modal (lazy loaded) -->
  <!-- No `v-if` alongside `:show` — see the note in pages/expenses/index.vue:
       an outer v-if skips both the enter and leave animations. -->
  <LazyBillModal
    :show="showCreateModal"
    :current-house="currentHouse"
    @close="showCreateModal = false"
    @submit="handleBillSubmit"
  />
</template>
