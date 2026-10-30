import { describe, it, expect, vi } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { defineComponent, ref } from 'vue';

const { locale } = vi.hoisted(() => ({ locale: { current: null as any } }));

mockNuxtImport('useI18n', () => () => {
  locale.current ??= ref('en');
  return {
    locale: locale.current,
    t: (key: string) => `${locale.current.value}:${key}`,
  };
});
mockNuxtImport('useUserStore', () => () => ({
  isAuthenticated: true,
  currentUser: { id: 'u1' },
}));

const mountNav = async () => {
  let api!: ReturnType<typeof useAppNavItems>;
  await mountSuspended(
    defineComponent({
      setup() {
        api = useAppNavItems(true, 'h1');
        return () => null;
      },
    }),
  );
  return api;
};

describe('useAppNavItems', () => {
  it('updates labels when the locale changes', async () => {
    const nav = await mountNav();
    expect(nav.primaryItems.value[0]!.label).toBe('en:navigation.home');

    locale.current.value = 'it';
    expect(nav.primaryItems.value[0]!.label).toBe('it:navigation.home');
    expect(nav.secondaryItems.value[0]!.label).toBe('it:navigation.reports');
  });

  it('exposes 4 primary and 2 secondary items', async () => {
    const nav = await mountNav();
    expect(nav.primaryItems.value).toHaveLength(4);
    expect(nav.secondaryItems.value.map((i) => i.path)).toEqual([
      '/reports',
      '/house/:id',
    ]);
  });

  it('matches /house by segment, not by string prefix', async () => {
    const nav = await mountNav();
    await navigateTo('/houses');
    expect(nav.isActive('/house/:id')).toBe(false);
    await navigateTo('/house/h1');
    expect(nav.isActive('/house/:id')).toBe(true);
  });

  it('only treats the own profile as active', async () => {
    const nav = await mountNav();
    await navigateTo('/user/u2');
    expect(nav.isProfileActive.value).toBe(false);
    await navigateTo('/user/u1');
    expect(nav.isProfileActive.value).toBe(true);
  });
});
