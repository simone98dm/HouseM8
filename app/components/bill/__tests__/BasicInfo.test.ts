import { describe, it, expect, vi } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import BasicInfo from '~/components/bill/BasicInfo.vue';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

// getDaysUntilDue is mutable per-test so the overdue-vs-due-soon distinction
// (BUG 4) can be exercised without re-declaring the whole mock.
const getDaysUntilDue = vi.fn(() => 5);

mockNuxtImport('useBillDetails', () => () => ({
  formatDate: (d: string) => d,
  getDaysUntilDue,
  getDayOfMonth: () => 1,
  getCostPeriodLabel: () => 'per month',
  getTotalCostLabel: () => 'Total',
  calculateTotalCost: (cost: number) => cost,
  getPeriodLabel: () => '1 month',
  getContractDuration: () => '1 year',
  getTotalPayments: () => 12,
  getTotalAmountPaid: () => 600,
}));

const G = {
  mocks: { $t: (k: string) => k },
  stubs: {
    Icon: true,
    UiCard: { template: '<div><slot /><slot name="header" /></div>' },
    UiCurrency: true,
    BillStatusBadge: true,
    BillCostInfo: true,
  },
};

const mockBill = {
  id: 'b-1',
  house_id: 'h-1',
  description: 'Internet Bill',
  monthly_cost: 50,
  payment_period: 1,
  next_due_date: '2025-06-01',
  created_by: 'u-1',
  active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  currency: 'EUR',
};

describe('BasicInfo', () => {
  it('renders', async () => {
    const wrapper = await mountSuspended(BasicInfo, {
      props: { bill: mockBill },
      global: G,
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('shows bill description', async () => {
    const wrapper = await mountSuspended(BasicInfo, {
      props: { bill: mockBill },
      global: G,
    });
    expect(wrapper.text()).toContain('Internet Bill');
  });

  it('applies warning class when daysUntilDue <= 7', async () => {
    getDaysUntilDue.mockReturnValue(5);
    const wrapper = await mountSuspended(BasicInfo, {
      props: { bill: mockBill },
      global: G,
    });
    expect(wrapper.html()).toContain('text-warn-fg');
  });

  it('renders overdue bills with a distinct style from due-today, not the warning color', async () => {
    getDaysUntilDue.mockReturnValue(-3);
    const overdueWrapper = await mountSuspended(BasicInfo, {
      props: { bill: mockBill },
      global: G,
    });
    expect(overdueWrapper.html()).toContain('text-danger-fg');
    expect(overdueWrapper.html()).not.toContain('text-warn-fg');
    expect(overdueWrapper.text()).toContain('bills.overdue');

    getDaysUntilDue.mockReturnValue(0);
    const dueTodayWrapper = await mountSuspended(BasicInfo, {
      props: { bill: mockBill },
      global: G,
    });
    expect(dueTodayWrapper.html()).toContain('text-warn-fg');
    expect(dueTodayWrapper.html()).not.toContain('text-danger-fg');
  });
});
