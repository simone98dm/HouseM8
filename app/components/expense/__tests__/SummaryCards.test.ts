import { describe, it, expect } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import ExpenseSummaryCards from '~/components/expense/SummaryCards.vue';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string, params?: Record<string, string>) =>
    params ? `${key}:${params.owe}|${params.owed}` : key,
  locale: { value: 'en' },
}));

describe('ExpenseSummaryCards', () => {
  it('states what you owe and are owed in one sentence', async () => {
    const wrapper = await mountSuspended(ExpenseSummaryCards, {
      props: { totalOwed: 40, totalOwedToYou: 90 },
    });

    expect(wrapper.text()).toContain('expenses.summary.line');
    expect(wrapper.find('dl').exists()).toBe(false);
  });

  it('names only the non-zero side', async () => {
    const owe = await mountSuspended(ExpenseSummaryCards, {
      props: { totalOwed: 40, totalOwedToYou: 0 },
    });
    expect(owe.text()).toContain('expenses.summary.oweOnly');
    const owed = await mountSuspended(ExpenseSummaryCards, {
      props: { totalOwed: 0, totalOwedToYou: 90 },
    });
    expect(owed.text()).toContain('expenses.summary.owedOnly');
  });

  it('draws a hidden bar split by the two amounts', async () => {
    const wrapper = await mountSuspended(ExpenseSummaryCards, {
      props: { totalOwed: 25, totalOwedToYou: 75 },
    });

    const bar = wrapper.find('[aria-hidden="true"]');
    const widths = bar.findAll('span').map((s) => s.attributes('style'));
    expect(widths[0]).toContain('25%');
    expect(widths[1]).toContain('75%');
  });

  it('shows a calm line and no bar when nothing is open', async () => {
    const wrapper = await mountSuspended(ExpenseSummaryCards, {
      props: { totalOwed: 0, totalOwedToYou: 0 },
    });

    expect(wrapper.text()).toContain('expenses.summary.square');
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(false);
  });

  it('keeps the settle-up action from the shared headline', async () => {
    const wrapper = await mountSuspended(ExpenseSummaryCards, {
      props: {
        totalOwed: 10,
        totalOwedToYou: 0,
        headline: {
          sentence: 's',
          parts: [],
          action: { label: 'Settle up', to: '/balance' },
        },
      },
    });

    expect(wrapper.find('a[href="/balance"]').text()).toBe('Settle up');
  });
});
