/**
 * Test Utilities and Helpers
 * Common utilities for testing components, stores, and composables
 */

import { createPinia, setActivePinia } from 'pinia';
import { vi } from 'vitest';
import type { Expense, ExpenseShare, BulletinNote, Report } from '~/types';

/**
 * Create a mock i18n instance
 */
export function createMockI18n() {
  return {
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        let result = key;
        Object.keys(params).forEach((param) => {
          result = result.replace(`{${param}}`, String(params[param]));
        });
        return result;
      }
      return key;
    },
    locale: { value: 'en' },
    locales: { value: ['en', 'it'] },
  };
}

/**
 * Create a mock router
 */
export function createMockRouter() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    go: vi.fn(),
    currentRoute: {
      value: {
        path: '/',
        params: {},
        query: {},
        name: 'index',
      },
    },
  };
}

/**
 * Create a mock Nuxt app context
 */
export function createMockNuxtApp() {
  return {
    $i18n: createMockI18n(),
    $router: createMockRouter(),
  };
}

/**
 * Create a mock user
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Create a mock house
 */
export function createMockHouse(overrides = {}) {
  return {
    id: 'test-house-id',
    name: 'Test House',
    address: '123 Test Street',
    owner_id: 'test-user-id',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    currency: 'USD' as const,
    member_count: 1,
    members: [],
    invitations: [],
    max_members: 10,
    status: 'active' as const,
    ...overrides,
  };
}

/**
 * Create a mock house member
 */
export function createMockHouseMember(overrides = {}) {
  return {
    id: 'test-member-id',
    house_id: 'test-house-id',
    user_id: 'test-user-id',
    role: 'member' as const,
    joined_at: '2025-01-01T00:00:00Z',
    is_active: true,
    user: createMockUser(),
    ...overrides,
  };
}

/**
 * Create a mock bill
 */
export function createMockBill(overrides = {}) {
  return {
    id: 'test-bill-id',
    house_id: 'test-house-id',
    description: 'Test Bill',
    monthly_cost: 100,
    next_due_date: '2025-12-01',
    payment_period: 1 as 1 | 2 | 6 | 12,
    currency: 'USD' as const,
    created_by: 'test-user-id',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    active: true,
    creator: createMockUser(),
    ...overrides,
  };
}

/**
 * Create a mock expense
 */
export function createMockExpense(overrides = {}): Expense {
  return {
    id: 'test-expense-id',
    house_id: 'test-house-id',
    description: 'Test Expense',
    total_amount: 100,
    amount: '100',
    created_by: 'test-user-id',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    categories: [],
    recurring: false,
    currency: 'USD' as const,
    creator: createMockUser(),
    shares: [],
    ...overrides,
  } as Expense;
}

/**
 * Create a mock expense share
 */
export function createMockExpenseShare(overrides = {}): ExpenseShare {
  return {
    id: 'share-123',
    expense_id: 'expense-123',
    user_id: 'user-123',
    amount_due: 50,
    is_paid: false,
    paid_at: null,
    user: createMockUser(),
    ...overrides,
  } as ExpenseShare;
}

/**
 * Create a mock bulletin note
 */
export function createMockBulletinNote(overrides = {}): BulletinNote {
  return {
    id: 'note-123',
    house_id: 'house-123',
    user_id: 'user-123',
    title: 'Test Note',
    message: 'This is a test bulletin note content',
    color: 'yellow',
    expires_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    author: createMockUser(),
    ...overrides,
  } as BulletinNote;
}

/**
 * Create a mock report
 */
export function createMockReport(overrides = {}): Report {
  return {
    id: 'report-123',
    house_id: 'house-123',
    created_by: 'user-123',
    description: 'This is a test report description with enough characters',
    created_at: '2024-01-01T00:00:00Z',
    read_at: null,
    solved_at: null,
    images: [],
    user: createMockUser(),
    house_name: 'Test House',
    ...overrides,
  } as Report;
}

/**
 * Setup Pinia for testing
 */
export function setupPinia() {
  const pinia = createPinia();
  setActivePinia(pinia);
  return pinia;
}

/**
 * Create a mock API composable
 */
export function createMockApi() {
  return {
    fetch: vi.fn(),
    isLoading: { value: false },
  };
}

/**
 * Create a mock notification store
 */
export function createMockNotificationStore() {
  return {
    notifications: [],
    addNotification: vi.fn(),
    removeNotification: vi.fn(),
    clearAll: vi.fn(),
  };
}

/**
 * Wait for async operations
 */
export async function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Create mock currency composable
 */
export function createMockCurrency() {
  return {
    getCurrencySymbol: (code: string) => {
      const symbols: Record<string, string> = {
        USD: '$',
        EUR: '€',
        GBP: '£',
      };
      return symbols[code] || '$';
    },
    formatCurrency: (amount: number, code: string) => {
      const symbol = code === 'USD' ? '$' : '€';
      return `${symbol}${amount.toFixed(2)}`;
    },
  };
}

/**
 * Mount stub for `UiButton`.
 *
 * Auth pages render every action through UiButton, and their tests select by
 * element (`find('button')`, `find('.confirm-actions button')`). A bare
 * `UiButton: true` stub renders `<ui-button-stub>` and drops the slot, so
 * those selectors and text assertions silently stop matching. This mirrors the
 * real component closely enough for both: an `<a>` when `to` is set, a
 * `<button>` otherwise, with the slot rendered.
 */
export const uiButtonStub = {
  template: `
    <component
      :is="to ? 'a' : 'button'"
      class="ui-btn"
      :href="to"
      :type="to ? undefined : type"
      :disabled="to ? undefined : (disabled || loading)"
      @click="$emit('click')"
    ><slot /></component>
  `,
  props: [
    'variant',
    'size',
    'type',
    'disabled',
    'loading',
    'success',
    'icon',
    'fullWidth',
    'outline',
    'to',
  ],
  emits: ['click'],
};

/**
 * UiModal stand-in for form modals: renders the `as="form"` panel inline (no
 * Teleport) with the body and footer slots, and forwards native submit as the
 * modal's `submit` event, like the real component.
 */
export const UiModalFormStub = {
  props: ['show', 'title', 'as'],
  emits: ['close', 'submit'],
  template: `
    <form v-if="show" novalidate @submit.prevent="$emit('submit', $event)">
      <slot />
      <footer><slot name="footer" /></footer>
      <button type="button" class="close-btn" @click="$emit('close')">X</button>
    </form>`,
};
