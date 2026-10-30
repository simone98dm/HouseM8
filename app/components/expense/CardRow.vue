<script lang="ts" setup>
import type { Currency, Expense } from '~/types';

interface ExpenseCardProps {
  expense: Expense;
  currentUserId?: string;
  isDeleting?: boolean;
}

const {
  expense,
  currentUserId = '',
  isDeleting = false,
} = defineProps<ExpenseCardProps>();

interface ExpenseCardEvents {
  delete: [expenseId: string];
  click: [expense: Expense];
}

const emit = defineEmits<ExpenseCardEvents>();

const { t: $t } = useI18n();

const { formatAmount } = useCurrency();

const {
  userShare,
  isPaid,
  youPaid,
  owedToYou,
  formattedDateShort,
  expenseCategory,
  expenseIconName,
} = useExpenseCardPresentation(
  () => expense,
  () => currentUserId,
);

const fmt = (amount: number) =>
  formatAmount(amount, expense.currency as Currency);

const payerName = computed(
  () => expense.payer?.first_name ?? expense.creator?.first_name ?? '',
);

// When you paid, the right column already says so; the subtitle is the date.
const paidByLine = computed(() =>
  !youPaid.value && payerName.value
    ? $t('expenses.card.paidBy', { name: payerName.value })
    : '',
);

// Word + dot, never colour alone. Payers are pending while others owe them.
const status = computed<'pending' | 'settled' | null>(() => {
  if (youPaid.value) return owedToYou.value > 0 ? 'pending' : 'settled';
  if (!userShare.value) return null;
  return isPaid.value ? 'settled' : 'pending';
});
</script>

<template>
  <!-- Single element root (TransitionGroup on the page's <ul> animates one
       element per child). Responsive on its own: two lines on phones, actions wrap beneath. -->
  <li
    :class="[
      'relative transition-colors hover:bg-surface-hover',
      { 'opacity-50 pointer-events-none': isDeleting },
    ]"
    :aria-busy="isDeleting || undefined"
  >
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
      <UiCategoryChip :category="expenseCategory" :icon="expenseIconName" />

      <div class="min-w-0 flex-1">
        <!-- Primary target: its ::after stretches over the whole row. -->
        <button
          type="button"
          class="block max-w-full cursor-pointer truncate text-left font-semibold text-fg after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-brand"
          :title="expense.description"
          :aria-label="
            $t('expenses.card.viewDetailsLabel', {
              description: expense.description,
            })
          "
          @click="emit('click', expense)"
        >
          {{ expense.description }}
        </button>
        <p class="truncate text-sm text-fg-muted">
          {{ paidByLine }}
          <template v-if="paidByLine"> · </template>{{ formattedDateShort }}
        </p>
        <ExpenseMetaBadges :categories="expense.categories" class="mt-1.5" />
      </div>

      <div class="shrink-0 text-right text-numeric">
        <template v-if="youPaid">
          <p class="font-semibold text-fg">
            {{
              $t('expenses.card.youPaidAmount', {
                amount: fmt(expense.total_amount),
              })
            }}
          </p>
          <p v-if="owedToYou > 0" class="text-sm font-medium text-fg-muted">
            {{ $t('expenses.card.owedToYou', { amount: fmt(owedToYou) }) }}
          </p>
        </template>
        <template v-else-if="userShare">
          <p class="font-semibold text-fg">{{ fmt(userShare.amount_due) }}</p>
          <p class="text-sm font-medium text-fg-muted">
            {{
              $t('expenses.card.ofTotal', { amount: fmt(expense.total_amount) })
            }}
          </p>
        </template>
        <p v-else class="text-sm text-fg-muted">
          {{ $t('expenses.card.notInSplit') }}
        </p>
        <p
          v-if="status"
          class="mt-0.5 flex items-center justify-end gap-1.5 text-sm font-medium text-fg-muted"
        >
          <span
            class="size-2 rounded-full"
            :class="status === 'settled' ? 'bg-ok' : 'bg-warn'"
            aria-hidden="true"
          />
          {{
            status === 'settled'
              ? $t('expenses.card.settled')
              : $t('expenses.status.pending')
          }}
        </p>
      </div>
    </div>
  </li>
</template>
