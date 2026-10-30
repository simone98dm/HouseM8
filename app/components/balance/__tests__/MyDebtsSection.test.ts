import { describe, it, expect, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import BalanceMyDebtsSection from '~/components/balance/BalanceMyDebtsSection.vue';
import type { SettlementTransaction } from '~/types/composables/balance';

vi.mock('~/composables/useCurrency', () => ({
  useCurrency: () => ({
    formatAmount: (n: number, _c: string) => `€${n.toFixed(2)}`,
  }),
}));

const G = {
  mocks: {
    $t: (k: string, p?: Record<string, string | number>) => {
      if (p)
        return Object.entries(p).reduce(
          (s, [key, val]) => s.replace(`{${key}}`, String(val)),
          k,
        );
      return k;
    },
  },
  stubs: { Icon: true, BalanceSettlementRow: true },
};

const mockTx: SettlementTransaction = {
  from_user_id: 'user-me',
  to_user_id: 'user-marco',
  amount: 8.5,
  from_user: { id: 'user-me', first_name: 'Me', last_name: 'User' },
  to_user: { id: 'user-marco', first_name: 'Marco', last_name: 'L' },
};

describe('BalanceMyDebtsSection', () => {
  it('renders without errors', async () => {
    const wrapper = await mountSuspended(BalanceMyDebtsSection, {
      props: { transactions: [], currency: 'EUR', processingKey: null },
      global: G,
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('shows empty-state element when transactions is empty', async () => {
    const wrapper = await mountSuspended(BalanceMyDebtsSection, {
      props: { transactions: [], currency: 'EUR', processingKey: null },
      global: G,
    });
    expect(wrapper.text()).toContain('balance.noDebts');
  });

  it('hides empty-state when transactions exist', async () => {
    const wrapper = await mountSuspended(BalanceMyDebtsSection, {
      props: { transactions: [mockTx], currency: 'EUR', processingKey: null },
      global: G,
    });
    expect(wrapper.find('ul').exists()).toBe(true);
  });

  it('renders one BalanceSettlementRow per transaction', async () => {
    const wrapper = await mountSuspended(BalanceMyDebtsSection, {
      props: {
        transactions: [
          mockTx,
          {
            ...mockTx,
            to_user_id: 'user-sara',
            to_user: { id: 'user-sara', first_name: 'Sara', last_name: 'A' },
          },
        ],
        currency: 'EUR',
        processingKey: null,
      },
      global: G,
    });
    expect(
      wrapper.findAllComponents({ name: 'BalanceSettlementRow' }),
    ).toHaveLength(2);
  });

  it('emits settle when row fires mark-paid', async () => {
    const wrapper = await mountSuspended(BalanceMyDebtsSection, {
      props: { transactions: [mockTx], currency: 'EUR', processingKey: null },
      global: G,
    });
    await wrapper
      .findComponent({ name: 'BalanceSettlementRow' })
      .vm.$emit('mark-paid', mockTx);
    expect(wrapper.emitted('settle')).toBeTruthy();
    expect(wrapper.emitted('settle')?.[0]).toEqual([mockTx]);
  });

  it('section has aria-labelledby pointing to an existing heading id', async () => {
    const wrapper = await mountSuspended(BalanceMyDebtsSection, {
      props: { transactions: [], currency: 'EUR', processingKey: null },
      global: G,
    });
    const section = wrapper.find('section');
    const labelId = section.attributes('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(wrapper.find(`#${labelId}`).exists()).toBe(true);
  });

  it('passes loading=true to the row whose key matches processingKey', async () => {
    const wrapper = await mountSuspended(BalanceMyDebtsSection, {
      props: {
        transactions: [mockTx],
        currency: 'EUR',
        processingKey: 'user-me-user-marco',
      },
      global: G,
    });
    const row = wrapper.findComponent({ name: 'BalanceSettlementRow' });
    expect(row.props('loading')).toBe(true);
  });

  it('passes loading=false to row when processingKey does not match', async () => {
    const wrapper = await mountSuspended(BalanceMyDebtsSection, {
      props: {
        transactions: [mockTx],
        currency: 'EUR',
        processingKey: 'other-user-other',
      },
      global: G,
    });
    const row = wrapper.findComponent({ name: 'BalanceSettlementRow' });
    expect(row.props('loading')).toBe(false);
  });

  it('credits variant uses the "coming to you" heading', async () => {
    const wrapper = await mountSuspended(BalanceMyDebtsSection, {
      props: {
        transactions: [mockTx],
        currency: 'EUR',
        processingKey: null,
        variant: 'credits',
      },
      global: G,
    });
    expect(wrapper.text()).toContain('balance.comingToYou');
    expect(wrapper.text()).not.toContain('balance.myDebts');
  });
});
