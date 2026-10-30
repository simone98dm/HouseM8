<script setup lang="ts">
import type { Currency } from '~/types';

interface CurrencyProps {
  amount: number;
  currencyCode?: string;
}

const { amount, currencyCode = 'N/A' } = defineProps<CurrencyProps>();
const { formatAmount } = useCurrency();
</script>

<template>
  <span>{{ formatAmount(amount, currencyCode as Currency) }}</span>
</template>
