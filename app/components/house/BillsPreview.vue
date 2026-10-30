<script lang="ts" setup>
import type { Bill, Currency } from '~/types';

interface HouseBillsPreviewProps {
  bills: Bill[];
  maxVisible?: number;
}

const { bills, maxVisible = 5 } = defineProps<HouseBillsPreviewProps>();

const { t } = useI18n();
const housesStore = useHousesStore();
const { formatAmount } = useCurrency();
const shareOf = (bill: Bill) =>
  billShare(bill.monthly_cost, housesStore.activeMembers.length);
const { formatDue, formatDueRelative, dueStatus } = useDueDate();

const visibleBills = computed(() => bills.slice(0, maxVisible));

const statusBadge = (dateString: string) => {
  const status = dueStatus(dateString);
  if (status === 'overdue')
    return { class: 'badge-danger', key: 'bills.overdue' };
  if (status === 'soon')
    return { class: 'badge-warning', key: 'bills.dueSoon' };
  return null;
};
</script>

<template>
  <UiCard :title="t('home.upcomingBills')" :heading-level="2">
    <template #actions>
      <UiLinkButton to="/bills" variant="ghost" size="sm">
        {{ t('home.viewAll') }}
      </UiLinkButton>
    </template>

    <p
      v-if="bills.length === 0"
      class="py-6 text-center text-base text-fg-muted"
    >
      {{ t('home.noUpcomingBills') }}
    </p>

    <template v-else>
      <ul role="list" class="divide-y divide-line">
        <li
          v-for="bill in visibleBills"
          :key="bill.id"
          class="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
        >
          <UiCategoryChip
            size="sm"
            :category="resolveCategory(bill.categories, bill.description)"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-fg">
              {{ bill.description }}
            </p>
            <p class="mt-px text-sm text-fg-muted">
              {{ formatDueRelative(bill.next_due_date) }}
              <span aria-hidden="true">·</span>
              {{ formatDue(bill.next_due_date) }}
              <span aria-hidden="true">·</span>
              {{
                bill.payment_period > 1
                  ? t('bills.card.every', { period: bill.payment_period })
                  : t('bills.monthly')
              }}
            </p>
          </div>
          <div class="flex shrink-0 flex-col items-end gap-1">
            <span class="text-numeric text-sm font-semibold text-fg">
              <UiCurrency
                :amount="shareOf(bill)"
                :currency-code="bill.currency"
              />
            </span>
            <span
              v-if="shareOf(bill) !== bill.monthly_cost"
              class="text-xs font-medium text-fg-muted tabular-nums"
            >
              {{
                t('expenses.card.ofTotal', {
                  amount: formatAmount(
                    bill.monthly_cost,
                    bill.currency as Currency,
                  ),
                })
              }}
            </span>
            <span
              v-if="statusBadge(bill.next_due_date)"
              class="badge"
              :class="statusBadge(bill.next_due_date)!.class"
            >
              {{ t(statusBadge(bill.next_due_date)!.key) }}
            </span>
          </div>
        </li>
      </ul>

      <div v-if="bills.length > maxVisible" class="text-center">
        <UiLinkButton to="/bills" variant="ghost" size="sm">
          +{{ bills.length - maxVisible }} {{ t('common.more') }}
        </UiLinkButton>
      </div>
    </template>
  </UiCard>
</template>
