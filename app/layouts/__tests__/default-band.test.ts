import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { h } from 'vue';
import DefaultLayout from '~/layouts/default.vue';

const route = vi.hoisted(() => ({ name: 'dashboard' as string | undefined }));
mockNuxtImport('useRoute', () => () => route);

const mount = () =>
  mountSuspended(DefaultLayout, {
    slots: { default: () => h('p', { id: 'slot' }, 'content') },
    global: {
      stubs: {
        AppNavigation: true,
        LegalLinks: true,
        UiModal: true,
        ClientOnly: true,
        Icon: true,
      },
    },
  });

const BANDS: Array<[string, string]> = [
  ['dashboard', 'home'],
  ['expenses', 'expenses'],
  ['bills', 'bills'],
  ['balance', 'balance'],
  ['house-id', 'house'],
  ['reports', 'reports'],
];

describe('default layout — page band', () => {
  beforeEach(() => {
    route.name = 'dashboard';
  });

  it.each(BANDS)('route "%s" renders page-band--%s', async (name, band) => {
    route.name = name;
    const w = await mount();
    const el = w.find('.page-band');
    expect(el.exists()).toBe(true);
    expect(el.classes()).toContain(`page-band--${band}`);
    expect(el.attributes('aria-hidden')).toBe('true');
  });

  it.each(['index', 'profile', 'expenses-id', undefined])(
    'route %s has no band',
    async (name) => {
      route.name = name;
      const w = await mount();
      expect(w.find('.page-band').exists()).toBe(false);
    },
  );

  it('always renders the slot inside the page body', async () => {
    route.name = 'bills';
    const w = await mount();
    expect(w.find('.page-body #slot').exists()).toBe(true);
  });
});
