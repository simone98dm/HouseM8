import { describe, it, expect } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import TermsPage from '~/pages/terms.vue';
import { LEGAL_ENTITY, LEGAL_POLICY_VERSION } from '~/utils/legal/cookies';

// A real ref, so the page's `locale === 'it'` branch is reachable.
mockNuxtImport('useI18n', async () => {
  const { ref } = await import('vue');
  const locale = ref('it');
  return () => ({ t: (key: string) => key, locale });
});

const G = {
  mocks: { $t: (k: string) => k },
  stubs: { Icon: true, NuxtLink: true },
};

describe('terms page (Italian)', () => {
  it('renders the Italian heading and not the English one', async () => {
    const text = (await mountSuspended(TermsPage, { global: G })).text();
    expect(text).toContain('Termini di Servizio');
    expect(text).toContain('Diritto di recesso');
    expect(text).toContain(`Versione ${LEGAL_POLICY_VERSION}`);
    expect(text).not.toContain('Version ' + LEGAL_POLICY_VERSION);
  });

  it('shows the provider identity and no dead mailto link', async () => {
    const wrapper = await mountSuspended(TermsPage, { global: G });
    expect(wrapper.text()).toContain(LEGAL_ENTITY.name);
    expect(wrapper.text()).toContain(LEGAL_ENTITY.vatNumber);
    expect(wrapper.find('a[href^="mailto:"]').exists()).toBe(false);
  });

  it('has sequentially numbered section anchors', async () => {
    const wrapper = await mountSuspended(TermsPage, { global: G });
    const ids = wrapper.findAll('h2').map((h) => h.attributes('id'));
    expect(ids.length).toBeGreaterThan(5);
    ids.forEach((id, i) => expect(id).toBe(`section-${i + 1}`));
  });
});
