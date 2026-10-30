import { defineStore } from 'pinia';
import type {
  UiNotification,
  NotificationType,
  UiNotificationAction,
} from '~/types';

export const useNotificationStore = defineStore('notifications', () => {
  // Reactive state
  const active = ref<UiNotification[]>([]);
  const history = ref<UiNotification[]>([]);

  const activeNotifications = computed(() => active.value);
  const notificationHistory = computed(() => history.value);
  const unreadCount = computed(() => active.value.length);
  const hasActiveNotifications = computed(() => active.value.length > 0);

  const generateId = (): string => {
    return `notification-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  };

  // WCAG 2.2.1: a timed toast (e.g. Undo) must wait while it is hovered or
  // focused. Each auto-dismiss keeps its remaining time so it can pause.
  const dismissals = new Map<
    string,
    {
      remaining: number;
      timer: ReturnType<typeof setTimeout> | null;
      startedAt: number;
    }
  >();

  const pauseDismissal = (id: string): void => {
    const entry = dismissals.get(id);
    if (!entry?.timer) return;
    clearTimeout(entry.timer);
    entry.timer = null;
    entry.remaining = Math.max(
      1000,
      entry.remaining - (Date.now() - entry.startedAt),
    );
  };

  const resumeDismissal = (id: string): void => {
    const entry = dismissals.get(id);
    if (!entry || entry.timer) return;
    entry.startedAt = Date.now();
    entry.timer = setTimeout(() => dismissNotification(id), entry.remaining);
  };

  const addNotification = (
    type: NotificationType,
    title: string,
    description: string,
    options?: {
      action?: UiNotificationAction;
      autoDismiss?: boolean;
      duration?: number;
      i18n?: boolean;
    },
  ): string => {
    const {
      action,
      autoDismiss = true,
      duration = 5000,
      i18n = false,
    } = options || {};

    const notification: UiNotification = {
      id: generateId(),
      type,
      title,
      description,
      action,
      timestamp: new Date(),
      dismissed: false,
      autoDismiss,
      i18n,
    };

    // Add to active notifications
    active.value.push(notification);

    // Add to history (keep last 50 notifications)
    history.value.unshift(notification);
    if (history.value.length > 50) {
      history.value.splice(50);
    }

    // Auto-dismiss if enabled
    if (autoDismiss && duration > 0) {
      dismissals.set(notification.id, {
        remaining: duration,
        timer: null,
        startedAt: 0,
      });
      resumeDismissal(notification.id);
    }

    return notification.id;
  };

  const dismissNotification = (id: string): void => {
    const entry = dismissals.get(id);
    if (entry?.timer) clearTimeout(entry.timer);
    dismissals.delete(id);
    const activeIndex = active.value.findIndex((n) => n.id === id);
    if (activeIndex !== -1) {
      const historyIndex = history.value.findIndex((n) => n.id === id);
      if (historyIndex !== -1 && history.value[historyIndex]) {
        history.value[historyIndex].dismissed = true;
      }

      active.value.splice(activeIndex, 1);
    }
  };

  const clearAllNotifications = (): void => {
    // Mark all active notifications as dismissed
    active.value.forEach((notification) => {
      const historyIndex = history.value.findIndex(
        (n) => n.id === notification.id,
      );
      if (historyIndex !== -1 && history.value[historyIndex]) {
        history.value[historyIndex].dismissed = true;
      }
    });

    // Clear active notifications and their pending/paused auto-dismiss timers
    dismissals.forEach((entry) => {
      if (entry.timer) clearTimeout(entry.timer);
    });
    dismissals.clear();
    active.value.splice(0);
  };

  const clearHistory = (): void => {
    history.value.splice(0);
  };

  // Convenience methods for different notification types
  const success = (
    title: string,
    description: string,
    options?: {
      action?: UiNotificationAction;
      autoDismiss?: boolean;
      duration?: number;
      i18n?: boolean;
    },
  ) => {
    return addNotification('success', title, description, options);
  };

  const error = (
    title: string,
    description: string,
    options?: {
      action?: UiNotificationAction;
      autoDismiss?: boolean;
      duration?: number;
      i18n?: boolean;
    },
  ) => {
    return addNotification('error', title, description, {
      ...options,
      autoDismiss: false,
    });
  };

  const warning = (
    title: string,
    description: string,
    options?: {
      action?: UiNotificationAction;
      autoDismiss?: boolean;
      duration?: number;
      i18n?: boolean;
    },
  ) => {
    return addNotification('warning', title, description, options);
  };

  const info = (
    title: string,
    description: string,
    options?: {
      action?: UiNotificationAction;
      autoDismiss?: boolean;
      duration?: number;
      i18n?: boolean;
    },
  ) => {
    return addNotification('info', title, description, options);
  };

  return {
    activeNotifications,
    notificationHistory,
    unreadCount,
    hasActiveNotifications,

    addNotification,
    dismissNotification,
    pauseDismissal,
    resumeDismissal,
    clearAllNotifications,
    clearHistory,

    // Convenience methods
    success,
    error,
    warning,
    info,
  };
});
