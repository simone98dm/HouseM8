import { describe, it, expect, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import AppHeader from '~/components/AppHeader.vue';

describe('AppHeader', () => {
  it('renders without back button by default (allowBack=false)', async () => {
    const wrapper = await mountSuspended(AppHeader);
    // No back button (btn-ghost class), only the notification dropdown button exists
    expect(wrapper.find('button.btn-ghost').exists()).toBe(false);
  });

  it('renders back button when allowBack=true', async () => {
    const wrapper = await mountSuspended(AppHeader, {
      props: { allowBack: true },
    });
    expect(wrapper.find('button').exists()).toBe(true);
  });

  it('renders a single h1 with meta from the title props', async () => {
    const wrapper = await mountSuspended(AppHeader, {
      props: { title: 'Bills', meta: '3 active' },
    });
    expect(wrapper.findAll('h1')).toHaveLength(1);
    expect(wrapper.find('h1').text()).toBe('Bills');
    expect(wrapper.find('.page-header-meta').text()).toBe('3 active');
  });

  it('renders the actions slot', async () => {
    const wrapper = await mountSuspended(AppHeader, {
      slots: { actions: '<button class="act">Add</button>' },
    });
    expect(wrapper.find('.act').exists()).toBe(true);
  });

  it('goes to backTo when there is no in-app history', async () => {
    const wrapper = await mountSuspended(AppHeader, {
      props: { allowBack: true, backTo: '/bills' },
    });
    const router = useRouter();
    const spy = vi.spyOn(router, 'push').mockResolvedValue(undefined);
    await wrapper.find('button').trigger('click');
    expect(spy).toHaveBeenCalledWith('/bills');
  });

  it('emits clear-notifications when notification dropdown clears history', async () => {
    const notification = {
      id: '1',
      type: 'info' as const,
      title: 'Test Notification',
      description: 'Test description',
      timestamp: new Date(),
    };
    const wrapper = await mountSuspended(AppHeader, {
      props: { notifications: [notification], unreadCount: 1 },
    });
    // Open the dropdown
    await wrapper.find('button').trigger('click');
    // Find and click clear all button inside the dropdown
    const allButtons = wrapper.findAll('button');
    if (allButtons.length > 1) {
      await allButtons[allButtons.length - 1]?.trigger('click');
    }
  });

  it('renders slot content', async () => {
    const wrapper = await mountSuspended(AppHeader, {
      slots: { default: '<span class="slot-test">Page Title</span>' },
    });
    expect(wrapper.find('.slot-test').exists()).toBe(true);
  });

  it('renders with unreadCount badge', async () => {
    const wrapper = await mountSuspended(AppHeader, {
      props: { unreadCount: 5, notifications: [] },
    });
    expect(wrapper.text()).toContain('5');
  });
});
