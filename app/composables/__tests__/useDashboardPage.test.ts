/**
 * Pins the dashboard's derived state and handlers. Housemates come from the
 * houses store's active members: `currentHouse` (GET /api/houses?current=true)
 * carries no members.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { defineComponent } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { useDashboardPage } from '~/composables/useDashboardPage';

const state = vi.hoisted(() => ({
  houses: {} as Record<string, unknown>,
  expenses: {} as Record<string, unknown>,
  bills: {} as Record<string, unknown>,
  user: {} as Record<string, unknown>,
  notifications: {} as Record<string, unknown>,
  notes: {} as Record<string, unknown>,
  getHouseBalance: null as unknown as ReturnType<typeof vi.fn>,
  getRecentPayments: null as unknown as ReturnType<typeof vi.fn>,
  getOwnerReports: null as unknown as ReturnType<typeof vi.fn>,
}));

vi.mock('~/stores/houses', () => ({ useHousesStore: () => state.houses }));
vi.mock('~/stores/expenses', () => ({
  useExpensesStore: () => state.expenses,
}));
vi.mock('~/stores/bills', () => ({ useBillsStore: () => state.bills }));
vi.mock('~/stores/user', () => ({ useUserStore: () => state.user }));
vi.mock('~/stores/notifications', () => ({
  useNotificationStore: () => state.notifications,
}));
vi.mock('~/composables/useBalance', () => ({
  useBalance: () => ({
    getHouseBalance: state.getHouseBalance,
    getRecentPayments: state.getRecentPayments,
    settleUserToUser: vi.fn(),
    undoSettlement: vi.fn(),
  }),
}));
vi.mock('~/stores/bulletinNotes', () => ({
  useBulletinNotesStore: () => state.notes,
}));

vi.mock('~/composables/useReportsApi', () => ({
  useReportsApi: () => ({ getOwnerReports: state.getOwnerReports }),
}));

mockNuxtImport('useI18n', () => () => ({
  t: (k: string) => k,
  locale: { value: 'en' },
}));
mockNuxtImport('useLoading', () => () => ({
  startLoading: vi.fn(),
  stopLoading: vi.fn(),
}));

const activeMembers = [
  { id: 'hm-1', user_id: 'u-1', role: 'owner' },
  { id: 'hm-2', user_id: 'u-2', role: 'member' },
];

const soonDay = () => {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const person = (id: string) => ({ id, first_name: id, last_name: '' });
const tx = (from: string, to: string, amount: number) => ({
  from_user_id: from,
  to_user_id: to,
  amount,
  from_user: person(from),
  to_user: person(to),
});

beforeEach(() => {
  state.houses = {
    currentHouse: { id: 'h-1', name: 'Home' },
    activeMembers,
    isOwner: true,
    lastFetch: 1,
    isLoading: false,
    createHouse: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn().mockResolvedValue(undefined),
  };
  state.expenses = {
    expenses: [],
    initialize: vi.fn().mockResolvedValue(undefined),
  };
  state.bills = {
    upcomingBills: [],
    bills: [
      { active: true, monthly_cost: 60 },
      { active: true, monthly_cost: 41 },
      { active: false, monthly_cost: 1000 },
    ],
    initialize: vi.fn().mockResolvedValue(undefined),
  };
  state.user = {
    currentUser: { id: 'u-1', first_name: 'Simone' },
    initialize: vi.fn().mockResolvedValue(undefined),
  };
  state.notifications = { error: vi.fn(), info: vi.fn() };
  state.notes = {
    activeNotes: [],
    loadHouseNotes: vi.fn(),
    createNote: vi.fn(),
    deleteNote: vi.fn(),
  };
  state.getHouseBalance = vi.fn().mockResolvedValue({
    data: {
      house_id: 'h-1',
      currency: 'EUR',
      user_balances: [],
      settlement_transactions: [
        tx('u-3', 'u-1', 5),
        tx('u-1', 'u-2', 10),
        tx('u-2', 'u-3', 99),
        tx('u-1', 'u-3', 30),
        tx('u-2', 'u-1', 20),
      ],
      total_expenses: 0,
      is_balanced: false,
    },
    error: null,
  });
  state.getOwnerReports = vi.fn().mockResolvedValue({
    data: [
      { id: 'r-1', house_id: 'h-1', solved_at: null },
      { id: 'r-2', house_id: 'h-1', solved_at: '2026-01-01' },
      { id: 'r-3', house_id: 'other', solved_at: null },
    ],
    pagination: {},
  });
  state.getRecentPayments = vi
    .fn()
    .mockResolvedValue({ data: [{ id: 'p-1' }], error: null });
});

afterEach(() => {
  vi.useRealTimers();
});

async function setup() {
  let result!: ReturnType<typeof useDashboardPage>;
  await mountSuspended(
    defineComponent({
      setup() {
        result = useDashboardPage();
        return () => null;
      },
    }),
  );
  return result;
}

describe('useDashboardPage', () => {
  it('exposes the store active members', async () => {
    const page = await setup();
    expect(page.members.value).toEqual(activeMembers);
  });

  it('adds your bills share and your shared expenses into one monthly figure', async () => {
    const now = new Date();
    state.expenses.expenses = [
      {
        created_by: 'u-2',
        created_at: now.toISOString(),
        expense_shares: [{ user_id: 'u-1', amount_due: 9.5, is_paid: false }],
      },
    ];
    const page = await setup();
    expect(page.month.value).toEqual({ bills: 50.5, shared: 9.5, total: 60 });
  });

  it('settles in place when exactly one debt is open, else links to balance', async () => {
    state.getHouseBalance.mockResolvedValue({
      data: {
        house_id: 'h-1',
        currency: 'EUR',
        user_balances: [],
        settlement_transactions: [tx('u-1', 'u-2', 10)],
        total_expenses: 0,
        is_balanced: false,
      },
      error: null,
    });
    const page = await setup();
    await flushPromises();
    expect(page.heroAction.value).toMatchObject({
      kind: 'settle',
      label: 'balance.headline.settleUp',
    });
  });

  it('links to balance when several people are involved', async () => {
    const page = await setup();
    await flushPromises();
    expect(page.heroAction.value).toEqual({
      kind: 'link',
      label: 'balance.headline.settleUp',
      to: '/balance',
    });
  });

  it('offers "Mark as received" for a single credit', async () => {
    state.getHouseBalance.mockResolvedValue({
      data: {
        house_id: 'h-1',
        currency: 'EUR',
        user_balances: [],
        settlement_transactions: [tx('u-2', 'u-1', 10.99)],
        total_expenses: 0,
        is_balanced: false,
      },
      error: null,
    });
    const page = await setup();
    await flushPromises();
    expect(page.heroAction.value).toMatchObject({
      kind: 'settle',
      label: 'balance.markReceived',
    });
  });

  it('lists what needs attention for the owner, linking each to its page', async () => {
    state.bills.bills = [
      { active: true, monthly_cost: 10, next_due_date: '2020-01-01' },
      { active: true, monthly_cost: 10, next_due_date: '2999-01-01' },
      { active: true, monthly_cost: 10, next_due_date: soonDay() },
    ];
    const page = await setup();
    await flushPromises();
    expect(page.attention.value).toEqual([
      { key: 'overdueBills', count: 1, to: '/bills' },
      { key: 'dueSoonBills', count: 1, to: '/bills' },
      { key: 'openReports', count: 1, to: '/reports' },
      { key: 'unsettled', count: 1, to: '/balance', amount: '€164.00' },
    ]);
  });

  it('returns an empty list when all is in order', async () => {
    state.getHouseBalance.mockResolvedValue({
      data: {
        house_id: 'h-1',
        currency: 'EUR',
        user_balances: [],
        settlement_transactions: [],
        total_expenses: 0,
        is_balanced: true,
      },
      error: null,
    });
    state.getOwnerReports.mockResolvedValue({ data: [], pagination: {} });
    const page = await setup();
    await flushPromises();
    expect(page.attention.value).toEqual([]);
  });

  it('shows no status line to plain members or before reports load', async () => {
    (state.houses as { isOwner: boolean }).isOwner = false;
    state.houses.activeMembers = [
      { id: 'hm-1', user_id: 'u-1', role: 'member' },
    ];
    const member = await setup();
    await flushPromises();
    expect(member.attention.value).toBeNull();
  });

  it('keeps the status line out while the owner reports are still loading', async () => {
    state.getOwnerReports.mockReturnValue(new Promise(() => {}));
    const page = await setup();
    await flushPromises();
    expect(page.attention.value).toBeNull();
  });

  it('skips reports for admins but still reports the other signals', async () => {
    (state.houses as { isOwner: boolean }).isOwner = false;
    state.houses.activeMembers = [
      { id: 'hm-1', user_id: 'u-1', role: 'admin' },
    ];
    const page = await setup();
    await flushPromises();
    expect(state.getOwnerReports).not.toHaveBeenCalled();
    expect(page.attention.value?.map((i) => i.key)).toEqual(['unsettled']);
  });

  it('leaves the balance null when it fails to load', async () => {
    state.getHouseBalance.mockResolvedValue({ data: null, error: 'boom' });
    const page = await setup();
    await flushPromises();
    expect(page.houseBalance.value).toBeNull();
    expect(page.isBalanceLoading.value).toBe(false);
  });

  it('loads the latest payments for the current house', async () => {
    const page = await setup();
    await flushPromises();
    expect(state.getRecentPayments).toHaveBeenCalled();
    expect(page.recentPayments.value).toEqual([{ id: 'p-1' }]);
  });

  it('drops undone payments before applying the row cap', async () => {
    const live = Array.from({ length: 10 }, (_, i) => ({ id: `ok-${i}` }));
    state.getRecentPayments.mockResolvedValue({
      data: [
        { id: 'u-0', undone_at: '2026-10-28T11:00:00Z' },
        { id: 'u-1', undone_at: '2026-10-28T11:00:00Z' },
        ...live,
      ],
      error: null,
    });
    const page = await setup();
    await flushPromises();
    expect(page.recentPayments.value.map((p) => p.id)).toEqual(
      live.map((p) => p.id),
    );
  });

  it('falls back to an empty payment list when loading payments fails', async () => {
    state.getRecentPayments.mockResolvedValue({ data: null, error: 'boom' });
    const page = await setup();
    await flushPromises();
    expect(page.recentPayments.value).toEqual([]);
  });

  it('creates a house, closes the modal and refreshes every store', async () => {
    const page = await setup();
    page.showCreateHouse.value = true;
    await page.handleCreateHouse({ name: 'Flat', address: 'Via Roma' });

    expect(state.houses.createHouse).toHaveBeenCalledWith({
      name: 'Flat',
      description: 'Via Roma',
      currency: 'EUR',
      max_members: undefined,
    });
    expect(state.houses.initialize).toHaveBeenCalledWith(true);
    expect(page.showCreateHouse.value).toBe(false);
  });

  it('notifies and keeps the modal open when creating a house fails', async () => {
    (state.houses.createHouse as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('boom'),
    );
    const page = await setup();
    page.showCreateHouse.value = true;
    await page.handleCreateHouse({ name: 'Flat' });

    expect(state.notifications.error).toHaveBeenCalledWith(
      'errors.failedToCreateHouse',
      'boom',
    );
    expect(page.showCreateHouse.value).toBe(true);
  });

  it('creates notes in the current house and deletes by id', async () => {
    const page = await setup();
    const payload = { message: 'hi' } as never;
    await page.handleCreateNote(payload);
    await page.handleDeleteNote('n-1');

    expect(state.notes.loadHouseNotes).toHaveBeenCalledWith('h-1');
    expect(state.notes.createNote).toHaveBeenCalledWith('h-1', payload);
    expect(state.notes.deleteNote).toHaveBeenCalledWith('n-1');
  });
});

describe('useDashboardPage attention edge cases', () => {
  const dayOffset = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const noDebts = {
    data: {
      house_id: 'h-1',
      currency: 'EUR',
      user_balances: [],
      settlement_transactions: [],
      total_expenses: 0,
      is_balanced: true,
    },
    error: null,
  };
  const counts = (page: Awaited<ReturnType<typeof setup>>) =>
    Object.fromEntries(page.attention.value!.map((i) => [i.key, i.count]));

  it('is null while the balance is still loading', async () => {
    state.getHouseBalance.mockReturnValue(new Promise(() => {}));
    const page = await setup();
    await flushPromises();
    expect(page.isBalanceLoading.value).toBe(true);
    expect(page.attention.value).toBeNull();
  });

  it('is null, not "all in order", when the balance failed to load', async () => {
    state.getHouseBalance.mockResolvedValue({ data: null, error: 'boom' });
    state.getOwnerReports.mockResolvedValue({ data: [], pagination: {} });
    state.bills.bills = [];
    const page = await setup();
    await flushPromises();
    expect(page.houseBalance.value).toBeNull();
    expect(page.attention.value).toBeNull();
  });

  it('counts bills due today and in 7 days as due soon, never overdue', async () => {
    state.getHouseBalance.mockResolvedValue(noDebts);
    state.getOwnerReports.mockResolvedValue({ data: [], pagination: {} });
    state.bills.bills = [
      { active: true, monthly_cost: 1, next_due_date: dayOffset(0) },
      { active: true, monthly_cost: 1, next_due_date: dayOffset(7) },
    ];
    const page = await setup();
    await flushPromises();
    expect(counts(page)).toEqual({ dueSoonBills: 2 });
  });

  it('counts yesterday as overdue and day 8 as neither', async () => {
    state.getHouseBalance.mockResolvedValue(noDebts);
    state.bills.bills = [
      { active: true, monthly_cost: 1, next_due_date: dayOffset(-1) },
      { active: true, monthly_cost: 1, next_due_date: dayOffset(8) },
    ];
    state.getOwnerReports.mockResolvedValue({ data: [], pagination: {} });
    const page = await setup();
    await flushPromises();
    expect(counts(page)).toEqual({ overdueBills: 1 });
  });

  it('ignores inactive bills and bills without a due date', async () => {
    state.getHouseBalance.mockResolvedValue(noDebts);
    state.getOwnerReports.mockResolvedValue({ data: [], pagination: {} });
    state.bills.bills = [
      { active: false, monthly_cost: 1, next_due_date: dayOffset(-3) },
      { active: true, monthly_cost: 1 },
    ];
    const page = await setup();
    await flushPromises();
    expect(page.attention.value).toEqual([]);
  });

  it('formats the total of all open transfers as the unsettled amount', async () => {
    state.getOwnerReports.mockResolvedValue({ data: [], pagination: {} });
    state.bills.bills = [];
    const page = await setup();
    await flushPromises();
    expect(page.attention.value).toEqual([
      { key: 'unsettled', count: 1, to: '/balance', amount: '€164.00' },
    ]);
  });
});
