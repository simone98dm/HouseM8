<script setup lang="ts">
/**
 * ExpenseViewModal — Read-only detail sheet for a single expense.
 * Shows header, total amount, split breakdown, and delete action for creators.
 */

import type { Currency, Expense } from '~/types';

interface ExpenseViewModalProps {
  show: boolean;
  expense: Expense | null;
  currentUserId: string;
}

interface ExpenseViewModalEvents {
  close: [];
  delete: [expenseId: string];
}

const { show, expense, currentUserId } = defineProps<ExpenseViewModalProps>();
const emit = defineEmits<ExpenseViewModalEvents>();

const { t: $t } = useI18n();
const { formatAmount } = useCurrency();
const { formatLong } = useDate();

const isCreator = computed(() => expense?.created_by === currentUserId);

const formatDate = (dateString: string) => formatLong(dateString);

const formatCurrency = (amount: number, currency?: string) =>
  formatAmount(amount, currency as Currency);

const handleDelete = () => {
  if (expense) emit('delete', expense.id);
};
</script>

<template>
  <UiModal
    :show="show"
    :title="$t('expenses.viewModal.title')"
    @close="$emit('close')"
  >
    <div v-if="expense" class="space-y-5">
      <div class="flex items-center gap-3 pb-4 border-b border-line">
        <div
          class="size-12 rounded-control bg-brand-subtle flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <Icon name="heroicons:banknotes" class="w-5 h-5 text-brand-hover" />
        </div>
        <div class="min-w-0">
          <h3 class="text-lg font-bold text-fg truncate">
            {{ expense.description }}
          </h3>
          <p class="text-sm text-fg-muted">
            {{ $t('expenses.viewModal.created') }}
            {{ formatDate(expense.created_at) }}
          </p>
          <div class="flex gap-1 text-sm text-fg-muted mt-0.5">
            <span>{{ $t('expenses.createdBy') }}</span>
            <NuxtLink
              :to="`/user/${expense.creator?.id}`"
              class="underline hover:text-fg transition-colors"
            >
              {{ expense.creator?.first_name }} {{ expense.creator?.last_name }}
            </NuxtLink>
          </div>
          <ExpenseMetaBadges :categories="expense.categories" class="mt-2" />
        </div>
      </div>

      <div
        class="bg-surface-hover rounded-control p-4 flex items-center justify-between"
      >
        <div>
          <p class="text-xs font-semibold text-fg-muted">
            {{ $t('expenses.viewModal.totalAmount') }}
          </p>
          <p
            class="text-3xl font-bold text-numeric tracking-tight text-fg mt-1"
          >
            {{ formatCurrency(expense.total_amount, expense.currency) }}
          </p>
        </div>
        <div class="text-right">
          <p class="text-xs font-semibold text-fg-muted">
            {{ $t('expenses.viewModal.currency') }}
          </p>
          <p class="text-lg font-bold text-numeric text-fg mt-1">
            {{ expense.currency ?? 'EUR' }}
          </p>
        </div>
      </div>

      <div v-if="expense.shares && expense.shares.length > 0">
        <h4 class="text-sm font-semibold text-fg-muted mb-3">
          {{ $t('expenses.viewModal.splitDetails') }}
        </h4>
        <div class="space-y-2">
          <div
            v-for="share in expense.shares"
            :key="share.id"
            class="flex items-center justify-between p-3 rounded-control border transition-colors"
            :class="
              share.is_paid ? 'state-card--success' : 'state-card--warning'
            "
          >
            <div class="flex items-center gap-3">
              <UiUserAvatar v-if="share.user" :user="share.user" size="sm" />
              <div>
                <p class="font-semibold text-sm text-fg">
                  {{ share.user?.first_name }} {{ share.user?.last_name }}
                  <span
                    v-if="share.user_id === currentUserId"
                    class="text-xs text-fg-muted font-normal"
                  >
                    ({{ $t('expenses.form.you') }})
                  </span>
                </p>
                <!-- Status dot + label: inherits color from the row's
                     state-card--{success,warning} modifier above. -->
                <span
                  class="flex items-center gap-1 text-xs font-semibold mt-0.5"
                >
                  <span
                    class="size-1.5 rounded-full"
                    :class="share.is_paid ? 'bg-ok' : 'bg-warn'"
                    aria-hidden="true"
                  />
                  {{
                    share.is_paid ? $t('expenses.paid') : $t('expenses.pending')
                  }}
                </span>
              </div>
            </div>
            <p class="font-bold text-sm text-fg">
              {{ formatCurrency(share.amount_due, expense.currency) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <template v-if="isCreator" #footer>
      <UiButton
        type="button"
        variant="danger"
        icon="trash"
        @click="handleDelete"
      >
        {{ $t('expenses.viewModal.deleteExpense') }}
      </UiButton>
    </template>
  </UiModal>
</template>
