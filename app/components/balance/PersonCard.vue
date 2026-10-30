<script setup lang="ts">
import type { UserBalance } from '~/types/composables/balance';

interface PersonCardProps {
  balance: UserBalance;
  currency: 'USD' | 'EUR';
  formattedNetBalance: string;
  /** The viewer: their own row is phrased in second person. */
  currentUserId?: string;
}

const {
  balance,
  formattedNetBalance,
  currentUserId = '',
} = defineProps<PersonCardProps>();

/**
 * net_balance > 0 → this person is owed money (creditor)
 * net_balance < 0 → this person owes money (debtor)
 * Neutral ink for every person: the status word says it, no red for a person.
 */
const isOwedToThem = computed(() => balance.net_balance > 0.01);
const isEven = computed(
  () => balance.net_balance >= -0.01 && balance.net_balance <= 0.01,
);

const isMe = computed(
  () => !!currentUserId && balance.user_id === currentUserId,
);

const label = computed(() => {
  if (isEven.value) return 'balance.even';
  if (isMe.value)
    return isOwedToThem.value ? 'balance.youAreOwed' : 'balance.youOweTotal';
  return isOwedToThem.value ? 'balance.isOwed' : 'balance.owes';
});
</script>

<template>
  <li class="flex items-center justify-between gap-3 px-4 py-3">
    <div class="flex min-w-0 items-center gap-3">
      <UiUserAvatar
        :user="balance.user as never"
        size="md"
        aria-hidden="true"
      />
      <!-- Name only: a second "owed" line used to repeat the figure's label
           against a different (gross) number. -->
      <p class="truncate text-sm font-medium text-fg">
        <template v-if="isMe">{{ $t('balance.you') }}</template>
        <template v-else>
          {{ balance.user.first_name }} {{ balance.user.last_name }}
        </template>
      </p>
    </div>

    <div class="shrink-0 text-right">
      <p class="text-sm font-semibold text-numeric text-fg">
        {{ formattedNetBalance }}
      </p>
      <p class="text-xs text-fg-muted">{{ $t(label) }}</p>
    </div>
  </li>
</template>
