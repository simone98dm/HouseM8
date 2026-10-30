// Longer than the default 5s so there's time to read the toast and tap Undo.
export const UNDO_TOAST_MS = 10_000;

/**
 * The one "done, Undo?" toast for money actions (DESIGN.md §5: they settle
 * immediately, the toast is the safety net). Returns `showUndoToast(message,
 * onUndo)`; tapping Undo dismisses the toast and runs `onUndo`.
 */
export function useUndoToast() {
  const notificationStore = useNotificationStore();
  const { t } = useI18n();

  return (message: string, onUndo: () => void): string => {
    const toastId: string = notificationStore.success(message, '', {
      duration: UNDO_TOAST_MS,
      action: {
        label: t('balance.undo'),
        action: () => {
          notificationStore.dismissNotification(toastId);
          onUndo();
        },
      },
    });
    return toastId;
  };
}
