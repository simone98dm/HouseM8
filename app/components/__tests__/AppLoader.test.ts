import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import AppLoader from '~/components/AppLoader.vue';

describe('AppLoader', () => {
  it('keeps the status region mounted and empty when idle', async () => {
    const { forceStopLoading } = useLoading();
    forceStopLoading();
    const wrapper = await mountSuspended(AppLoader);
    const status = wrapper.find('[role="status"]');
    expect(status.exists()).toBe(true);
    expect(status.classes()).toContain('sr-only');
    expect(status.text()).toBe('');
    expect(wrapper.find('.app-loader-bar').exists()).toBe(false);
  });

  it('shows the progress line and announces while loading', async () => {
    const { startLoading, forceStopLoading } = useLoading();
    startLoading();
    const wrapper = await mountSuspended(AppLoader);
    expect(wrapper.find('.app-loader-bar').exists()).toBe(true);
    expect(wrapper.find('[role="status"]').text()).not.toBe('');
    forceStopLoading();
  });
});
