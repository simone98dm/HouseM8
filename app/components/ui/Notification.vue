<script lang="ts" setup>
import type { UiNotification } from '~/types';

interface NotificationProps {
  notification: UiNotification;
  i18n?: boolean;
}

interface NotificationEvents {
  dismiss: [];
  pause: [];
  resume: [];
}

const { notification, i18n = false } = defineProps<NotificationProps>();

const emit = defineEmits<NotificationEvents>();

const { t } = useI18n();

// Notification type → state-card variant. 'info' has no dedicated DESIGN.md
// token, so it reuses 'primary' (both are the Electric Blue family).
const stateVariant = computed(() =>
  notification.type === 'info' ? 'primary' : notification.type,
);

// Errors/warnings interrupt (alert); everything else is polite (status).
const isUrgent = computed(
  () => notification.type === 'error' || notification.type === 'warning',
);

// Notification icons
const iconNames = {
  success: 'heroicons:check-circle',
  error: 'heroicons:x-circle',
  warning: 'heroicons:exclamation-triangle',
  info: 'heroicons:information-circle',
};

const handleDismiss = () => {
  emit('dismiss');
};

const handleAction = () => notification.action?.action();

// Format timestamp
const formattedTime = computed(() => {
  const now = new Date();
  const diff = now.getTime() - notification.timestamp.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return t('notifications.justNow');
  if (minutes < 60) return t('notifications.minutesAgo', { count: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('notifications.hoursAgo', { count: hours });

  const days = Math.floor(hours / 24);
  return t('notifications.daysAgo', { count: days });
});
</script>

<template>
  <div
    :class="`state-card--${stateVariant}`"
    class="state-card shadow-sm max-w-sm w-full"
    :role="isUrgent ? 'alert' : 'status'"
    aria-atomic="true"
    @mouseenter="emit('pause')"
    @mouseleave="emit('resume')"
    @focusin="emit('pause')"
    @focusout="emit('resume')"
  >
    <div
      :class="`state-card-icon-chip--${stateVariant}`"
      class="state-card-icon-chip"
    >
      <Icon
        :name="iconNames[notification.type]"
        class="w-4 h-4"
        aria-hidden="true"
      />
    </div>

    <div class="flex items-start flex-1 min-w-0">
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between">
          <p class="text-sm font-medium text-fg break-words">
            {{ i18n ? $t(notification.title) : notification.title }}
          </p>
          <span class="text-xs text-fg-muted ml-2 shrink-0">
            {{ formattedTime }}
          </span>
        </div>

        <p class="mt-1 text-sm text-fg-muted break-words">
          {{ i18n ? $t(notification.description) : notification.description }}
        </p>

        <div v-if="notification.action" class="mt-3">
          <UiButton variant="ghost" size="sm" @click="handleAction">
            {{
              i18n ? $t(notification.action.label) : notification.action.label
            }}
          </UiButton>
        </div>
      </div>

      <!-- Close button. Raw: bespoke icon-only dismiss; 44px hit area on phones, 32px from md. -->
      <div class="ml-3 -mr-2 -mt-2 shrink-0">
        <button
          type="button"
          class="inline-flex size-11 items-center justify-center rounded-control text-fg-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand md:size-8"
          :aria-label="t('common.close')"
          @click="handleDismiss"
        >
          <Icon name="heroicons:x-mark" class="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>
