<script lang="ts" setup>
/**
 * The dashboard's loading placeholder, used in two places: as `<ClientOnly>`'s
 * server-rendered fallback, and as the client-side branch while the stores are
 * still filling.
 *
 * It mirrors the real tree — the month hero and upcoming bills beside the tall
 * bulletin column, then the payment feed — and reuses those same layout
 * classes, so nothing shifts when the data arrives.
 */
const { t } = useI18n();
</script>

<template>
  <div class="dash-stack" role="status" aria-busy="true">
    <span class="sr-only">{{ t('common.loading') }}</span>
    <div class="dash-top">
      <div class="dash-main">
        <UiSkeleton :height="300" rounded="rounded-card" />
        <UiSkeleton :height="260" rounded="rounded-card" />
      </div>
      <UiSkeleton :height="120" rounded="rounded-card" class="dash-bulletin" />
    </div>
    <UiSkeleton :height="280" rounded="rounded-card" />
  </div>
</template>
