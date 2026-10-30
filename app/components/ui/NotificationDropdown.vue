<script lang="ts" setup>
import type { UiNotification } from '~/types';

interface NotificationDropdownProps {
  notifications?: UiNotification[];
  unreadCount?: number;
}

interface NotificationDropdownEmits {
  'clear-history': [];
}

const { notifications = [], unreadCount = 0 } =
  defineProps<NotificationDropdownProps>();
const emit = defineEmits<NotificationDropdownEmits>();

const { t } = useI18n();
const { formatShort } = useDate();

const isOpen = ref(false);
const dropdownRef = ref<HTMLElement>();
const triggerRef = ref<HTMLButtonElement>();

// Close dropdown when clicking outside
const handleClickOutside = (event: Event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isOpen.value) {
    isOpen.value = false;
    // The panel unmounts (v-if) on close; if focus was inside it (e.g. on
    // "Clear all"), it would otherwise fall back to <body> and strand
    // keyboard users. Return it to the trigger, same as a closing modal.
    triggerRef.value?.focus();
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeydown);
});

const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
};

const clearHistory = () => {
  emit('clear-history');
  isOpen.value = false;
};

// Format timestamp for history
const formatHistoryTime = (timestamp: Date) => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return t('notifications.justNow');
  if (minutes < 60) return t('notifications.minutesAgo', { count: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('notifications.hoursAgo', { count: hours });

  const days = Math.floor(hours / 24);
  if (days < 7) return t('notifications.daysAgo', { count: days });

  return formatShort(timestamp);
};

// Notification type → shared state-card icon-chip variant (components/_state-card.scss).
// 'info' reuses 'primary' — no dedicated DESIGN.md token for it.
const getTypeStyle = (type: string) => {
  const variant = type === 'info' ? 'primary' : type;
  return `state-card-icon-chip--${variant}`;
};

const getTypeIcon = (type: string) => {
  const icons = {
    success: 'heroicons:check-circle',
    error: 'heroicons:x-circle',
    warning: 'heroicons:exclamation-triangle',
    info: 'heroicons:information-circle',
  };
  return icons[type as keyof typeof icons] || icons.info;
};
</script>

<template>
  <div ref="dropdownRef" class="relative">
    <!-- Notifications Button. Raw: AppHeader.vue reserves this button's exact
         footprint with a placeholder div during SSR fallback (44px square on phones) to
         avoid a hydration layout shift — swapping to UiButton's padding
         scale (px-4 py-2.5+) would change that footprint and reintroduce
         the shift the placeholder was added to prevent. -->
    <button
      ref="triggerRef"
      type="button"
      class="relative flex items-center gap-2 p-2 text-fg-muted hover:text-fg hover:bg-surface-hover rounded-control max-sm:size-11 max-sm:justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      :aria-label="
        unreadCount > 0
          ? t(
              'notifications.titleWithUnread',
              { count: unreadCount },
              unreadCount,
            )
          : t('notifications.title')
      "
      :aria-expanded="isOpen"
      :aria-haspopup="true"
      @click="toggleDropdown"
    >
      <Icon name="heroicons:bell" class="w-5 h-5" aria-hidden="true" />

      <span
        v-if="unreadCount > 0"
        class="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-on-status bg-danger rounded-full"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>

      <span class="hidden sm:block text-sm font-medium">
        {{ t('notifications.title') }}
      </span>
    </button>

    <Transition
      enter-active-class="transition-[opacity,transform] ease-out duration-200 motion-reduce:transition-none"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-[opacity,transform] ease-in duration-150 motion-reduce:transition-none"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] bg-surface-raised rounded-card shadow-lg border border-line z-[var(--z-dropdown)]"
      >
        <div class="px-4 py-3 border-b border-line">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-fg">
              {{ t('notifications.title') }}
            </h3>
            <!-- Raw: a plain unpadded text link inline with the h3; UiButton's
                 padding/hover-background would misalign it from the heading. -->
            <button
              v-if="notifications.length > 0"
              type="button"
              class="text-sm text-fg-muted hover:text-fg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              @click="clearHistory"
            >
              {{ t('notifications.clearAll') }}
            </button>
          </div>
        </div>

        <div class="max-h-96 overflow-y-auto">
          <div v-if="notifications.length === 0" class="px-4 py-8 text-center">
            <Icon
              name="heroicons:bell-slash"
              class="mx-auto w-12 h-12 text-fg-subtle"
              aria-hidden="true"
            />
            <p class="mt-2 text-sm text-fg-muted">
              {{ t('notifications.noNotifications') }}
            </p>
          </div>

          <ul v-else class="py-2">
            <li
              v-for="notification in notifications"
              :key="notification.id"
              class="px-4 py-3 hover:bg-surface-hover transition-colors"
              :class="{ 'opacity-60': notification.dismissed }"
            >
              <div class="flex items-start space-x-3">
                <div
                  class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  :class="getTypeStyle(notification.type)"
                  aria-hidden="true"
                >
                  <Icon
                    :name="getTypeIcon(notification.type)"
                    class="w-4 h-4"
                    aria-hidden="true"
                  />
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between">
                    <p class="text-sm font-medium text-fg truncate">
                      {{
                        notification.i18n
                          ? t(notification.title)
                          : notification.title
                      }}
                    </p>
                    <span class="text-xs text-fg-muted ml-2 shrink-0">
                      {{ formatHistoryTime(notification.timestamp) }}
                    </span>
                  </div>
                  <p class="mt-1 text-sm text-fg-muted line-clamp-2">
                    {{
                      notification.i18n
                        ? t(notification.description)
                        : notification.description
                    }}
                  </p>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}
</style>
