import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import ListHeader from '~/components/bill/ListHeader.vue';

describe('ListHeader', () => {
  it('renders the title as an h2 (no h1 -> h3 skip)', async () => {
    const wrapper = await mountSuspended(ListHeader, {
      props: { title: 'My Bills' },
    });
    expect(wrapper.find('h2').text()).toBe('My Bills');
    expect(wrapper.find('h3').exists()).toBe(false);
  });

  it('forwards id to the heading so a section can be labelled by it', async () => {
    const wrapper = await mountSuspended(ListHeader, {
      props: { title: 'My Bills' },
      attrs: { id: 'bills-heading' },
    });
    expect(wrapper.find('h2').attributes('id')).toBe('bills-heading');
  });
});
