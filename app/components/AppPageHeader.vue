<script lang="ts" setup>
import type { RouteLocationRaw } from 'vue-router';

interface AppPageHeaderProps {
  title?: string;
  meta?: string;
  allowBack?: boolean;
  backTo?: RouteLocationRaw;
}

const {
  title = undefined,
  meta = undefined,
  allowBack = false,
  backTo = undefined,
} = defineProps<AppPageHeaderProps>();

const notificationStore = useNotificationStore();
</script>

<template>
  <ClientOnly>
    <Teleport to="#header-content">
      <AppHeader
        :title="title"
        :meta="meta"
        :allow-back="allowBack"
        :back-to="backTo"
        :notifications="notificationStore.notificationHistory"
        :unread-count="notificationStore.unreadCount"
        @clear-notifications="notificationStore.clearHistory()"
      >
        <slot />
        <template v-if="$slots.actions" #actions>
          <slot name="actions" />
        </template>
      </AppHeader>
    </Teleport>
  </ClientOnly>
</template>
