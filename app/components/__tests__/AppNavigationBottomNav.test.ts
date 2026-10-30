/**
 * AppNavigationBottomNav Component Tests
 * Covers the mobile bottom nav extracted from AppNavigation.vue.
 * AppNavigation.test.ts still covers the integration (both surfaces
 * rendered together); this file exercises the bottom nav in isolation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { setActivePinia, createPinia } from 'pinia';
import AppNavigationBottomNav from '~/components/AppNavigationBottomNav.vue';
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

describe('AppNavigationBottomNav Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockUserStore({ id: 'user-1' });
  });

  it('renders 4 primary links plus a More button', async () => {
    const wrapper = await mountSuspended(AppNavigationBottomNav, {
      props: { hasHouse: true, currentHouseId: 'h-1' },
      global: G,
    });

    expect(wrapper.findAll('a.bottom-nav-item')).toHaveLength(4);
    const more = wrapper.find('button.bottom-nav-item');
    expect(more.text()).toContain('navigation.more');
    expect(more.attributes('aria-expanded')).toBe('false');
  });

  it('opens the More sheet with secondary items and own profile', async () => {
    const wrapper = await mountSuspended(AppNavigationBottomNav, {
      props: { hasHouse: true, currentHouseId: 'h-1' },
      global: G,
    });

    await wrapper.find('button.bottom-nav-item').trigger('click');

    const sheet = wrapper.findComponent({ name: 'AppNavigationMoreSheet' });
    expect(sheet.props('show')).toBe(true);
    expect(sheet.props('profilePath')).toBe('/user/user-1');
    expect(sheet.props('items').map((i: { path: string }) => i.path)).toEqual([
      '/reports',
      '/house/:id',
    ]);
    expect(
      wrapper.find('button.bottom-nav-item').attributes('aria-expanded'),
    ).toBe('true');
  });

  it('hides More when unauthenticated', async () => {
    mockUserStore(null);
    const wrapper = await mountSuspended(AppNavigationBottomNav, {
      props: { hasHouse: false },
      global: G,
    });

    expect(wrapper.find('button.bottom-nav-item').exists()).toBe(false);
  });

  it('marks the current page with aria-current and the active class', async () => {
    const wrapper = await mountSuspended(AppNavigationBottomNav, {
      props: { hasHouse: true, currentHouseId: 'h-1' },
      global: G,
    });
    await navigateTo('/expenses');
    await nextTick();

    const current = wrapper.findAll('a[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]!.attributes('href')).toBe('/expenses');
    expect(current[0]!.classes()).toContain('active');
  });

  it('flags More active only on the own profile, not another user', async () => {
    const wrapper = await mountSuspended(AppNavigationBottomNav, {
      props: { hasHouse: true, currentHouseId: 'h-1' },
      global: G,
    });

    await navigateTo('/user/user-2');
    await nextTick();
    expect(wrapper.find('button.bottom-nav-item').classes()).not.toContain(
      'active',
    );

    await navigateTo('/user/user-1');
    await nextTick();
    expect(wrapper.find('button.bottom-nav-item').classes()).toContain(
      'active',
    );
  });
});
