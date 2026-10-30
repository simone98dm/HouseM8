<script lang="ts" setup>
import { BUTTON_SIZE_KEY } from '~/composables/useButtonStyles';
import type { RouteLocationRaw } from 'vue-router';
import type { UiNotification } from '~/types';

interface AppHeaderProps {
  title?: string;
  meta?: string;
  allowBack?: boolean;
  backTo?: RouteLocationRaw;
  notifications?: UiNotification[];
  unreadCount?: number;
}

interface AppHeaderEmits {
  'clear-notifications': [];
}

const {
  title = undefined,
  meta = undefined,
  allowBack = false,
  backTo = undefined,
  notifications = [],
  unreadCount = 0,
} = defineProps<AppHeaderProps>();

const emit = defineEmits<AppHeaderEmits>();

const router = useRouter();

// One button size for the whole navbar, on every page: pages fill the actions
// slot but cannot resize it. `sm` matches the 36px notification bell.
provide(BUTTON_SIZE_KEY, 'sm');

// vue-router records the previous in-app entry in history.state.back; it is
// null when the page was opened directly or from another site.
const goBack = () => {
  if (router.options.history.state.back) {
    router.back();
    return;
  }
  router.push(backTo ?? '/dashboard');
};
</script>

<template>
  <header class="page-header">
    <div class="page-header-left">
      <UiButton
        v-if="allowBack"
        variant="ghost"
        size="sm"
        icon="chevron-left"
        :aria-label="$t('common.back')"
        @click="goBack"
      />
      <slot>
        <div v-if="title" class="page-header-titles">
          <h1>{{ title }}</h1>
          <p v-if="meta" class="page-header-meta">{{ meta }}</p>
        </div>
      </slot>
    </div>

    <div class="page-header-right">
      <slot name="actions" />

      <ClientOnly>
        <UiNotificationDropdown
          :notifications="notifications"
          :unread-count="unreadCount"
          @clear-history="emit('clear-notifications')"
        />
        <template #fallback>
          <!-- Reserve the bell button's footprint to avoid hydration shift -->
          <div class="size-9 max-sm:size-11" aria-hidden="true" />
        </template>
      </ClientOnly>
    </div>
  </header>
</template>
