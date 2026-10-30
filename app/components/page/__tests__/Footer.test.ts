import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import Footer from '~/components/page/Footer.vue';

const stripeEnabled = vi.hoisted(() => ({ value: true }));
mockNuxtImport('useFeatureFlags', () => () => ({
  isEnabled: () => stripeEnabled.value,
}));
mockNuxtImport('useI18n', () => () => ({ t: (k: string) => k }));

const mount = () =>
  mountSuspended(Footer, { global: { stubs: { PageLegalImprint: true } } });

describe('PageFooter', () => {
  beforeEach(() => {
    stripeEnabled.value = true;
  });

  it('links to all four legal pages', async () => {
    const wrapper = await mount();
    const nav = wrapper.find(
      'nav[aria-label="landing.footer.a11y.legalLinks"]',
    );
    expect(nav.findAll('a').map((a) => a.attributes('href'))).toEqual([
      '/privacy',
      '/cookies',
      '/terms',
      '/accessibility',
    ]);
  });

  it('has three labelled navigation landmarks and the imprint', async () => {
    const wrapper = await mount();
    expect(wrapper.findAll('nav')).toHaveLength(3);
    expect(wrapper.find('page-legal-imprint-stub').exists()).toBe(true);
  });

  it('shows the pricing link only when Stripe is enabled', async () => {
    expect((await mount()).find('a[href="/#pricing"]').exists()).toBe(true);
    stripeEnabled.value = false;
    expect((await mount()).find('a[href="/#pricing"]').exists()).toBe(false);
  });

  it('opens the external GitHub link safely', async () => {
    const link = (await mount()).find('a[target="_blank"]');
    expect(link.attributes('rel')).toBe('noopener noreferrer');
  });
});
