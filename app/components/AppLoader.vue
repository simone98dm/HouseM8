<script lang="ts" setup>
const { isLoading } = useLoading();
const { t } = useI18n();
</script>

<template>
  <!-- Always mounted so assistive tech announces the text change. -->
  <div role="status" class="sr-only">
    {{ isLoading ? t('common.loading') : '' }}
  </div>
  <div
    v-if="isLoading"
    class="pointer-events-none fixed inset-x-0 top-0 z-[var(--z-toast)] h-[3px] overflow-hidden"
    aria-hidden="true"
  >
    <div
      class="app-loader-bar h-full w-1/3 bg-brand motion-reduce:w-full motion-reduce:animate-none"
    />
  </div>
</template>
