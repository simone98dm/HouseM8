import { describe, it, expect, afterEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import NotificationContainer from '~/components/ui/NotificationContainer.vue';
import type { UiNotification } from '~/types';

const make = (over: Partial<UiNotification>): UiNotification =>
  ({
    id: '1',
    type: 'success',
    title: 'common.close',
    description: 'common.remove',
    timestamp: new Date(),
    i18n: true,
    ...over,
  }) as UiNotification;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('NotificationContainer', () => {
  it('renders nothing when there are no notifications', async () => {
    await mountSuspended(NotificationContainer, {
      props: { notifications: [] },
    });
    expect(document.querySelector('[role="status"],[role="alert"]')).toBeNull();
  });

  it('renders ONE list and translates i18n keys (no raw keys on any viewport)', async () => {
    await mountSuspended(NotificationContainer, {
      props: { notifications: [make({})] },
    });
    expect(document.querySelectorAll('.state-card')).toHaveLength(1);
    expect(document.body.textContent).toContain('Close');
    expect(document.body.textContent).not.toContain('common.close');
  });

  it('uses role=status for success and role=alert for error', async () => {
    await mountSuspended(NotificationContainer, {
      props: {
        notifications: [make({}), make({ id: '2', type: 'error' })],
      },
    });
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(document.querySelectorAll('[role="alert"]')).toHaveLength(1);
    expect(document.querySelector('[aria-live="assertive"]')).toBeNull();
  });

  it('emits dismiss with the notification id', async () => {
    const wrapper = await mountSuspended(NotificationContainer, {
      props: { notifications: [make({})] },
    });
    document.querySelector<HTMLButtonElement>('button')!.click();
    expect(wrapper.emitted('dismiss')?.[0]).toEqual(['1']);
  });
});
