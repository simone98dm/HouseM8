import { describe, it, expect } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import ContractInfo from '~/components/bill/ContractInfo.vue';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
  locale: { value: 'en' },
}));

mockNuxtImport('useBillDetails', () => () => ({
  formatDate: (d: string) => d,
  getContractDuration: () => '1 year',
  getTotalPayments: () => 12,
  getTotalAmountPaid: () => 600,
  getDaysUntilDue: () => 10,
  getDayOfMonth: () => 1,
  getCostPeriodLabel: () => 'per month',
  getTotalCostLabel: () => 'Total',
  calculateTotalCost: (cost: number) => cost,
  getPeriodLabel: () => '1 month',
}));

const G = {
  mocks: { $t: (k: string) => k },
  stubs: {
    Icon: true,
    UiCard: { template: '<div><slot /><slot name="header" /></div>' },
    UiCurrency: true,
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
  creator: {
    id: 'u-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'j@d.com',
  },
};

describe('ContractInfo', () => {
  it('renders', async () => {
    const wrapper = await mountSuspended(ContractInfo, {
      props: { bill: mockBill },
      global: G,
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('shows contractDetails i18n key', async () => {
    const wrapper = await mountSuspended(ContractInfo, {
      props: { bill: mockBill },
      global: G,
    });
    expect(wrapper.text()).toContain('bills.details.contractDetails');
  });

  it('shows creator first name', async () => {
    const wrapper = await mountSuspended(ContractInfo, {
      props: { bill: mockBill },
      global: G,
    });
    expect(wrapper.text()).toContain('John');
  });
});
