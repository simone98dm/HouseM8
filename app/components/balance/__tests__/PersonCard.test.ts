import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import PersonCard from '~/components/balance/PersonCard.vue';

const G = { mocks: { $t: (k: string) => k }, stubs: { Icon: true } };

// Mirrors the client-side UserBalance shape, which is what
// server/api/balance/[house_id].get.ts actually sends: the repository's
// `total_owed_to_user` is aliased to `total_paid` on the way out.
const mockBalance = {
  user_id: 'u-1',
  user: { id: 'u-1', first_name: 'John', last_name: 'Doe', email: 'j@d.com' },
  total_paid: 100,
  total_owed: 50,
  net_balance: 50,
};

const baseProps = {
  balance: mockBalance,
  currency: 'USD' as const,
  formattedNetBalance: '$50.00',
};

describe('PersonCard', () => {
  it('renders', async () => {
    const wrapper = await mountSuspended(PersonCard, {
      props: baseProps,
      global: G,
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('shows the person Blobatar avatar', async () => {
    const wrapper = await mountSuspended(PersonCard, {
      props: baseProps,
      global: G,
    });
    expect(wrapper.find('img[src^="data:image/svg+xml"]').exists()).toBe(true);
  });

  it('shows the user full name', async () => {
    const wrapper = await mountSuspended(PersonCard, {
      props: baseProps,
      global: G,
    });
    expect(wrapper.text()).toContain('John');
    expect(wrapper.text()).toContain('Doe');
  });

  it('shows the formatted net balance', async () => {
    const wrapper = await mountSuspended(PersonCard, {
      props: baseProps,
      global: G,
    });
    expect(wrapper.text()).toContain('$50.00');
  });

  it('keeps the amount in neutral ink when owed to them', async () => {
    const wrapper = await mountSuspended(PersonCard, {
      props: baseProps,
      global: G,
    });
    expect(wrapper.html()).not.toContain('text-ok-fg');
    expect(wrapper.html()).toContain('text-fg');
  });

  it('never uses danger ink for a person who owes', async () => {
    const negativeBalance = { ...mockBalance, net_balance: -50 };
    const wrapper = await mountSuspended(PersonCard, {
      props: { ...baseProps, balance: negativeBalance },
      global: G,
    });
    expect(wrapper.html()).not.toContain('text-danger-fg');
    expect(wrapper.text()).toContain('balance.owes');
  });

  it('shows text-fg-muted class when net_balance is within ±0.01 (even)', async () => {
    const evenBalance = { ...mockBalance, net_balance: 0 };
    const wrapper = await mountSuspended(PersonCard, {
      props: { ...baseProps, balance: evenBalance },
      global: G,
    });
    expect(wrapper.html()).toContain('text-fg-muted');
  });

  it('shows balance.isOwed label when net_balance > 0.01', async () => {
    const wrapper = await mountSuspended(PersonCard, {
      props: baseProps,
      global: G,
    });
    expect(wrapper.text()).toContain('balance.isOwed');
  });

  it('shows balance.owes label when net_balance < -0.01', async () => {
    const negativeBalance = { ...mockBalance, net_balance: -50 };
    const wrapper = await mountSuspended(PersonCard, {
      props: { ...baseProps, balance: negativeBalance },
      global: G,
    });
    expect(wrapper.text()).toContain('balance.owes');
  });

  it('shows balance.even label when net_balance is within ±0.01', async () => {
    const evenBalance = { ...mockBalance, net_balance: 0 };
    const wrapper = await mountSuspended(PersonCard, {
      props: { ...baseProps, balance: evenBalance },
      global: G,
    });
    expect(wrapper.text()).toContain('balance.even');
  });

  it('speaks to the viewer on their own row, never third person', async () => {
    const wrapper = await mountSuspended(PersonCard, {
      props: { ...baseProps, currentUserId: 'u-1' },
      global: G,
    });
    expect(wrapper.text()).toContain('balance.you');
    expect(wrapper.text()).not.toContain('John');
    expect(wrapper.text()).toContain('balance.youAreOwed');
  });
});
