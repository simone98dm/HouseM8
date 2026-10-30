<script lang="ts" setup>
import type { Bill, Currency } from '~/types';
import type { HeroAction } from '~/composables/useDashboardPage';
import type { MoneyHeadline } from '~/composables/useMoneyHeadline';
import type { SettlementTransaction } from '~/types/composables/balance';
import type { YourMonth } from '~/utils/homeFigures';

interface YourMonthCardProps {
  month: YourMonth;
  /** ISO code as the house stores it; formatted as `Currency`. */
  currency: string;
  headline: MoneyHeadline;
  action: HeroAction | null;
  nextBill: Bill | null;
  isSettling?: boolean;
  /** False when the balance failed to load, so "settled" is not claimed. */
  isBalanceAvailable?: boolean;
  isBalanceLoading?: boolean;
}

const {
  month,
  currency,
  headline,
  action,
  nextBill,
  isSettling = false,
  isBalanceAvailable = true,
  isBalanceLoading = false,
} = defineProps<YourMonthCardProps>();

const emit = defineEmits<{ settle: [tx: SettlementTransaction] }>();

const { t } = useI18n();
const { formatAmount } = useCurrency();
const { formatDueRelative } = useDueDate();

const money = (amount: number) => formatAmount(amount, currency as Currency);
</script>

<template>
  <!-- Whom to pay leads (PRODUCT.md: "one name, one amount, one button");
       the month's cost is a supporting fact, not the hero (DESIGN.md §1). -->
  <UiCard
    as="section"
    padding="lg"
    :title="t('home.yourMonth.title')"
    :heading-level="2"
  >
    <div>
      <UiSkeleton
        v-if="isBalanceLoading && !headline.sentence"
        :height="40"
        rounded="rounded-control"
      />
      <p v-else-if="!isBalanceAvailable" class="text-base text-fg-muted">
        {{ t('home.yourMonth.balanceUnavailable') }}
      </p>
      <div
        v-else-if="headline.sentence"
        class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3"
      >
        <p
          class="min-w-0 text-xl font-semibold text-fg text-pretty sm:text-2xl"
        >
          <BalanceHeadlineSentence :parts="headline.parts" />
        </p>
        <UiButton
          v-if="action?.kind === 'settle'"
          :variant="action.isCredit ? 'secondary' : 'primary'"
          size="md"
          :loading="isSettling"
          @click="emit('settle', action.tx)"
        >
          {{ action.label }}
        </UiButton>
        <UiLinkButton
          v-else-if="action?.kind === 'link'"
          :to="action.to"
          variant="primary"
          size="md"
        >
          {{ action.label }}
        </UiLinkButton>
      </div>
    </div>

    <dl class="flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-4">
      <div>
        <dt class="text-xs font-medium text-fg-muted">
          {{ t('home.yourMonth.facts.total') }}
        </dt>
        <dd class="mt-0.5 text-base font-semibold text-numeric text-fg">
          {{ money(month.total) }}
        </dd>
      </div>
      <div>
        <dt class="text-xs font-medium text-fg-muted">
          {{ t('home.yourMonth.facts.bills') }}
        </dt>
        <dd class="mt-0.5 text-sm text-numeric text-fg">
          {{ money(month.bills) }}
        </dd>
      </div>
      <div>
        <dt class="text-xs font-medium text-fg-muted">
          {{ t('home.yourMonth.facts.shared') }}
        </dt>
        <dd class="mt-0.5 text-sm text-numeric text-fg">
          {{ money(month.shared) }}
        </dd>
      </div>
    </dl>

    <p v-if="nextBill" class="border-t border-line pt-4 text-sm text-fg-muted">
      {{ t('home.yourMonth.next') }}
      <NuxtLink
        :to="`/bills/${nextBill.id}`"
        class="rounded-control font-semibold text-fg hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {{ nextBill.description }}
      </NuxtLink>
      <span aria-hidden="true"> · </span
      >{{ formatDueRelative(nextBill.next_due_date) }}
    </p>
  </UiCard>
</template>
