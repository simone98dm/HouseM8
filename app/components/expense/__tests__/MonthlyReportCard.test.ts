import { describe, it, expect, vi } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import MonthlyReportCard from '~/components/expense/MonthlyReportCard.vue';

const flags = vi.hoisted(() => ({ stripe: false }));
mockNuxtImport('useFeatureFlags', () => () => ({
  isEnabled: () => flags.stripe,
}));

describe('ExpenseMonthlyReportCard', () => {
  it('renders nothing when Stripe is off (no empty card)', async () => {
    flags.stripe = false;
    const wrapper = await mountSuspended(MonthlyReportCard, {
      props: { houseId: 'h1' },
    });
    expect(wrapper.find('h2').exists()).toBe(false);
  });

  it('renders the card with UiSelect pickers when Stripe is on', async () => {
    flags.stripe = true;
    const wrapper = await mountSuspended(MonthlyReportCard, {
      props: { houseId: 'h1' },
      global: {
        stubs: { SubscriptionPlanGate: { template: '<div><slot /></div>' } },
      },
    });
    expect(wrapper.find('h2').exists()).toBe(true);
    expect(wrapper.findAll('select')).toHaveLength(2);
  });
});
