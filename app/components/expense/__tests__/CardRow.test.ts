import { describe, it, expect } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import ExpenseCardRow from '~/components/expense/CardRow.vue';
import { createMockExpense, createMockExpenseShare } from '~/tests/utils';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string, params?: Record<string, string>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
  locale: { value: 'en' },
}));

const G = {
  mocks: { $t: (k: string) => k },
  stubs: {
    Icon: true,
    UiCurrency: {
      template: '<span class="ui-currency">{{ amount }}</span>',
      props: ['amount', 'currencyCode'],
    },
    UiButton: {
      template:
        '<button class="ui-btn" :disabled="loading" @click="$emit(\'click\')"><slot /></button>',
      props: [
        'type',
        'variant',
        'size',
        'outline',
        'fullWidth',
        'loading',
        'ariaLabel',
      ],
      emits: ['click'],
    },
  },
};

const USER_ID = 'u-1';
const OTHER_ID = 'u-2';

function makeExpense(overrides = {}) {
  return createMockExpense({
    id: 'exp-1',
    description: 'Groceries',
    total_amount: 100,
    currency: 'EUR',
    created_by: OTHER_ID,
    payer: {
      id: OTHER_ID,
      first_name: 'Alice',
      last_name: 'Smith',
      email: 'alice@test.com',
    },
    shares: [],
    ...overrides,
  });
}

describe('ExpenseCardRow', () => {
  it('renders card with description', async () => {
    const wrapper = await mountSuspended(ExpenseCardRow, {
      props: { expense: makeExpense(), currentUserId: USER_ID },
      global: G,
    });
    expect(wrapper.text()).toContain('Groceries');
  });

  it('emits click when the full-row overlay button is clicked', async () => {
    const exp = makeExpense();
    const wrapper = await mountSuspended(ExpenseCardRow, {
      props: { expense: exp, currentUserId: USER_ID },
      global: G,
    });
    await wrapper.find('button[class*="absolute"]').trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
  });

  it('shows payer first_name', async () => {
    const wrapper = await mountSuspended(ExpenseCardRow, {
      props: {
        expense: makeExpense({
          payer: {
            id: OTHER_ID,
            first_name: 'Alice',
            last_name: 'S',
            email: 'a@b.com',
          },
        }),
        currentUserId: USER_ID,
      },
      global: G,
    });
    expect(wrapper.text()).toContain('Alice');
  });

  it('shows creator first_name when no payer', async () => {
    const wrapper = await mountSuspended(ExpenseCardRow, {
      props: {
        expense: makeExpense({
          payer: undefined,
          creator: {
            id: OTHER_ID,
            first_name: 'Bob',
            last_name: 'X',
            email: 'b@c.com',
          },
        }),
        currentUserId: USER_ID,
      },
      global: G,
    });
    expect(wrapper.text()).toContain('Bob');
  });

  it('applies opacity class when isDeleting=true', async () => {
    const wrapper = await mountSuspended(ExpenseCardRow, {
      props: {
        expense: makeExpense(),
        currentUserId: USER_ID,
        isDeleting: true,
      },
      global: G,
    });
    expect(wrapper.html()).toContain('opacity-50');
  });

  describe('user share states', () => {
    // Debts are settled on the net balance (/balance), never per expense.
    it('offers no per-expense payment action on an unpaid share', async () => {
      const share = createMockExpenseShare({
        user_id: USER_ID,
        amount_due: 50,
        is_paid: false,
      });
      const wrapper = await mountSuspended(ExpenseCardRow, {
        props: {
          expense: makeExpense({ shares: [share], created_by: OTHER_ID }),
          currentUserId: USER_ID,
        },
        global: G,
      });
      // Only the stretched row button that opens the detail remains.
      expect(wrapper.findAll('button')).toHaveLength(1);
    });

    it('shows settled badge when share is paid', async () => {
      const share = createMockExpenseShare({
        user_id: USER_ID,
        amount_due: 0,
        is_paid: true,
      });
      const wrapper = await mountSuspended(ExpenseCardRow, {
        props: {
          expense: makeExpense({ shares: [share], created_by: OTHER_ID }),
          currentUserId: USER_ID,
        },
        global: G,
      });
      expect(wrapper.text()).toContain('expenses.card.settled');
    });

    it('shows pending badge when share is unpaid and not creator', async () => {
      const share = createMockExpenseShare({
        user_id: USER_ID,
        amount_due: 50,
        is_paid: false,
      });
      const wrapper = await mountSuspended(ExpenseCardRow, {
        props: {
          expense: makeExpense({ shares: [share], created_by: OTHER_ID }),
          currentUserId: USER_ID,
        },
        global: G,
      });
      expect(wrapper.text()).toContain('expenses.status.pending');
    });

    it('says the expense is not in your split when you have no share', async () => {
      const wrapper = await mountSuspended(ExpenseCardRow, {
        props: {
          expense: makeExpense({ shares: [] }),
          currentUserId: USER_ID,
        },
        global: G,
      });
      expect(wrapper.text()).toContain('expenses.card.notInSplit');
    });

    it('shows your share bold with the total underneath', async () => {
      const share = createMockExpenseShare({
        user_id: USER_ID,
        amount_due: 25,
        is_paid: false,
      });
      const wrapper = await mountSuspended(ExpenseCardRow, {
        props: {
          expense: makeExpense({ shares: [share] }),
          currentUserId: USER_ID,
        },
        global: G,
      });
      expect(wrapper.text()).toContain('expenses.card.ofTotal');
    });

    it('leads with what you paid and what you are owed when you are the payer', async () => {
      const shares = [
        createMockExpenseShare({
          user_id: USER_ID,
          amount_due: 50,
          is_paid: true,
        }),
        createMockExpenseShare({
          user_id: OTHER_ID,
          amount_due: 50,
          is_paid: false,
        }),
      ];
      const wrapper = await mountSuspended(ExpenseCardRow, {
        props: {
          expense: makeExpense({
            created_by: USER_ID,
            payer: {
              id: USER_ID,
              first_name: 'Me',
              last_name: 'X',
              email: 'm@x.com',
            },
            shares,
          }),
          currentUserId: USER_ID,
        },
        global: G,
      });
      expect(wrapper.text()).toContain('expenses.card.youPaidAmount');
      expect(wrapper.text()).toContain('expenses.card.owedToYou');
      expect(wrapper.text()).toContain('expenses.status.pending');
    });

    it('hides settle button for creator even with unpaid share', async () => {
      const share = createMockExpenseShare({
        user_id: USER_ID,
        amount_due: 50,
        is_paid: false,
      });
      const wrapper = await mountSuspended(ExpenseCardRow, {
        props: {
          expense: makeExpense({ shares: [share], created_by: USER_ID }),
          currentUserId: USER_ID,
        },
        global: G,
      });
      expect(wrapper.findAll('.ui-btn').length).toBe(0);
    });
  });

  describe('no share for current user', () => {
    it('shows no settle button when user has no share', async () => {
      const share = createMockExpenseShare({
        user_id: OTHER_ID,
        amount_due: 50,
        is_paid: false,
      });
      const wrapper = await mountSuspended(ExpenseCardRow, {
        props: {
          expense: makeExpense({ shares: [share], created_by: OTHER_ID }),
          currentUserId: USER_ID,
        },
        global: G,
      });
      expect(wrapper.findAll('.ui-btn').length).toBe(0);
    });
  });
});
