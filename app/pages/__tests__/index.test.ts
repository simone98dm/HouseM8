import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { setActivePinia, createPinia } from 'pinia';
import IndexPage from '~/pages/index.vue';

import { useUserStore } from '~/stores/user';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Read the locale files straight off disk. Importing them through the bundler
// alias yields a parsed AST here, not the JSON object.
const loadLocale = (name: string) =>
  JSON.parse(
    readFileSync(resolve(process.cwd(), `i18n/locales/${name}.json`), 'utf8'),
  );
const en = loadLocale('en');
const itLocale = loadLocale('it');

vi.mock('~/stores/user', () => ({
  useUserStore: vi.fn(),
}));

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

const G = {
  mocks: { $t: (k: string) => k },
  stubs: { Icon: true, NuxtLink: true, NuxtImg: true, NuxtPage: true },
};

describe('Index Page (Landing)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(useUserStore).mockReturnValue({
      isAuthenticated: false,
    } as ReturnType<typeof useUserStore>);
  });

  it('renders', async () => {
    const wrapper = await mountSuspended(IndexPage, { global: G });
    expect(wrapper.exists()).toBe(true);
  });

  // Phase 9 moved this copy behind i18n, so `t` (mocked to echo its key) now
  // renders keys rather than English. The original guarantee — that this page
  // actually shows these features — is preserved in two halves: the key is
  // wired into the page, and the key resolves to the expected English.
  it('wires the Smart Splitting feature through i18n', async () => {
    const wrapper = await mountSuspended(IndexPage, { global: G });
    expect(wrapper.text()).toContain(
      'landing.features.cards.smartSplitting.title',
    );
    expect(en.landing.features.cards.smartSplitting.title).toBe(
      'Smart splitting',
    );
  });

  it('wires the Real-Time Balances feature through i18n', async () => {
    const wrapper = await mountSuspended(IndexPage, { global: G });
    expect(wrapper.text()).toContain(
      'landing.features.cards.realTimeBalances.title',
    );
    expect(en.landing.features.cards.realTimeBalances.title).toBe(
      'Real-time balances',
    );
  });

  // The point of the whole exercise: an Italian visitor must not get English.
  it('translates the landing surface into Italian', async () => {
    expect(itLocale.landing.features.cards.smartSplitting.title).toBe(
      'Divisione intelligente',
    );
    expect(itLocale.landing.hero.ctaGuest).toBe('Inizia gratis');
    expect(itLocale.landing.footer.privacyPolicy).toBe(
      'Informativa sulla privacy',
    );
  });

  // Guards the failure mode that renders raw keys to users: every landing key
  // referenced by the app must exist in BOTH locales.
  it('has full key parity between en and it', () => {
    const flat = (o: Record<string, unknown>, p = ''): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        typeof v === 'object' && v !== null
          ? flat(v as Record<string, unknown>, `${p}${k}.`)
          : [`${p}${k}`],
      );
    expect(flat(itLocale.landing).sort()).toEqual(flat(en.landing).sort());
  });
});
