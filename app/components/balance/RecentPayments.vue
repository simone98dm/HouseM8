<script lang="ts" setup>
import type { RecentPayment } from '~/types/composables/balance';

interface Props {
  payments: RecentPayment[];
  currency: 'USD' | 'EUR';
  currentUserId?: string;
}

interface Events {
  undo: [payment: RecentPayment];
}

const { payments, currency, currentUserId = '' } = defineProps<Props>();
defineEmits<Events>();

const { t } = useI18n();
const paymentText = usePaymentDescription();

// Undone payments are noise: collapsed behind a disclosure, newest first kept.
const active = computed(() => payments.filter((p) => !p.undone_at));
const undone = computed(() => payments.filter((p) => p.undone_at));

const formatWhen = paymentText.formatWhen;
const describe = (p: RecentPayment) =>
  paymentText.describe(p, currency, currentUserId);
</script>

<template>
  <section aria-labelledby="recent-payments-heading">
    <h2
      id="recent-payments-heading"
      class="mb-3 text-base font-semibold text-fg"
    >
      {{ t('balance.recent.title') }}
    </h2>

    <p v-if="active.length === 0" class="text-sm text-fg-muted">
      {{ t('balance.recent.empty') }}
    </p>

    <UiCard v-else padding="none">
      <ul class="divide-y divide-line">
        <li
          v-for="payment in active"
          :key="payment.id"
          class="flex items-center gap-3 px-4 py-3"
        >
          <p class="min-w-0 flex-1 text-sm font-medium text-fg">
            {{ describe(payment) }}
            <span class="font-normal text-fg-muted">
              · {{ formatWhen(payment.created_at) }}
            </span>
          </p>
          <UiButton
            v-if="payment.can_undo"
            variant="secondary"
            size="sm"
            class="shrink-0"
            :aria-label="`${t('balance.undo')} — ${describe(payment)}`"
            @click="$emit('undo', payment)"
          >
            {{ t('balance.undo') }}
          </UiButton>
        </li>
      </ul>
    </UiCard>

    <details v-if="undone.length > 0" class="group mt-3 text-sm text-fg-muted">
      <summary
        class="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-control font-medium hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden"
      >
        <Icon
          name="heroicons:chevron-right"
          class="size-4 transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
        {{ t('balance.recent.showUndone', { n: undone.length }) }}
      </summary>
      <ul class="mt-2 space-y-2">
        <li v-for="payment in undone" :key="payment.id">
          <span class="line-through">{{ describe(payment) }}</span>
          · {{ formatWhen(payment.created_at) }} ·
          {{ t('balance.recent.undone') }}
        </li>
      </ul>
    </details>
  </section>
</template>
