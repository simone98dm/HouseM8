import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import LinkButton from '~/components/ui/LinkButton.vue';

describe('UiLinkButton', () => {
  it('renders a link with href and no aria-disabled when enabled', async () => {
    const wrapper = await mountSuspended(LinkButton, {
      props: { to: '/pricing' },
      slots: { default: 'Go' },
    });
    const link = wrapper.find('a');
    expect(link.attributes('href')).toBe('/pricing');
    expect(link.attributes('aria-disabled')).toBeUndefined();
  });

  it('renders a disabled link inert: no href, aria-disabled, no navigation', async () => {
    const wrapper = await mountSuspended(LinkButton, {
      props: { to: '/pricing', disabled: true },
    });
    const link = wrapper.find('a');
    expect(link.attributes('href')).toBeUndefined();
    expect(link.attributes('aria-disabled')).toBe('true');
    expect(link.attributes('tabindex')).toBe('-1');
    await link.trigger('click');
    expect(wrapper.emitted('click')).toBeUndefined();
  });

  it('emits click with the native event when enabled', async () => {
    const wrapper = await mountSuspended(LinkButton, {
      props: { to: '/pricing' },
    });
    await wrapper.find('a').trigger('click');
    expect(wrapper.emitted('click')?.[0]?.[0]).toBeInstanceOf(MouseEvent);
  });
});

describe('UiLinkButton underline', () => {
  it('opts out of the global a:hover underline', async () => {
    const wrapper = await mountSuspended(LinkButton, {
      props: { to: '/x' },
    });
    expect(wrapper.find('a').attributes('class')).toContain('no-underline');
  });
});
