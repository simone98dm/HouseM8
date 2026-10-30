import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { defineComponent } from 'vue';
import { useExpensesPage } from '~/composables/useExpensesPage';
import { useHousesStore } from '~/stores/houses';
import { useExpensesStore } from '~/stores/expenses';
import { useUserStore } from '~/stores/user';
import {
  createMockExpense,
  createMockExpenseShare,
  createMockHouse,
  createMockUser,
} from '~/tests/utils';

vi.mock('~/stores/houses', () => ({ useHousesStore: vi.fn() }));
vi.mock('~/stores/expenses', () => ({ useExpensesStore: vi.fn() }));
vi.mock('~/stores/user', () => ({ useUserStore: vi.fn() }));

const currentUser = createMockUser({ id: 'user-1' });
const currentHouse = createMockHouse({ id: 'house-1' });

/** Mounts the composable inside a host component (it uses onMounted/watch). */
async function setup(expenses: ReturnType<typeof createMockExpense>[]) {
  const initialize = vi.fn().mockResolvedValue(undefined);
  const loadHouseExpenses = vi.fn().mockResolvedValue(undefined);
  const markShareAsPaid = vi.fn().mockResolvedValue(undefined);
  const markShareAsUnpaid = vi.fn().mockResolvedValue(undefined);
  const createExpense = vi.fn().mockResolvedValue(undefined);
  const deleteExpense = vi.fn().mockResolvedValue(undefined);

  vi.mocked(useHousesStore).mockReturnValue({
    currentHouse,
    members: [],
    initialize,
  } as unknown as ReturnType<typeof useHousesStore>);

  vi.mocked(useExpensesStore).mockReturnValue({
    expenses,
    isLoading: false,
    loadHouseExpenses,
    markShareAsPaid,
    markShareAsUnpaid,
    createExpense,
    deleteExpense,
  } as unknown as ReturnType<typeof useExpensesStore>);

  vi.mocked(useUserStore).mockReturnValue({
    currentUser,
  } as unknown as ReturnType<typeof useUserStore>);

  let api!: ReturnType<typeof useExpensesPage>;
  const Host = defineComponent({
    template: '<div />',
    setup() {
      api = useExpensesPage();
      return {};
    },
  });

  await mountSuspended(Host);

  return {
    api,
    initialize,
    loadHouseExpenses,
    markShareAsPaid,
    markShareAsUnpaid,
    createExpense,
    deleteExpense,
  };
}

describe('useExpensesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads house expenses on mount when a house is already current', async () => {
    const { initialize, loadHouseExpenses } = await setup([]);
    expect(initialize).toHaveBeenCalled();
    expect(loadHouseExpenses).toHaveBeenCalledTimes(1);
  });

  it('filters to pending shares only', async () => {
    const expenses = [
      createMockExpense({
        id: 'exp-1',
        shares: [createMockExpenseShare({ user_id: 'user-1', is_paid: false })],
      }),
      createMockExpense({
        id: 'exp-2',
        shares: [createMockExpenseShare({ user_id: 'user-1', is_paid: true })],
      }),
    ];
    const { api } = await setup(expenses);
    api.currentFilter.value = 'pending';
    expect(api.filteredExpenses.value.map((e) => e.id)).toEqual(['exp-1']);
  });

  it('filters to settled shares only', async () => {
    const expenses = [
      createMockExpense({
        id: 'exp-1',
        shares: [createMockExpenseShare({ user_id: 'user-1', is_paid: false })],
      }),
      createMockExpense({
        id: 'exp-2',
        shares: [createMockExpenseShare({ user_id: 'user-1', is_paid: true })],
      }),
    ];
    const { api } = await setup(expenses);
    api.currentFilter.value = 'settled';
    expect(api.filteredExpenses.value.map((e) => e.id)).toEqual(['exp-2']);
  });

  it('filters by search query across description and names', async () => {
    const expenses = [
      createMockExpense({ id: 'exp-1', description: 'Groceries' }),
      createMockExpense({ id: 'exp-2', description: 'Internet bill' }),
    ];
    const { api } = await setup(expenses);
    api.searchQuery.value = 'grocer';
    expect(api.filteredExpenses.value.map((e) => e.id)).toEqual(['exp-1']);
  });

  it('computes totalOwed from unpaid shares belonging to the current user', async () => {
    const expenses = [
      createMockExpense({
        id: 'exp-1',
        shares: [
          createMockExpenseShare({
            user_id: 'user-1',
            amount_due: 50,
            is_paid: false,
          }),
        ],
      }),
      createMockExpense({
        id: 'exp-2',
        shares: [
          createMockExpenseShare({
            user_id: 'user-1',
            amount_due: 60,
            is_paid: true,
          }),
        ],
      }),
    ];
    const { api } = await setup(expenses);
    expect(api.totalOwed.value).toBe(50);
  });

  it("does not count the user's own share on expenses they paid as owed", async () => {
    const expenses = [
      createMockExpense({
        id: 'exp-1',
        created_by: 'user-1',
        shares: [
          createMockExpenseShare({
            user_id: 'user-1',
            amount_due: 50,
            is_paid: false,
          }),
        ],
      }),
    ];
    const { api } = await setup(expenses);
    expect(api.totalOwed.value).toBe(0);
  });

  it('computes totalOwedToYou from unpaid shares on expenses the user created', async () => {
    const expenses = [
      createMockExpense({
        id: 'exp-1',
        created_by: 'user-1',
        shares: [
          createMockExpenseShare({
            user_id: 'user-2',
            amount_due: 25,
            is_paid: false,
          }),
          createMockExpenseShare({
            user_id: 'user-1',
            amount_due: 25,
            is_paid: false,
          }),
        ],
      }),
    ];
    const { api } = await setup(expenses);
    expect(api.totalOwedToYou.value).toBe(25);
  });

  it('totalOwed sums only others-paid expenses, skipping paid and zero shares', async () => {
    const mine = (id: string, due: number, paid = false) =>
      createMockExpenseShare({
        user_id: 'user-1',
        amount_due: due,
        is_paid: paid,
      });
    const { api } = await setup([
      createMockExpense({
        id: 'a',
        created_by: 'user-2',
        shares: [mine('a', 30)],
      }),
      createMockExpense({
        id: 'b',
        created_by: 'user-3',
        shares: [mine('b', 12.5)],
      }),
      createMockExpense({
        id: 'c',
        created_by: 'user-2',
        shares: [mine('c', 99, true)],
      }),
      createMockExpense({
        id: 'd',
        created_by: 'user-2',
        shares: [mine('d', 0)],
      }),
      createMockExpense({
        id: 'e',
        created_by: 'user-1',
        shares: [mine('e', 77)],
      }),
      createMockExpense({ id: 'f', created_by: 'user-2', shares: undefined }),
    ]);
    expect(api.totalOwed.value).toBe(42.5);
  });

  it('totalOwedToYou ignores expenses paid by others, paid shares and your own share', async () => {
    const share = (user_id: string, amount_due: number, is_paid = false) =>
      createMockExpenseShare({ user_id, amount_due, is_paid });
    const { api } = await setup([
      createMockExpense({
        id: 'a',
        created_by: 'user-1',
        shares: [
          share('user-2', 20),
          share('user-3', 10, true),
          share('user-1', 5),
        ],
      }),
      createMockExpense({
        id: 'b',
        created_by: 'user-1',
        shares: [share('user-3', 15)],
      }),
      createMockExpense({
        id: 'c',
        created_by: 'user-2',
        shares: [share('user-3', 100), share('user-1', 100)],
      }),
      createMockExpense({ id: 'd', created_by: 'user-1', shares: undefined }),
    ]);
    expect(api.totalOwedToYou.value).toBe(35);
    expect(api.totalOwed.value).toBe(100);
  });

  it('both totals are 0 with no expenses', async () => {
    const { api } = await setup([]);
    expect(api.totalOwed.value).toBe(0);
    expect(api.totalOwedToYou.value).toBe(0);
  });

  it('closes the create modal only when the expense was created', async () => {
    const { api, createExpense } = await setup([]);
    const payload = { description: 'x' } as never;
    api.showCreateModal.value = true;
    createExpense.mockResolvedValueOnce(false);
    await api.handleCreateExpense(payload);
    expect(api.showCreateModal.value).toBe(true);
    createExpense.mockResolvedValueOnce(true);
    await api.handleCreateExpense(payload);
    expect(api.showCreateModal.value).toBe(false);
  });

  it('opens and closes the view modal via handleExpenseClick/handleCloseViewModal', async () => {
    const expense = createMockExpense({ id: 'exp-1' });
    const { api } = await setup([expense]);

    api.handleExpenseClick(expense);
    expect(api.showViewModal.value).toBe(true);
    expect(api.selectedExpense.value?.id).toBe('exp-1');

    api.handleCloseViewModal();
    expect(api.showViewModal.value).toBe(false);
    expect(api.selectedExpense.value).toBeNull();
  });

  it('deletes an expense and closes the view modal', async () => {
    const expense = createMockExpense({ id: 'exp-1' });
    const { api, deleteExpense } = await setup([expense]);

    api.handleExpenseClick(expense);
    await api.handleDeleteExpense('exp-1');

    expect(deleteExpense).toHaveBeenCalledWith('exp-1');
    expect(api.showViewModal.value).toBe(false);
    expect(api.deletingExpenseId.value).toBeNull();
  });
});
