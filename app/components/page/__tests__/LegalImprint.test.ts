import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import LegalImprint from '../LegalImprint.vue';

describe('LegalImprint', () => {
  it('renders nothing while any legal entity field is TODO', async () => {
    const wrapper = await mountSuspended(LegalImprint);
    expect(wrapper.text()).not.toContain('TODO');
    expect(wrapper.find('section').exists()).toBe(false);
  });
});
