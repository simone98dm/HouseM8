import { describe, it, expect } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import AccessibilityPage from '~/pages/accessibility.vue';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

describe('Accessibility Page', () => {
  it('renders the statement sections and the contact mailbox', async () => {
    const wrapper = await mountSuspended(AccessibilityPage);
    const text = wrapper.text();
    expect(text).toContain('Accessibility statement');
    expect(text).toContain('Scope');
    expect(text).toContain('Feedback and contact');
    // Placeholder mailbox is never a dead mailto link.
    expect(wrapper.find('a[href^="mailto:"]').exists()).toBe(false);
  });

  it('opens external links safely', async () => {
    const wrapper = await mountSuspended(AccessibilityPage);
    for (const a of wrapper.findAll('a[target="_blank"]'))
      expect(a.attributes('rel')).toContain('noopener');
  });
});
