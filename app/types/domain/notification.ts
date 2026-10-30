/**
 * Notification system types
 */

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface UiNotificationAction {
  label: string;
  action: () => void;
}

export interface UiNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  message?: string; // For simple notifications
  action?: UiNotificationAction;
  timestamp: Date;
  dismissed?: boolean;
  autoDismiss?: boolean;
  i18n?: boolean;
  duration?: number;
}

export interface UiNotificationState {
  active: UiNotification[];
  history: UiNotification[];
}
