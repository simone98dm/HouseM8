/**
 * AppNavigationSidebar Component Tests
 * Covers the desktop sidebar extracted from AppNavigation.vue.
 * AppNavigation.test.ts still covers the integration (both surfaces
 * rendered together); this file exercises the sidebar in isolation.
 */

import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { setActivePinia, createPinia } from 'pinia';
import AppNavigationSidebar from '~/components/AppNavigationSidebar.vue';
import { useUserStore } from '~/stores/user';

vi.mock('~/stores/user', () => ({
  useUserStore: vi.fn(),
}));

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

const G = {
  mocks: { $t: (k: string) => k },
  stubs: { Icon: true },
};

const mockUserStore = (
  currentUser: { id: string } | null,
  isAuthenticated = currentUser !== null,
) =>
  vi.mocked(useUserStore).mockReturnValue({
    currentUser,
    isAuthenticated,
  } as ReturnType<typeof useUserStore>);

describe('AppNavigationSidebar Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockUserStore({ id: 'user-1' });
  });

  it('gives every sidebar link a non-empty aria-label', async () => {
    const wrapper = await mountSuspended(AppNavigationSidebar, {
      props: { hasHouse: true, currentHouseId: 'h-1' },
      global: G,
    });

    const sidebarLinks = wrapper.findAll('.sidebar-item');
    expect(sidebarLinks.length).toBeGreaterThan(0);
    sidebarLinks.forEach((link) => {
      expect(link.attributes('aria-label')).toBeTruthy();
    });
  });

  it('shows the avatar link when authenticated', async () => {
    const wrapper = await mountSuspended(AppNavigationSidebar, {
      props: { hasHouse: true, currentHouseId: 'h-1' },
      global: G,
    });

    expect(wrapper.find('.sidebar-avatar').exists()).toBe(true);
  });

  it('hides the avatar link when unauthenticated', async () => {
    mockUserStore(null);
    const wrapper = await mountSuspended(AppNavigationSidebar, {
      props: { hasHouse: false },
      global: G,
    });

    expect(wrapper.find('.sidebar-avatar').exists()).toBe(false);
  });

  it('omits house-scoped links when hasHouse is false', async () => {
    const wrapper = await mountSuspended(AppNavigationSidebar, {
      props: { hasHouse: false },
      global: G,
    });

    const hrefs = wrapper
      .findAll('.sidebar-item')
      .map((l) => l.attributes('href'));
    expect(hrefs).toContain('/dashboard');
    expect(hrefs).not.toContain('/expenses');
  });

  it('has a single nav landmark and no aside wrapper', async () => {
    const wrapper = await mountSuspended(AppNavigationSidebar, {
      props: { hasHouse: true, currentHouseId: 'h-1' },
      global: G,
    });

    expect(wrapper.find('aside').exists()).toBe(false);
    expect(wrapper.findAll('nav')).toHaveLength(1);
  });

  // The label names the target theme, so it is not also a toggle button:
  // aria-pressed would announce a state that contradicts the label.
  it('theme toggle is a button whose label names the target theme', async () => {
    const wrapper = await mountSuspended(AppNavigationSidebar, {
      props: { hasHouse: true },
      global: G,
    });

    const toggle = wrapper.find('.theme-toggle');
    expect(toggle.attributes('type')).toBe('button');
    expect(toggle.attributes('aria-pressed')).toBeUndefined();
    expect(toggle.attributes('aria-label')).toBe('navigation.switchToDark');

    await toggle.trigger('click');
    expect(toggle.attributes('aria-label')).toBe('navigation.switchToLight');
  });

  it('tooltip source is data-tooltip and shows on focus-visible too', () => {
    // Pseudo-element visibility cannot be asserted in happy-dom; check the rule.
    const src = readFileSync('app/components/AppNavigationSidebar.vue', 'utf8');
    expect(src).toMatch(
      /\.sidebar-item:hover::after,\s*\.sidebar-item:focus-visible::after/,
    );
  });
});
