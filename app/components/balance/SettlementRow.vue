<script setup lang="ts">
import type { SettlementTransaction } from '~/types/composables/balance';

interface SettlementRowProps {
  transaction: SettlementTransaction;
  formattedAmount: string;
  loading?: boolean;
  /** Phrases the row from this person's side ("You pay Marco"). */
  currentUserId?: string;
}

interface Events {
  markPaid: [transaction: SettlementTransaction];
}

const {
  transaction,
  formattedAmount,
  loading = false,
  currentUserId = '',
} = defineProps<SettlementRowProps>();
defineEmits<Events>();

const { formatDue, isOverdue } = useDueDate();

/** The viewer is owed this money: the verb is "received", not "paid". */
const isCredit = computed(
  () => !!currentUserId && transaction.to_user_id === currentUserId,
);
const isDebt = computed(
  () => !!currentUserId && transaction.from_user_id === currentUserId,
);
// The other side of the pair, whatever the direction.
const counterpart = computed(() =>
  isCredit.value ? transaction.from_user : transaction.to_user,
);
</script>

<template>
  <li class="flex flex-wrap items-center gap-x-3 gap-y-3 px-4 py-3">
    <!-- You ↔ them pair: the arrow points the way the money goes. -->
    <div class="flex shrink-0 items-center gap-1" aria-hidden="true">
      <UiUserAvatar :user="transaction.from_user as never" size="sm" />
      <Icon name="heroicons:arrow-right" class="size-4 text-fg-subtle" />
      <UiUserAvatar :user="transaction.to_user as never" size="sm" />
    </div>

    <div class="min-w-0 flex-1 basis-40">
      <p class="text-sm font-medium text-fg">
        <template v-if="isDebt">
          {{ $t('balance.youOwe', { name: transaction.to_user.first_name }) }}
        </template>
        <template v-else-if="isCredit">
          {{
            $t('balance.owesYou', { name: transaction.from_user.first_name })
          }}
        </template>
        <template v-else>
          {{ transaction.from_user.first_name }}
          <span class="font-normal text-fg-muted">{{
            $t('balance.pays')
          }}</span>
          {{ transaction.to_user.first_name }}
        </template>
      </p>
      <p class="text-sm text-numeric text-fg-muted">{{ formattedAmount }}</p>
      <p v-if="transaction.due_date" class="text-sm text-fg-muted">
        {{
          $t(
            isOverdue(transaction.due_date)
              ? 'balance.dueOverdue'
              : 'balance.dueBy',
            {
              date: formatDue(transaction.due_date),
            },
          )
        }}
      </p>
    </div>

    <!-- Visible text is the verb; the accessible name starts with it
         (WCAG 2.5.3 label in name) and adds who/how much. -->
    <UiButton
      variant="primary"
      size="sm"
      class="max-sm:w-full sm:shrink-0"
      :loading="loading"
      :aria-label="`${$t(isCredit ? 'balance.markReceived' : 'balance.markPaid')} — ${$t(
        isCredit ? 'a11y.buttons.settleCredit' : 'a11y.buttons.settleDebt',
        {
          name: counterpart.first_name,
          amount: formattedAmount,
        },
      )}`"
      @click="$emit('markPaid', transaction)"
    >
      {{ $t(isCredit ? 'balance.markReceived' : 'balance.markPaid') }}
    </UiButton>
  </li>
</template>
