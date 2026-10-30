<script setup lang="ts">
interface Events {
  retry: [];
}

defineEmits<Events>();
</script>

<template>
  <div class="flex flex-col items-center py-16 text-center">
    <Icon
      name="heroicons:calculator"
      class="size-8 text-fg-muted"
      aria-hidden="true"
    />
    <h2 class="mt-3 text-base font-semibold text-fg">
      {{ $t('balance.noBalanceData') }}
    </h2>
    <p class="mt-1 mb-6 max-w-xs text-sm text-fg-muted">
      {{ $t('balance.noBalanceDataDesc') }}
    </p>
    <UiButton variant="primary" size="md" @click="$emit('retry')">
      {{ $t('common.retry') }}
    </UiButton>
  </div>
</template>
