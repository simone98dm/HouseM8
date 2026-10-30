<script setup lang="ts">
/**
 * Price block for an annual plan: per-month equivalent (headline), then the
 * yearly total actually charged and the VAT notice. Amounts arrive formatted.
 */
interface PricingAmountProps {
  monthly: string;
  yearly: string;
}

const { monthly, yearly } = defineProps<PricingAmountProps>();
</script>

<template>
  <div>
    <p class="text-3xl font-bold text-fg text-numeric">
      {{ monthly }}
      <span class="text-sm font-normal text-fg-muted"
        >/{{ $t('common.month') }}</span
      >
    </p>
    <p class="text-sm text-fg-muted">
      {{ $t('pricing.billedYearly', { amount: yearly }) }}
    </p>
    <p class="text-xs text-fg-muted">
      {{ $t('pricing.vatIncluded') }}
    </p>
  </div>
</template>
