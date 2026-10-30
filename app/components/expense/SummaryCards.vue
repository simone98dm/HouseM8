<script lang="ts" setup>
import type { Currency } from '~/types';
import type { MoneyHeadline } from '~/composables/useMoneyHeadline';

interface ExpenseSummaryProps {
  /** Your unpaid shares. */
  totalOwed: number;
  /** What housemates still owe you on expenses you paid. */
  totalOwedToYou: number;
  currencyCode?: string;
  /** Only its settle-up action is used; the sentence is this component's. */
  headline?: MoneyHeadline | null;
}

const {
  totalOwed,
  totalOwedToYou,
  currencyCode = 'EUR',
  headline = null,
} = defineProps<ExpenseSummaryProps>();

const { t: $t } = useI18n();
const { formatAmount } = useCurrency();

const fmt = (amount: number) => formatAmount(amount, currencyCode as Currency);

const isSquare = computed(() => totalOwed <= 0 && totalOwedToYou <= 0);

// Only name the non-zero side: "You still owe €0.00" is noise.
const sentence = computed(() => {
  if (isSquare.value) return $t('expenses.summary.square');
  if (totalOwedToYou <= 0)
    return $t('expenses.summary.oweOnly', { owe: fmt(totalOwed) });
  if (totalOwed <= 0)
    return $t('expenses.summary.owedOnly', { owed: fmt(totalOwedToYou) });
  return $t('expenses.summary.line', {
    owe: fmt(totalOwed),
    owed: fmt(totalOwedToYou),
  });
});

// Owing vs owed as shares of the open total; the sentence is the real content.
const owePercent = computed(() =>
  isSquare.value
    ? 0
    : Math.round((totalOwed / (totalOwed + totalOwedToYou)) * 100),
);
</script>

<template>
  <UiCard as="section" padding="lg" class="mb-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <p class="min-w-0 text-xl font-semibold text-fg text-pretty sm:text-2xl">
        {{ sentence }}
      </p>
      <UiLinkButton
        v-if="headline?.action"
        variant="ghost"
        size="sm"
        class="-mx-3"
        :to="headline.action.to"
      >
        {{ headline.action.label }}
      </UiLinkButton>
    </div>
    <div
      v-if="!isSquare"
      class="mt-4 flex h-1.5 gap-0.5 overflow-hidden rounded-full"
      aria-hidden="true"
    >
      <span
        v-if="owePercent > 0"
        class="bg-warn"
        :style="{ width: `${owePercent}%` }"
      />
      <span
        v-if="owePercent < 100"
        class="bg-ok"
        :style="{ width: `${100 - owePercent}%` }"
      />
    </div>
  </UiCard>
</template>
