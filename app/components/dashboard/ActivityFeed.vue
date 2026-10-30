<script lang="ts" setup>
import type { Currency, User } from '~/types';
import type { RecentPayment } from '~/types/composables/balance';
import type { PaymentDirection } from '~/composables/usePaymentDescription';

interface ActivityFeedProps {
  payments: RecentPayment[];
  currentUserId?: string;
  /** ISO code as the house stores it; formatted as `Currency`. */
  currency: string;
}

const {
  payments,
  currentUserId = '',
  currency,
} = defineProps<ActivityFeedProps>();

const { t } = useI18n();
const { describe, direction, formatWhen } = usePaymentDescription();

// The sentence already says who paid whom; the arrow only reinforces it.
const DIRECTION_ICON: Record<
  PaymentDirection,
  { name: string; class: string }
> = {
  in: { name: 'heroicons:arrow-down-left', class: 'bg-ok-subtle text-ok-fg' },
  out: {
    name: 'heroicons:arrow-up-right',
    class: 'bg-danger-subtle text-danger-fg',
  },
  other: {
    name: 'heroicons:arrows-right-left',
    class: 'bg-surface-low text-fg-muted',
  },
};

// Undone payments never happened as far as Home is concerned; Balance keeps them.
const rows = computed(() =>
  payments
    .filter((p) => !p.undone_at)
    .map((p) => ({
      id: p.id,
      payer: p.from_user as User,
      sentence: describe(p, currency as Currency, currentUserId),
      when: formatWhen(p.created_at),
      iso: p.created_at,
      icon: DIRECTION_ICON[direction(p, currentUserId)],
    })),
);
</script>

<template>
  <UiCard
    as="section"
    :title="t('home.recentActivity')"
    :heading-level="2"
    padding="none"
  >
    <template #actions>
      <UiLinkButton to="/balance" variant="ghost" size="sm">
        {{ t('common.viewAll') }}
      </UiLinkButton>
    </template>

    <p v-if="rows.length === 0" class="px-5 py-10 text-center text-fg-muted">
      {{ t('balance.recent.empty') }}
    </p>

    <ul v-else role="list" class="divide-y divide-line">
      <li
        v-for="row in rows"
        :key="row.id"
        class="flex items-center gap-3 px-4 py-3 sm:px-5"
      >
        <span class="relative shrink-0">
          <UiUserAvatar size="sm" :user="row.payer" aria-hidden="true" />
          <span
            class="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full ring-2 ring-surface"
            :class="row.icon.class"
            aria-hidden="true"
          >
            <Icon :name="row.icon.name" class="size-3" />
          </span>
        </span>
        <p class="min-w-0 flex-1 text-sm font-medium text-fg sm:text-base">
          {{ row.sentence }}
        </p>
        <time
          class="shrink-0 text-sm text-fg-muted tabular-nums"
          :datetime="row.iso"
        >
          {{ row.when }}
        </time>
      </li>
    </ul>
  </UiCard>
</template>
