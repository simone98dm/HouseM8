import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import Fab from '~/components/ui/Fab.vue';

describe('UiFab', () => {
  it('exposes the label as the accessible name', async () => {
    const wrapper = await mountSuspended(Fab, {
      props: { label: 'Add bill' },
      global: { stubs: { Icon: true } },
    });
    expect(wrapper.find('button').attributes('aria-label')).toBe('Add bill');
  });

  it('emits click', async () => {
    const wrapper = await mountSuspended(Fab, {
      props: { label: 'Add bill' },
      global: { stubs: { Icon: true } },
    });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });
});
