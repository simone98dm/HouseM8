import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import LegalMailLink from '../LegalMailLink.vue';

describe('LegalMailLink', () => {
  it('renders plain text, not a dead mailto, while the entity is incomplete', async () => {
    const wrapper = await mountSuspended(LegalMailLink, {
      props: { email: 'TODO-support@housem8.app' },
    });
    expect(wrapper.find('a').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('TODO');
    expect(wrapper.text()).toBeTruthy();
  });

  it('shows the call-site fallback instead of the lead while the mailbox is hidden', async () => {
    const wrapper = await mountSuspended(LegalMailLink, {
      props: {
        email: 'TODO-support@housem8.app',
        lead: 'write to',
        fallback: 'use the settings',
      },
    });
    expect(wrapper.find('a').exists()).toBe(false);
    expect(wrapper.text()).toBe('use the settings');
  });
});
