import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import CostInfo from '~/components/bill/CostInfo.vue';

const G = { mocks: { $t: (k: string) => k }, stubs: { UiCurrency: true } };

const baseProps = {
  monthlyCost: 50,
  currency: 'EUR',
  costPeriodLabel: 'per month',
  totalCostLabel: 'Total annual',
  totalCost: 600,
  periodLabel: '12 months',
};

describe('CostInfo', () => {
  it('renders', async () => {
    const wrapper = await mountSuspended(CostInfo, {
      props: baseProps,
      global: G,
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('shows costPeriodLabel', async () => {
    const wrapper = await mountSuspended(CostInfo, {
      props: baseProps,
      global: G,
    });
    expect(wrapper.text()).toContain('per month');
  });

  it('shows totalCostLabel', async () => {
    const wrapper = await mountSuspended(CostInfo, {
      props: baseProps,
      global: G,
    });
    expect(wrapper.text()).toContain('Total annual');
  });

  it('shows periodLabel', async () => {
    const wrapper = await mountSuspended(CostInfo, {
      props: baseProps,
      global: G,
    });
    expect(wrapper.text()).toContain('12 months');
  });

  it('shows bills.details.costPerPeriod i18n key label', async () => {
    const wrapper = await mountSuspended(CostInfo, {
      props: baseProps,
      global: G,
    });
    expect(wrapper.text()).toContain('bills.details.costPerPeriod');
  });
});
