import { describe, it, expect } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import CookiesPage from '~/pages/cookies.vue';
import { STORAGE_ITEMS } from '~/utils/legal/cookies';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

const G = {
  mocks: { $t: (k: string) => k },
  stubs: { NuxtLink: true, 'i18n-t': true },
};

describe('Cookies Page', () => {
  it('renders an accessible table with caption and one row per item', async () => {
    const wrapper = await mountSuspended(CookiesPage, { global: G });
    expect(wrapper.find('table caption').exists()).toBe(true);
    expect(wrapper.findAll('thead th[scope="col"]').length).toBe(6);
    expect(wrapper.findAll('tbody tr').length).toBe(STORAGE_ITEMS.length);
  });

  it('lists every cookie name from the data file', async () => {
    const wrapper = await mountSuspended(CookiesPage, { global: G });
    for (const item of STORAGE_ITEMS)
      expect(wrapper.text()).toContain(item.name);
  });

  it('links to the four browser help pages over https', async () => {
    const wrapper = await mountSuspended(CookiesPage, { global: G });
    const links = wrapper.findAll('ul a').map((a) => a.attributes('href'));
    expect(links).toHaveLength(4);
    for (const l of links) expect(l).toMatch(/^https:\/\//);
  });
});
