<script lang="ts" setup>
/**
 * HouseMoneySnapshot - This month's cost to the user and where they stand in
 * the house, each figure linking to the page that explains it.
 */
import type { Currency } from '~/types';

interface HouseMoneySnapshotProps {
  currency: string;
  /** The user's cost this month (euros); null while unknown. */
  monthTotal?: number | null;
  /** The user's net balance (euros): negative = owes, positive = is owed. */
  balance?: number | null;
}

const {
  currency,
  monthTotal = null,
  balance = null,
} = defineProps<HouseMoneySnapshotProps>();

// Below a cent the user is square.
const SQUARE_THRESHOLD = 0.01;

const { t } = useI18n();
const { formatAmount } = useCurrency();

const money = (n: number) => formatAmount(Math.abs(n), currency as Currency);

const balanceText = computed(() => {
  if (balance === null) return t('houseProfile.money.balanceUnavailable');
  if (Math.abs(balance) < SQUARE_THRESHOLD)
    return t('houseProfile.money.settled');
  return balance < 0
    ? t('houseProfile.money.owe', { amount: money(balance) })
    : t('houseProfile.money.owed', { amount: money(balance) });
});

const headingId = useId();
const linkClass =
  'inline-flex min-h-11 items-center rounded-control text-sm font-medium text-brand underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
</script>

<template>
  <UiCard as="section" :aria-labelledby="headingId">
    <template #header>
      <h2 :id="headingId" class="min-w-0 text-base font-semibold text-fg">
        {{ t('houseProfile.money.title') }}
      </h2>
    </template>
    <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <dt class="text-xs font-medium text-fg-muted">
          {{ t('houseProfile.money.month') }}
        </dt>
        <dd class="mt-1">
          <span class="block text-lg font-semibold text-fg text-numeric">
            {{ monthTotal === null ? '–' : money(monthTotal) }}
          </span>
          <NuxtLink to="/expenses" :class="linkClass">
            {{ t('houseProfile.money.viewExpenses') }}
          </NuxtLink>
        </dd>
      </div>
      <div>
        <dt class="text-xs font-medium text-fg-muted">
          {{ t('houseProfile.money.balance') }}
        </dt>
        <dd class="mt-1">
          <span class="block text-lg font-semibold text-fg">{{
            balanceText
          }}</span>
          <NuxtLink to="/balance" :class="linkClass">
            {{ t('houseProfile.money.viewBalance') }}
          </NuxtLink>
        </dd>
      </div>
    </dl>
  </UiCard>
</template>
