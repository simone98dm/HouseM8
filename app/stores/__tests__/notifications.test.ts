/**
 * Notifications Store Tests — real store, no external deps to mock
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useNotificationStore } from '~/stores/notifications';

describe('useNotificationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('initializes with empty active notifications', () => {
      const store = useNotificationStore();
      expect(store.activeNotifications).toEqual([]);
    });

    it('initializes with empty history', () => {
      const store = useNotificationStore();
      expect(store.notificationHistory).toEqual([]);
    });

    it('initializes unreadCount at 0', () => {
      const store = useNotificationStore();
      expect(store.unreadCount).toBe(0);
    });

    it('initializes hasActiveNotifications as false', () => {
      const store = useNotificationStore();
      expect(store.hasActiveNotifications).toBe(false);
    });
  });

  describe('addNotification', () => {
    it('adds a notification to active list', () => {
      const store = useNotificationStore();
      store.addNotification('info', 'Title', 'Description');
      expect(store.activeNotifications).toHaveLength(1);
      expect(store.activeNotifications[0]!.type).toBe('info');
      expect(store.activeNotifications[0]!.title).toBe('Title');
      expect(store.activeNotifications[0]!.description).toBe('Description');
    });

    it('adds a notification to history', () => {
      const store = useNotificationStore();
      store.addNotification('info', 'Title', 'Description');
      expect(store.notificationHistory).toHaveLength(1);
    });

    it('returns a string id starting with notification-', () => {
      const store = useNotificationStore();
      const id = store.addNotification('info', 'Title', 'Description');
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^notification-/);
    });

    it('increments unreadCount per notification added', () => {
      const store = useNotificationStore();
      store.addNotification('info', 'T1', 'D1');
      store.addNotification('success', 'T2', 'D2');
      expect(store.unreadCount).toBe(2);
    });

    it('sets hasActiveNotifications to true', () => {
      const store = useNotificationStore();
      store.addNotification('info', 'T', 'D');
      expect(store.hasActiveNotifications).toBe(true);
    });

    it('auto-dismisses after the default 5000ms duration', () => {
      const store = useNotificationStore();
      store.addNotification('info', 'T', 'D', {
        autoDismiss: true,
        duration: 5000,
      });
      expect(store.activeNotifications).toHaveLength(1);
      vi.advanceTimersByTime(5000);
      expect(store.activeNotifications).toHaveLength(0);
    });

    it('does not auto-dismiss when autoDismiss is false', () => {
      const store = useNotificationStore();
      store.addNotification('info', 'T', 'D', { autoDismiss: false });
      vi.advanceTimersByTime(60000);
      expect(store.activeNotifications).toHaveLength(1);
    });

    it('auto-dismisses after a custom duration', () => {
      const store = useNotificationStore();
      store.addNotification('info', 'T', 'D', {
        autoDismiss: true,
        duration: 2000,
      });
      vi.advanceTimersByTime(1999);
      expect(store.activeNotifications).toHaveLength(1);
      vi.advanceTimersByTime(1);
      expect(store.activeNotifications).toHaveLength(0);
    });

    it('caps history at 50 entries', () => {
      const store = useNotificationStore();
      for (let i = 0; i < 55; i++) {
        store.addNotification('info', `Title ${i}`, 'D', {
          autoDismiss: false,
        });
      }
      expect(store.notificationHistory).toHaveLength(50);
    });
  });

  describe('dismissNotification', () => {
    it('removes notification from active list', () => {
      const store = useNotificationStore();
      const id = store.addNotification('info', 'T', 'D', {
        autoDismiss: false,
      });
      store.dismissNotification(id);
      expect(store.activeNotifications).toHaveLength(0);
    });

    it('marks notification as dismissed in history', () => {
      const store = useNotificationStore();
      const id = store.addNotification('info', 'T', 'D', {
        autoDismiss: false,
      });
      store.dismissNotification(id);
      expect(store.notificationHistory[0]!.dismissed).toBe(true);
    });

    it('does nothing for an unknown id', () => {
      const store = useNotificationStore();
      store.addNotification('info', 'T', 'D', { autoDismiss: false });
      store.dismissNotification('non-existent-id');
      expect(store.activeNotifications).toHaveLength(1);
    });
  });

  describe('clearAllNotifications', () => {
    it('clears all active notifications', () => {
      const store = useNotificationStore();
      store.addNotification('info', 'T1', 'D1', { autoDismiss: false });
      store.addNotification('error', 'T2', 'D2', { autoDismiss: false });
      store.clearAllNotifications();
      expect(store.activeNotifications).toHaveLength(0);
    });

    it('marks all cleared notifications as dismissed in history', () => {
      const store = useNotificationStore();
      store.addNotification('info', 'T1', 'D1', { autoDismiss: false });
      store.addNotification('error', 'T2', 'D2', { autoDismiss: false });
      store.clearAllNotifications();
      expect(store.notificationHistory.every((n) => n.dismissed)).toBe(true);
    });

    it('preserves history entries after clearing', () => {
      const store = useNotificationStore();
      store.addNotification('info', 'T', 'D', { autoDismiss: false });
      store.clearAllNotifications();
      expect(store.notificationHistory).toHaveLength(1);
    });
  });

  describe('clearHistory', () => {
    it('clears notification history', () => {
      const store = useNotificationStore();
      store.addNotification('info', 'T', 'D', { autoDismiss: false });
      store.clearHistory();
      expect(store.notificationHistory).toHaveLength(0);
    });

    it('does not affect active notifications', () => {
      const store = useNotificationStore();
      store.addNotification('info', 'T', 'D', { autoDismiss: false });
      store.clearHistory();
      expect(store.activeNotifications).toHaveLength(1);
    });
  });

  describe('convenience methods', () => {
    it('success() adds a success notification with autoDismiss true by default', () => {
      const store = useNotificationStore();
      store.success('Title', 'Desc');
      expect(store.activeNotifications[0]!.type).toBe('success');
      expect(store.activeNotifications[0]!.autoDismiss).toBe(true);
    });

    it('error() adds an error notification with autoDismiss forced to false', () => {
      const store = useNotificationStore();
      store.error('Title', 'Desc');
      expect(store.activeNotifications[0]!.type).toBe('error');
      expect(store.activeNotifications[0]!.autoDismiss).toBe(false);
    });

    it('error() does not auto-dismiss even after long duration', () => {
      const store = useNotificationStore();
      store.error('Title', 'Desc');
      vi.advanceTimersByTime(60000);
      expect(store.activeNotifications).toHaveLength(1);
    });

    it('warning() adds a warning notification', () => {
      const store = useNotificationStore();
      store.warning('Title', 'Desc');
      expect(store.activeNotifications[0]!.type).toBe('warning');
    });

    it('info() adds an info notification', () => {
      const store = useNotificationStore();
      store.info('Title', 'Desc');
      expect(store.activeNotifications[0]!.type).toBe('info');
    });
  });

  it('holds auto-dismiss while paused and resumes afterwards (WCAG 2.2.1)', () => {
    const store = useNotificationStore();
    const id = store.success('Paid', '', { duration: 5000 });
    vi.advanceTimersByTime(3000);
    store.pauseDismissal(id);
    vi.advanceTimersByTime(60_000);
    expect(store.activeNotifications).toHaveLength(1);
    store.resumeDismissal(id);
    vi.advanceTimersByTime(2100);
    expect(store.activeNotifications).toHaveLength(0);
  });
});
