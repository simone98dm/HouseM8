/**
 * Test Setup and Configuration
 * Common setup for all tests following CLAUDE.md guidelines
 */

import { vi } from 'vitest';
import './globals.d.ts';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock Nuxt auto-imports - using any to bypass TypeScript checks for global augmentation
(globalThis as any).defineProps = vi.fn();
(globalThis as any).defineEmits = vi.fn();
(globalThis as any).useI18n = vi.fn(() => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

(globalThis as any).useRoute = vi.fn(() => ({
  params: {},
  query: {},
  path: '/',
}));

(globalThis as any).useRouter = vi.fn(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
}));

(globalThis as any).navigateTo = vi.fn();

(globalThis as any).useRuntimeConfig = vi.fn(() => ({
  jwtSecret: 'test-jwt-secret-must-be-at-least-32chars!!',
}));

// Mock stores
(globalThis as any).useUserStore = vi.fn(() => ({
  currentUser: {
    id: 'test-user-id',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
  },
  isAuthenticated: true,
  fetchCurrentUser: vi.fn(),
  initialize: vi.fn(),
  reset: vi.fn(),
}));

// Mock composables
(globalThis as any).useApi = vi.fn(() => ({
  fetch: vi.fn(),
  isLoading: { value: false },
}));

(globalThis as any).useCurrency = vi.fn(() => ({
  getCurrencySymbol: (code: string) => {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
    };
    return symbols[code] || '$';
  },
}));

// Mock Nuxt Link
(globalThis as any).resolveComponent = vi.fn((name: string) => {
  if (name === 'NuxtLink') return 'a';
  if (name === 'Icon') return 'span';
  return name;
});
/* eslint-enable @typescript-eslint/no-explicit-any */
