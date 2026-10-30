import { describe, it, expect, afterEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import NotificationDropdown from '~/components/ui/NotificationDropdown.vue';
import type { UiNotification } from '~/types/domain/notification';

function makeNotification(
  overrides: Partial<UiNotification> = {},
): UiNotification {
  return {
    id: '1',
    type: 'success',
    title: 'Test Title',
    description: 'Test description',
    timestamp: new Date(),
    dismissed: false,
    ...overrides,
  };
}

describe('NotificationDropdown', () => {
  afterEach(() => {
    document.querySelectorAll('.absolute.right-0').forEach((el) => el.remove());
  });

  const mountAttached = async (props: Record<string, unknown> = {}) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const wrapper = await mountSuspended(NotificationDropdown, {
      props,
      attachTo: host,
    });
    return { wrapper, host };
  };

  describe('trigger accessibility', () => {
    it('reflects open state through aria-expanded', async () => {
      const wrapper = await mountSuspended(NotificationDropdown);
      const trigger = wrapper.find('button');
      expect(trigger.attributes('aria-expanded')).toBe('false');
      await trigger.trigger('click');
      expect(trigger.attributes('aria-expanded')).toBe('true');
    });

    it('labels the trigger with the plain title when nothing is unread', async () => {
      const wrapper = await mountSuspended(NotificationDropdown, {
        props: { unreadCount: 0 },
      });
      expect(wrapper.find('button').attributes('aria-label')).toBe(
        'Notifications',
      );
    });

    it.each([1, 7])(
      'labels the trigger with the unread count (%i)',
      async (unreadCount) => {
        const wrapper = await mountSuspended(NotificationDropdown, {
          props: { unreadCount },
        });
        expect(wrapper.find('button').attributes('aria-label')).toBe(
          `Notifications (${unreadCount} unread)`,
        );
      },
    );

    it('returns focus to the trigger when Escape closes the panel', async () => {
      const { wrapper, host } = await mountAttached({
        notifications: [makeNotification()],
      });
      await wrapper.find('button').trigger('click');
      const clearAll = wrapper
        .findAll('button')
        .find((b) => b.text() === 'Clear all')!;
      (clearAll.element as HTMLButtonElement).focus();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await wrapper.vm.$nextTick();

      expect(document.activeElement).toBe(wrapper.find('button').element);
      wrapper.unmount();
      host.remove();
    });

    it('sizes the panel responsively without overflowing narrow viewports', async () => {
      const wrapper = await mountSuspended(NotificationDropdown);
      await wrapper.find('button').trigger('click');
      expect(wrapper.find('.absolute.right-0').classes()).toContain(
        'w-[min(20rem,calc(100vw-2rem))]',
      );
    });

    it('closes when clicking outside the dropdown', async () => {
      const wrapper = await mountSuspended(NotificationDropdown);
      await wrapper.find('button').trigger('click');
      document.body.click();
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.absolute.right-0').exists()).toBe(false);
    });
  });

  describe('initial render', () => {
    it('renders the toggle button', async () => {
      const wrapper = await mountSuspended(NotificationDropdown);
      expect(wrapper.find('button').exists()).toBe(true);
    });

    it('dropdown panel is not visible on mount', async () => {
      const wrapper = await mountSuspended(NotificationDropdown);
      expect(wrapper.find('.absolute.right-0').exists()).toBe(false);
    });
  });

  describe('toggleDropdown', () => {
    it('opens panel on first button click', async () => {
      const wrapper = await mountSuspended(NotificationDropdown);
      await wrapper.find('button').trigger('click');
      expect(wrapper.find('.absolute.right-0').exists()).toBe(true);
    });

    it('closes panel on second button click', async () => {
      const wrapper = await mountSuspended(NotificationDropdown);
      await wrapper.find('button').trigger('click');
      await wrapper.find('button').trigger('click');
      expect(wrapper.find('.absolute.right-0').exists()).toBe(false);
    });
  });

  describe('unread badge', () => {
    it('shows numeric count between 1 and 99', async () => {
      const wrapper = await mountSuspended(NotificationDropdown, {
        props: { unreadCount: 7 },
      });
      expect(wrapper.text()).toContain('7');
    });

    it('shows 99+ when count exceeds 99', async () => {
      const wrapper = await mountSuspended(NotificationDropdown, {
        props: { unreadCount: 200 },
      });
      expect(wrapper.text()).toContain('99+');
    });

    it('does not render count badge when unreadCount is 0', async () => {
      const wrapper = await mountSuspended(NotificationDropdown, {
        props: { unreadCount: 0 },
      });
      // The absolute positioned badge span should not exist
      const badge = wrapper.find('span.absolute');
      expect(badge.exists()).toBe(false);
    });
  });

  describe('empty state', () => {
    it('shows empty state text when no notifications', async () => {
      const wrapper = await mountSuspended(NotificationDropdown, {
        props: { notifications: [] },
      });
      await wrapper.find('button').trigger('click');
      expect(wrapper.text()).toContain('No notifications yet');
    });

    it('does not show clear all button when notifications list is empty', async () => {
      const wrapper = await mountSuspended(NotificationDropdown, {
        props: { notifications: [] },
      });
      await wrapper.find('button').trigger('click');
      expect(wrapper.text()).not.toContain('Clear all');
    });
  });

  describe('notification list', () => {
    it('renders notification title and description', async () => {
      const wrapper = await mountSuspended(NotificationDropdown, {
        props: { notifications: [makeNotification()] },
      });
      await wrapper.find('button').trigger('click');
      expect(wrapper.text()).toContain('Test Title');
      expect(wrapper.text()).toContain('Test description');
    });

    it('shows clear all button when notifications exist', async () => {
      const wrapper = await mountSuspended(NotificationDropdown, {
        props: { notifications: [makeNotification()] },
      });
      await wrapper.find('button').trigger('click');
      expect(wrapper.text()).toContain('Clear all');
    });

    it('applies opacity-60 class to dismissed notifications', async () => {
      const wrapper = await mountSuspended(NotificationDropdown, {
        props: { notifications: [makeNotification({ dismissed: true })] },
      });
      await wrapper.find('button').trigger('click');
      const li = wrapper.find('li');
      expect(li.classes()).toContain('opacity-60');
    });

    it('does not apply opacity to active notifications', async () => {
      const wrapper = await mountSuspended(NotificationDropdown, {
        props: { notifications: [makeNotification({ dismissed: false })] },
      });
      await wrapper.find('button').trigger('click');
      const li = wrapper.find('li');
      expect(li.classes()).not.toContain('opacity-60');
    });

    it('renders multiple notification types without error', async () => {
      const types: UiNotification['type'][] = [
        'success',
        'error',
        'warning',
        'info',
      ];
      for (const type of types) {
        const wrapper = await mountSuspended(NotificationDropdown, {
          props: {
            notifications: [makeNotification({ type, title: `${type}-title` })],
          },
        });
        await wrapper.find('button').trigger('click');
        expect(wrapper.text()).toContain(`${type}-title`);
      }
    });
  });

  describe('clearHistory', () => {
    it('emits clear-history event when clear button clicked', async () => {
      const wrapper = await mountSuspended(NotificationDropdown, {
        props: { notifications: [makeNotification()] },
      });
      await wrapper.find('button').trigger('click');
      const allButtons = wrapper.findAll('button');
      await allButtons[1].trigger('click');
      expect(wrapper.emitted('clear-history')).toBeTruthy();
    });

    it('closes dropdown after clearing', async () => {
      const wrapper = await mountSuspended(NotificationDropdown, {
        props: { notifications: [makeNotification()] },
      });
      await wrapper.find('button').trigger('click');
      const allButtons = wrapper.findAll('button');
      await allButtons[1].trigger('click');
      expect(wrapper.find('.absolute.right-0').exists()).toBe(false);
    });
  });

  describe('keyboard handling', () => {
    it('closes dropdown on Escape key when open', async () => {
      const wrapper = await mountSuspended(NotificationDropdown);
      await wrapper.find('button').trigger('click');
      expect(wrapper.find('.absolute.right-0').exists()).toBe(true);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.absolute.right-0').exists()).toBe(false);
    });

    it('does not close dropdown on non-Escape keys', async () => {
      const wrapper = await mountSuspended(NotificationDropdown);
      await wrapper.find('button').trigger('click');

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.absolute.right-0').exists()).toBe(true);
    });

    it('Escape key has no effect when dropdown is already closed', async () => {
      const wrapper = await mountSuspended(NotificationDropdown);
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.absolute.right-0').exists()).toBe(false);
    });
  });

  describe('formatHistoryTime', () => {
    it('shows justNow for a very recent timestamp', async () => {
      const wrapper = await mountSuspended(NotificationDropdown, {
        props: { notifications: [makeNotification({ timestamp: new Date() })] },
      });
      await wrapper.find('button').trigger('click');
      expect(wrapper.text()).toContain('Just now');
    });

    it('shows minutesAgo for 30-minute-old timestamp', async () => {
      const timestamp = new Date(Date.now() - 30 * 60 * 1000);
      const wrapper = await mountSuspended(NotificationDropdown, {
        props: { notifications: [makeNotification({ timestamp })] },
      });
      await wrapper.find('button').trigger('click');
      expect(wrapper.text()).toContain('min ago');
    });

    it('shows hoursAgo for 5-hour-old timestamp', async () => {
      const timestamp = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const wrapper = await mountSuspended(NotificationDropdown, {
        props: { notifications: [makeNotification({ timestamp })] },
      });
      await wrapper.find('button').trigger('click');
      expect(wrapper.text()).toContain('h ago');
    });

    it('shows daysAgo for a 3-day-old timestamp', async () => {
      const timestamp = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const wrapper = await mountSuspended(NotificationDropdown, {
        props: { notifications: [makeNotification({ timestamp })] },
      });
      await wrapper.find('button').trigger('click');
      expect(wrapper.text()).toContain('d ago');
    });

    it('shows locale date for a very old timestamp (over 7 days)', async () => {
      const timestamp = new Date('2020-01-01');
      const wrapper = await mountSuspended(NotificationDropdown, {
        props: { notifications: [makeNotification({ timestamp })] },
      });
      await wrapper.find('button').trigger('click');
      expect(wrapper.text()).toContain('2020');
    });
  });
});
