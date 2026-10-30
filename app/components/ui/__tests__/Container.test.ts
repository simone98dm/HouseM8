import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import Container from '~/components/ui/Container.vue';

describe('UiContainer', () => {
  it('renders', async () => {
    const wrapper = await mountSuspended(Container);
    expect(wrapper.exists()).toBe(true);
  });

  it('renders slot content', async () => {
    const wrapper = await mountSuspended(Container, {
      slots: { default: '<span class="inner">hello</span>' },
    });
    expect(wrapper.find('.inner').exists()).toBe(true);
    expect(wrapper.text()).toContain('hello');
  });

  it('has no decorative entrance animation', async () => {
    const wrapper = await mountSuspended(Container);
    expect(wrapper.html()).not.toContain('animate-');
  });
});
