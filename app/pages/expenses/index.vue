<script lang="ts" setup>
import type { CreateBillPayload, Currency } from '~/types';

const { t: $t } = useI18n();
useSeoMeta({ title: () => $t('seo.titles.expenses') });

const userStore = useUserStore();
const billsStore = useBillsStore();

const {
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
  groupedExpenses,
  filteredExpenses,
  totalOwed,
  totalOwedToYou,
  handleCreateExpense,
  deleteExpense,
  handleExpenseClick,
  handleCloseViewModal,
  handleDeleteExpense,
} = useExpensesPage();

const { formatShort } = useDate();
const dayLabel = (group: { kind: string; date: Date }) =>
  group.kind === 'date'
    ? formatShort(group.date, { year: false })
    : $t(`expenses.day.${group.kind}`);

const houseCurrency = computed(
  () => currentHouse.value?.currency as Currency | undefined,
);

// "Does it repeat?" on: the add sheet posts a bill instead of an expense.
const handleCreateBill = async (payload: CreateBillPayload) => {
  try {
    // The store returns false (and toasts) on failure: keep the sheet open.
    if (await billsStore.createBill(payload)) showCreateModal.value = false;
  } catch {
    // Handled by store
  }
};

// Settling a share, or adding/removing an expense, changes the plan: reload
// the headline whenever the paid state or the set of expenses changes.
const { headline } = useHouseMoneyHeadline(
  () => currentHouse.value?.id,
  () =>
    expenses.value
      .map(
        (e) =>
          `${e.id}:${e.total_amount}:${(e.shares ?? []).map((s) => +!!s.is_paid).join('')}`,
      )
      .join('|'),
);
</script>

<template>
  <AppPageHeader :title="$t('expenses.title')">
    <template #actions>
      <UiButton
        variant="primary"
        icon="plus"
        class="max-md:hidden"
        @click="showCreateModal = true"
      >
        {{ $t('expenses.addExpense') }}
      </UiButton>
    </template>
  </AppPageHeader>
  <UiContainer class="pb-24 md:pb-0">
    <ExpenseSummaryCards
      v-if="!loading"
      :total-owed="totalOwed"
      :total-owed-to-you="totalOwedToYou"
      :currency-code="currentHouse?.currency ?? 'EUR'"
      :headline="headline"
    />

    <ExpenseFilterBar
      :current-filter="currentFilter"
      :search-query="searchQuery"
      @filter-change="currentFilter = $event"
      @search-change="searchQuery = $event"
    />

    <!-- Monthly report download (Pro feature). ClientOnly is load-bearing:
         `currentHouse` is store state that does not exist during SSR, so the
         server rendered a placeholder and the client rendered a card — a
         hydration mismatch. Do not unwrap this. -->
    <ClientOnly>
      <ExpenseMonthlyReportCard
        v-if="currentHouse?.id"
        :house-id="currentHouse.id"
        class="mb-2"
      />
    </ClientOnly>

    <div>
      <div v-if="loading" role="status">
        <span class="sr-only">{{ $t('common.loading') }}</span>
        <div v-for="g in 2" :key="g" aria-hidden="true" class="mb-6">
          <UiSkeleton class="mb-2 h-4 w-20" />
          <UiCard padding="none">
            <ul class="divide-y divide-line">
              <li
                v-for="n in g === 1 ? 3 : 2"
                :key="n"
                class="flex items-center gap-4 px-4 py-3 sm:px-5"
              >
                <UiSkeleton class="size-10 shrink-0 rounded-lg" />
                <div class="flex-1 space-y-2">
                  <UiSkeleton class="h-4 w-40" />
                  <UiSkeleton class="h-3 w-24" />
                </div>
                <div class="space-y-2">
                  <UiSkeleton class="ml-auto h-4 w-16" />
                  <UiSkeleton class="ml-auto h-3 w-12" />
                </div>
              </li>
            </ul>
          </UiCard>
        </div>
      </div>

      <ExpenseEmptyState
        v-else-if="filteredExpenses.length === 0"
        :filter="currentFilter"
        @add-click="showCreateModal = true"
      />

      <template v-else>
        <section
          v-for="group in groupedExpenses"
          :key="group.key"
          :aria-labelledby="`day-${group.key}`"
          class="mb-6"
        >
          <h2
            :id="`day-${group.key}`"
            class="mb-2 text-sm font-semibold text-fg-muted"
          >
            {{ dayLabel(group) }}
          </h2>
          <UiCard padding="none">
            <TransitionGroup
              name="list-item"
              tag="ul"
              role="list"
              class="relative divide-y divide-line"
            >
              <ExpenseCardRow
                v-for="expense in group.items"
                :key="expense.id"
                :expense="expense"
                :current-user-id="userStore.currentUser?.id"
                :is-deleting="deletingExpenseId === expense.id"
                @delete="deleteExpense"
                @click="handleExpenseClick"
              />
            </TransitionGroup>
          </UiCard>
        </section>
      </template>
    </div>
  </UiContainer>

  <UiFab
    v-if="!loading"
    :label="$t('expenses.addExpense')"
    @click="showCreateModal = true"
  />

  <!-- No `v-if` alongside `:show`: an outer v-if mounts the modal with `show`
       already true, so <Transition> skips the enter animation, and unmounts it
       instantly on close, skipping the leave animation. UiModal already gates
       its own content on `show`. -->
  <LazyExpenseEditModal
    :show="showCreateModal"
    :members="members"
    :current-user="userStore.currentUser"
    :currency="houseCurrency"
    @close="showCreateModal = false"
    @submit="handleCreateExpense"
    @submit-bill="handleCreateBill"
  />

  <LazyExpenseViewModal
    :show="showViewModal"
    :expense="selectedExpense"
    :current-user-id="userStore.currentUser?.id ?? ''"
    @close="handleCloseViewModal"
    @delete="handleDeleteExpense"
  />
</template>
