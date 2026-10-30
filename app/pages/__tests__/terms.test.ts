import { describe, it, expect } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import TermsPage from '~/pages/terms.vue';
import { LEGAL_ENTITY, LEGAL_POLICY_VERSION } from '~/utils/legal/cookies';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

const G = {
  mocks: { $t: (k: string) => k },
  stubs: { Icon: true, NuxtLink: true },
};

describe('Terms Page', () => {
  it('renders', async () => {
    const wrapper = await mountSuspended(TermsPage, { global: G });
    expect(wrapper.exists()).toBe(true);
  });

  it('renders the Terms of Service heading and key section headings', async () => {
    const text = (await mountSuspended(TermsPage, { global: G })).text();
    expect(text).toContain('Terms of Service');
    expect(text).toContain('Free trial and automatic renewal');
    expect(text).toContain('Right of withdrawal');
    expect(text).toContain('Governing law and courts');
    expect(text).toContain(`Version ${LEGAL_POLICY_VERSION}`);
  });

  it('shows the provider identity from LEGAL_ENTITY', async () => {
    const text = (await mountSuspended(TermsPage, { global: G })).text();
    expect(text).toContain(LEGAL_ENTITY.name);
    expect(text).toContain(LEGAL_ENTITY.vatNumber);
  });

  it('states the consumer rules: 14-day withdrawal, waiver, consumer court, 18+ for paid plans', async () => {
    const text = (await mountSuspended(TermsPage, { global: G })).text();
    expect(text).toContain('within 14 days');
    expect(text).toContain('art. 59');
    expect(text).toContain('art. 66-bis');
    expect(text).toContain('at least 14');
    expect(text).toContain('aged 18 or over');
  });

  it('has no "as is" exclusion and no old placeholders', async () => {
    const text = (await mountSuspended(TermsPage, { global: G })).text();
    expect(text).not.toMatch(/as is/i);
    expect(text).not.toContain('[GO-LIVE DATE]');
    expect(text).not.toContain('[CITY]');
  });
});
