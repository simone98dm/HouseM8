<script lang="ts" setup>
import type { SettlementTransaction } from '~/types/composables/balance';
import { useCurrency } from '~/composables/useCurrency';

interface Props {
  transactions: SettlementTransaction[];
  currency: 'USD' | 'EUR';
  processingKey: string | null;
  currentUserId?: string;
  /** 'credits': money coming to the viewer ("Mark as received"). */
  variant?: 'debts' | 'credits';
}

interface Events {
  settle: [transaction: SettlementTransaction];
}

const {
  transactions,
  currency,
  processingKey,
  currentUserId = '',
  variant = 'debts',
} = defineProps<Props>();
defineEmits<Events>();

const headingId = `my-${variant}-heading`;
const { formatAmount } = useCurrency();

const settlementKey = (tx: SettlementTransaction) =>
  `${tx.from_user_id}-${tx.to_user_id}`;

const isProcessing = (tx: SettlementTransaction) =>
  processingKey === settlementKey(tx);
</script>

<template>
  <section :aria-labelledby="headingId">
    <div class="mb-3 flex items-baseline justify-between gap-3">
      <h2 :id="headingId" class="text-base font-semibold text-fg">
        {{
          $t(variant === 'credits' ? 'balance.comingToYou' : 'balance.myDebts')
        }}
      </h2>
      <span v-if="transactions.length > 0" class="text-sm text-fg-muted">
        {{
          $t(
            variant === 'credits'
              ? 'balance.comingToYouCount'
              : 'balance.myDebtsCount',
            { count: transactions.length },
          )
        }}
      </span>
    </div>

    <UiCard v-if="transactions.length > 0" padding="none">
      <ul class="divide-y divide-line">
        <BalanceSettlementRow
          v-for="tx in transactions"
          :key="settlementKey(tx)"
          :transaction="tx"
          :formatted-amount="formatAmount(tx.amount, currency)"
          :loading="isProcessing(tx)"
          :current-user-id="currentUserId"
          @mark-paid="$emit('settle', tx)"
        />
      </ul>
    </UiCard>

    <p v-else class="text-sm text-fg-muted">
      {{ $t('balance.noDebts') }}. {{ $t('balance.noDebtsDesc') }}
    </p>
  </section>
</template>
