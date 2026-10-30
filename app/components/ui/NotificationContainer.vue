<script lang="ts" setup>
import type { UiNotification } from '~/types';

interface NotificationContainerProps {
  notifications?: UiNotification[];
}

interface NotificationContainerEmits {
  dismiss: [id: string];
  pause: [id: string];
  resume: [id: string];
}

const { notifications = [] } = defineProps<NotificationContainerProps>();
const emit = defineEmits<NotificationContainerEmits>();

const handleDismiss = (id: string) => {
  emit('dismiss', id);
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="notifications.length > 0"
      class="fixed inset-x-0 top-0 z-[var(--z-toast)] flex justify-center pointer-events-none p-4 md:inset-x-auto md:right-0 md:justify-end"
    >
      <TransitionGroup
        name="notification"
        tag="div"
        class="flex w-full flex-col gap-2 pointer-events-auto md:w-auto"
      >
        <UiNotification
          v-for="notification in notifications"
          :key="notification.id"
          :notification="notification"
          :i18n="notification.i18n"
          @dismiss="handleDismiss(notification.id)"
          @pause="emit('pause', notification.id)"
          @resume="emit('resume', notification.id)"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.notification-enter-active,
.notification-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.notification-leave-active {
  position: absolute;
}

.notification-enter-from,
.notification-leave-to {
  opacity: 0;
  transform: translateY(-1rem);
}

.notification-move {
  transition: transform 0.3s ease;
}

@media (prefers-reduced-motion: reduce) {
  .notification-enter-active,
  .notification-leave-active,
  .notification-move {
    transition: opacity 0.01ms;
  }

  .notification-enter-from,
  .notification-leave-to {
    transform: none;
  }
}
</style>
