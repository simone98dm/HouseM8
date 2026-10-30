import { describe, it, expect } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import PrivacyPage from '~/pages/privacy.vue';
import { LEGAL_ENTITY, LEGAL_POLICY_VERSION } from '~/utils/legal/cookies';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

const G = {
  mocks: { $t: (k: string) => k },
  stubs: { Icon: true, NuxtLink: true },
};

describe('Privacy Page', () => {
  it('renders', async () => {
    const wrapper = await mountSuspended(PrivacyPage, { global: G });
    expect(wrapper.exists()).toBe(true);
  });

  it('renders the Privacy Policy heading and key section headings', async () => {
    const wrapper = await mountSuspended(PrivacyPage, { global: G });
    const text = wrapper.text();
    expect(text).toContain('Privacy Policy');
    expect(text).toContain('Data controller');
    expect(text).toContain('Recipients and processors');
    expect(text).toContain('Your rights');
    expect(text).toContain('Account deletion');
    expect(text).toContain('Minors');
    expect(text).toContain(`Version ${LEGAL_POLICY_VERSION}`);
  });

  it('shows the provider identity from LEGAL_ENTITY, not a private person', async () => {
    const wrapper = await mountSuspended(PrivacyPage, { global: G });
    const text = wrapper.text();
    expect(text).toContain(LEGAL_ENTITY.name);
    expect(text).toContain(LEGAL_ENTITY.vatNumber);
    expect(text).not.toContain('simone98dm');
    expect(wrapper.html()).not.toContain('outlook');
  });

  it('does not render a dead mailto link while the entity is incomplete', async () => {
    const wrapper = await mountSuspended(PrivacyPage, { global: G });
    expect(wrapper.find('a[href^="mailto:"]').exists()).toBe(false);
  });

  it('discloses Stripe, the 10-year invoice retention and the 30-day grace period', async () => {
    const text = (await mountSuspended(PrivacyPage, { global: G })).text();
    expect(text).toContain('Stripe Payments Europe');
    expect(text).toContain('independent controller');
    expect(text).toContain('10 years');
    expect(text).toContain('30 days');
    expect(text).toContain('12 months');
  });

  it('no longer mentions removed data or features', async () => {
    const text = (await mountSuspended(PrivacyPage, { global: G })).text();
    expect(text).not.toMatch(/comments|Art\. 9\(2\)|smoking habit\)/i);
  });

  it('wraps tables for horizontal scrolling on mobile', async () => {
    const wrapper = await mountSuspended(PrivacyPage, { global: G });
    const tables = wrapper.findAll('table');
    expect(tables.length).toBeGreaterThanOrEqual(3);
    for (const t of tables)
      expect(t.element.parentElement?.className).toContain('overflow-x-auto');
  });

  it('links to the cookie policy instead of duplicating a cookie table', async () => {
    const wrapper = await mountSuspended(PrivacyPage, { global: G });
    expect(wrapper.html()).toContain('/cookies');
    expect(wrapper.text()).not.toContain('house_m8_access_token');
  });

  it('numbers its sections with anchor ids', async () => {
    const wrapper = await mountSuspended(PrivacyPage, { global: G });
    const ids = wrapper.findAll('h2').map((h) => h.attributes('id'));
    expect(ids.every((id) => /^section-\d+$/.test(id ?? ''))).toBe(true);
  });
});
