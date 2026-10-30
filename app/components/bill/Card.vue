<script lang="ts" setup>
import type { Bill, Currency } from '~/types';

interface BillCardProps {
  bill: Bill;
}

const { bill } = defineProps<BillCardProps>();

const housesStore = useHousesStore();
const share = computed(() =>
  billShare(bill.monthly_cost, housesStore.activeMembers.length),
);

const { formatAmount } = useCurrency();
const { formatDue, formatDueRelative, dueStatus } = useDueDate();

const category = computed(() =>
  resolveCategory(bill.categories, bill.description),
);

const status = computed(() => dueStatus(bill.next_due_date));
const isOverdue = computed(() => status.value === 'overdue');
const isDueSoon = computed(() => status.value === 'soon');

const dueDateClass = computed(() => {
  if (isOverdue.value) return 'text-danger-fg';
  if (isDueSoon.value) return 'text-warn-fg';
  return 'text-fg-muted';
});
</script>

<template>
  <!-- One row, one target: the title link stretches over the whole row
       (DESIGN.md §5). The list container lives in the page. -->
  <li
    class="relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover has-[:focus-visible]:bg-surface-hover sm:gap-4 sm:px-5"
  >
    <UiCategoryChip :category="category" />

    <div class="min-w-0 flex-1">
      <h3 class="truncate text-base font-semibold text-fg">
        <NuxtLink
          :to="`/bills/${bill.id}`"
          class="text-fg after:absolute after:inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
        >
          {{ bill.description }}
        </NuxtLink>
      </h3>
      <p class="mt-0.5 flex flex-wrap items-center gap-x-1 text-sm">
        <span :class="dueDateClass">
          {{ formatDueRelative(bill.next_due_date) }}
        </span>
        <span class="text-fg-muted">
          <span aria-hidden="true">·</span>
          {{ formatDue(bill.next_due_date) }}
        </span>
        <span v-if="bill.payment_period > 1" class="text-fg-muted">
          <span aria-hidden="true">·</span>
          {{ $t('bills.card.every', { period: bill.payment_period }) }}
        </span>
      </p>
    </div>

    <div class="flex shrink-0 flex-col items-end gap-1">
      <span class="text-numeric text-base font-semibold text-fg">
        <UiCurrency :amount="share" :currency-code="bill.currency" />
      </span>
      <span
        v-if="share !== bill.monthly_cost"
        class="text-sm font-medium text-fg-muted tabular-nums"
      >
        {{
          $t('expenses.card.ofTotal', {
            amount: formatAmount(bill.monthly_cost, bill.currency as Currency),
          })
        }}
      </span>
      <span v-if="isOverdue" class="badge badge-danger">
        {{ $t('bills.overdue') }}
      </span>
      <span v-else-if="isDueSoon" class="badge badge-warning">
        {{ $t('bills.dueSoon') }}
      </span>
      <span v-else class="text-xs text-fg-muted">
        {{ $t('bills.card.perMonth') }}
      </span>
    </div>
  </li>
</template>
