import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import LegalLinks from '../LegalLinks.vue';

describe('LegalLinks', () => {
  it('links to privacy, cookie policy and terms', async () => {
    const wrapper = await mountSuspended(LegalLinks);
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'));
    expect(hrefs).toEqual(['/privacy', '/cookies', '/terms']);
  });

  it('exposes a labelled nav landmark', async () => {
    const wrapper = await mountSuspended(LegalLinks);
    expect(wrapper.find('nav').attributes('aria-label')).toBeTruthy();
  });
});
