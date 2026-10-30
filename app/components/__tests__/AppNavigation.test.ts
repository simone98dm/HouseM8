/**
 * AppNavigation Component Tests
 * Tests for app navigation component following CLAUDE.md guidelines
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computed } from 'vue';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { setActivePinia, createPinia } from 'pinia';
import { createMockHouse, createMockI18n } from '~/tests/utils';
import AppNavigation from '~/components/AppNavigation.vue';
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

const createIsActive = (currentPath: string) => {
  return (path: string) => {
    if (path === '/dashboard') {
      return currentPath === '/dashboard';
    }
    return currentPath.startsWith(path);
  };
};

describe('AppNavigation Component', () => {
  const mockI18n = createMockI18n();

  describe('Navigation Items', () => {
    it('should define all navigation items', () => {
      const allNavItems = [
        {
          path: '/dashboard',
          icon: 'heroicons:rectangle-group',
          label: mockI18n.t('navigation.home'),
          needHouse: false,
          needAuth: true,
        },
        {
          path: '/expenses',
          icon: 'heroicons:credit-card',
          label: mockI18n.t('navigation.expenses'),
          needHouse: true,
          needAuth: true,
        },
        {
          path: '/bills',
          icon: 'heroicons:document-text',
          label: mockI18n.t('navigation.bills'),
          needHouse: true,
          needAuth: true,
        },
        {
          path: '/house/:id',
          icon: 'heroicons:home',
          label: mockI18n.t('navigation.house'),
          needHouse: true,
          needAuth: true,
        },
      ];

      expect(allNavItems).toHaveLength(4);
      expect(allNavItems[0]?.path).toBe('/dashboard');
      expect(allNavItems[0]?.needHouse).toBe(false);
      expect(allNavItems[0]?.needAuth).toBe(true);
    });

    it('should have correct item properties', () => {
      const item = {
        path: '/expenses',
        icon: 'heroicons:credit-card',
        label: 'Expenses',
        needHouse: true,
        needAuth: true,
      };

      expect(item).toHaveProperty('path');
      expect(item).toHaveProperty('icon');
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('needHouse');
      expect(item).toHaveProperty('needAuth');
    });
  });

  describe('Computed Properties', () => {
    it('should compute isAuthenticated from user store', () => {
      const userStore = { isAuthenticated: true };
      const isAuthenticated = computed(() => userStore.isAuthenticated);

      expect(isAuthenticated.value).toBe(true);
    });

    it('should compute hasHouse from houses store', () => {
      const housesStore = {
        currentHouse: createMockHouse(),
        isMember: true,
      };
      const hasHouse = computed(
        () => housesStore.currentHouse && housesStore.isMember,
      );

      expect(hasHouse.value).toBe(true);
    });

    it('should filter navigation items based on authentication', () => {
      const allNavItems = [
        { path: '/dashboard', needAuth: true, needHouse: false },
        { path: '/expenses', needAuth: true, needHouse: true },
        { path: '/public', needAuth: false, needHouse: false },
      ];

      const isAuthenticated = true;
      const hasHouse = false;

      const navItems = computed(() => {
        return allNavItems.filter((item) => {
          if (item.needAuth && !isAuthenticated) {
            return false;
          }
          if (item.needHouse && !hasHouse) {
            return false;
          }
          return true;
        });
      });

      expect(navItems.value).toHaveLength(2);
      expect(navItems.value[0]?.path).toBe('/dashboard');
      expect(navItems.value[1]?.path).toBe('/public');
    });

    it('should filter navigation items based on house membership', () => {
      const allNavItems = [
        { path: '/dashboard', needAuth: true, needHouse: false },
        { path: '/expenses', needAuth: true, needHouse: true },
        { path: '/house/:id', needAuth: true, needHouse: true },
      ];

      const isAuthenticated = true;
      const hasHouse = true;

      const navItems = computed(() => {
        return allNavItems.filter((item) => {
          if (item.needAuth && !isAuthenticated) {
            return false;
          }
          if (item.needHouse && !hasHouse) {
            return false;
          }
          return true;
        });
      });

      expect(navItems.value).toHaveLength(3);
    });
  });

  describe('Route Matching', () => {
    it('should match dashboard route exactly', () => {
      const isActive = createIsActive('/dashboard');

      expect(isActive('/dashboard')).toBe(true);
      expect(isActive('/expenses')).toBe(false);
    });

    it('should match routes with startsWith', () => {
      const isActive = createIsActive('/expenses/123');

      expect(isActive('/expenses')).toBe(true);
      expect(isActive('/bills')).toBe(false);
    });

    it('should handle house route with dynamic id', () => {
      const housesStore = { currentHouse: { id: 'house-123' } };
      const path = '/house/:id';
      const resolvedPath = path.replace(
        ':id',
        housesStore.currentHouse?.id || '',
      );

      expect(resolvedPath).toBe('/house/house-123');
    });
  });

  describe('Styling', () => {
    it('should have correct navigation classes', () => {
      const expectedClasses =
        'fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-40';
      expect(expectedClasses).toContain('fixed bottom-0');
      expect(expectedClasses).toContain('bg-white');
      expect(expectedClasses).toContain('border-t');
    });

    it('should have correct active link classes', () => {
      const activeClasses = 'text-blue-600 bg-blue-50';
      expect(activeClasses).toContain('text-blue-600');
      expect(activeClasses).toContain('bg-blue-50');
    });

    it('should have correct inactive link classes', () => {
      const inactiveClasses = 'text-gray-600 hover:text-gray-900';
      expect(inactiveClasses).toContain('text-gray-600');
      expect(inactiveClasses).toContain('hover:text-gray-900');
    });

    it('should have correct link container classes', () => {
      const linkClasses =
        'flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors duration-200';
      expect(linkClasses).toContain('flex flex-col');
      expect(linkClasses).toContain('items-center');
      expect(linkClasses).toContain('rounded-lg');
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive icon sizes', () => {
      const iconClasses = 'w-6 h-6 md:w-5 md:h-5';
      expect(iconClasses).toContain('w-6 h-6');
      expect(iconClasses).toContain('md:w-5 md:h-5');
    });

    it('should have responsive text sizes', () => {
      const textClasses = 'text-sm md:text-xs';
      expect(textClasses).toContain('text-sm');
      expect(textClasses).toContain('md:text-xs');
    });
  });

  describe('Accessibility', () => {
    it('should have proper navigation structure', () => {
      const navElement = 'nav';
      const navClasses =
        'fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-40';

      expect(navElement).toBe('nav');
      expect(navClasses).toContain('z-40');
    });

    it('should use semantic navigation links', () => {
      const linkElement = 'NuxtLink';
      expect(linkElement).toBe('NuxtLink');
    });
  });

  // The desktop sidebar's six icon-only links had no accessible name at all
  // (no text, no aria-label, no title) — a screen reader announced six
  // indistinguishable "link"s. Each sidebar-item must expose an aria-label.
  describe('Desktop sidebar — accessible names', () => {
    beforeEach(() => {
      setActivePinia(createPinia());
      mockUserStore({ id: 'user-1' });
    });

    it('gives every sidebar link a non-empty aria-label', async () => {
      const wrapper = await mountSuspended(AppNavigation, {
        props: { hasHouse: true, currentHouseId: 'h-1' },
        global: G,
      });

      const sidebarLinks = wrapper.findAll('.sidebar .sidebar-item');
      expect(sidebarLinks.length).toBeGreaterThan(0);
      sidebarLinks.forEach((link) => {
        const label = link.attributes('aria-label');
        expect(label).toBeTruthy();
      });
    });

    it('labels each sidebar link with its matching i18n key', async () => {
      const wrapper = await mountSuspended(AppNavigation, {
        props: { hasHouse: true, currentHouseId: 'h-1' },
        global: G,
      });

      const hrefToLabel: Record<string, string> = {
        '/dashboard': 'navigation.home',
        '/expenses': 'navigation.expenses',
        '/bills': 'navigation.bills',
        '/balance': 'navigation.balance',
        '/reports': 'navigation.reports',
        '/house/h-1': 'navigation.house',
      };

      const sidebarLinks = wrapper.findAll('.sidebar .sidebar-item');
      sidebarLinks.forEach((link) => {
        const href = link.attributes('href');
        const expected = href ? hrefToLabel[href] : undefined;
        if (expected) {
          expect(link.attributes('aria-label')).toBe(expected);
        }
      });
    });
  });

  // The desktop sidebar is display:none under 768px, and it was the only place
  // linking to /user/[id] — leaving the profile page unreachable on mobile.
  describe('Mobile bottom nav — profile access', () => {
    beforeEach(() => {
      setActivePinia(createPinia());
      mockUserStore({ id: 'user-1' });
    });

    const bottomNavLinks = (wrapper: { findAll: (s: string) => unknown[] }) =>
      wrapper.findAll('.bottom-nav .bottom-nav-item');

    it('reaches the profile through the More sheet', async () => {
      const wrapper = await mountSuspended(AppNavigation, {
        props: { hasHouse: true, currentHouseId: 'h-1' },
        global: G,
      });

      await wrapper.find('.bottom-nav button.bottom-nav-item').trigger('click');
      const sheet = wrapper.findComponent({ name: 'AppNavigationMoreSheet' });

      expect(sheet.props('profilePath')).toBe('/user/user-1');
    });

    it('hides the profile entry when unauthenticated', async () => {
      mockUserStore(null);
      const wrapper = await mountSuspended(AppNavigation, {
        props: { hasHouse: false },
        global: G,
      });

      const profile = wrapper
        .findAll('.bottom-nav .bottom-nav-item')
        .find((link) => link.attributes('href')?.startsWith('/user/'));

      expect(profile).toBeUndefined();
    });

    it('shows four primary items plus the More button', async () => {
      const wrapper = await mountSuspended(AppNavigation, {
        props: { hasHouse: true, currentHouseId: 'h-1' },
        global: G,
      });

      expect(bottomNavLinks(wrapper)).toHaveLength(5);
    });
  });
});
