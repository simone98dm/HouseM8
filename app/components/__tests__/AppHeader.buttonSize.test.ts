import { describe, it, expect } from 'vitest';
import { h } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import AppHeader from '~/components/AppHeader.vue';
import UiButton from '~/components/ui/Button.vue';
import UiLinkButton from '~/components/ui/LinkButton.vue';

const mountWithActions = (actions: () => unknown) =>
  mountSuspended(AppHeader, {
    props: { title: 'T' },
    slots: { actions },
    global: { stubs: { UiNotificationDropdown: true } },
  });

describe('AppHeader action buttons', () => {
  it('renders every action at the navbar size, whatever size the page asks for', async () => {
    const wrapper = await mountWithActions(() => [
      h(UiButton, { size: 'lg' }, () => 'Big'),
      h(UiButton, {}, () => 'Default'),
      h(UiLinkButton, { size: 'md', to: '/x' }, () => 'Link'),
    ]);
    const classes = wrapper
      .find('.page-header-right')
      .findAll('button, a')
      .map((el) => el.classes());
    expect(classes).toHaveLength(3);
    for (const c of classes) {
      expect(c).toContain('min-h-9');
      expect(c).not.toContain('min-h-10');
      expect(c).not.toContain('min-h-12');
    }
  });

  it('leaves buttons outside the header at their own size', async () => {
    const wrapper = await mountSuspended(UiButton, {
      props: { size: 'lg' },
      slots: { default: () => 'x' },
    });
    expect(wrapper.classes()).toContain('min-h-12');
  });
});
