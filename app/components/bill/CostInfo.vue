<script setup lang="ts">
interface BillCostInfoProps {
  monthlyCost: number;
  currency: string;
  costPeriodLabel: string;
  totalCostLabel: string;
  totalCost: number;
  periodLabel: string;
}

defineProps<BillCostInfoProps>();
</script>

<template>
  <div class="space-y-5">
    <div>
      <p class="text-xs font-medium text-fg-muted mb-1">
        {{ $t('bills.details.costPerPeriod') }}
      </p>
      <UiCurrency
        :amount="monthlyCost"
        :currency-code="currency"
        class="text-2xl font-bold text-numeric text-fg"
      />
      <p class="text-sm text-fg-muted mt-0.5">
        {{ costPeriodLabel }}
      </p>
    </div>

    <div>
      <p class="text-xs font-medium text-fg-muted mb-1">
        {{ totalCostLabel }}
      </p>
      <UiCurrency
        :amount="totalCost"
        :currency-code="currency"
        class="text-xl font-bold text-numeric text-brand"
      />
      <p class="text-sm text-fg-muted mt-0.5">
        {{ periodLabel }}
      </p>
    </div>
  </div>
</template>
