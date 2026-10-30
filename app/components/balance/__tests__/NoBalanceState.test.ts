import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import NoBalanceState from '~/components/balance/NoBalanceState.vue';

const G = {
  mocks: { $t: (k: string) => k },
  stubs: { Icon: true, UiButton: true },
};

describe('NoBalanceState', () => {
  it('renders', async () => {
    const wrapper = await mountSuspended(NoBalanceState, { global: G });
    expect(wrapper.exists()).toBe(true);
  });

  it('shows noBalanceData title key', async () => {
    const wrapper = await mountSuspended(NoBalanceState, { global: G });
    expect(wrapper.text()).toContain('balance.noBalanceData');
  });

  it('shows noBalanceDataDesc description key', async () => {
    const wrapper = await mountSuspended(NoBalanceState, { global: G });
    expect(wrapper.text()).toContain('balance.noBalanceDataDesc');
  });
});
