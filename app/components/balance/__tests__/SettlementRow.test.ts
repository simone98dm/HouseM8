import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import SettlementRow from '~/components/balance/SettlementRow.vue';

const G = {
  mocks: { $t: (k: string) => k },
  stubs: { Icon: true, UiButton: true },
};

const mockTransaction = {
  from_user_id: 'u-2',
  to_user_id: 'u-1',
  amount: 50,
  from_user: {
    id: 'u-2',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'j@s.com',
  },
  to_user: {
    id: 'u-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'j@d.com',
  },
};

const baseProps = {
  transaction: mockTransaction,
  formattedAmount: '$50.00',
  loading: false,
};

describe('SettlementRow', () => {
  it('renders', async () => {
    const wrapper = await mountSuspended(SettlementRow, {
      props: baseProps,
      global: G,
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('renders a plain li row with no nested card chrome', async () => {
    const wrapper = await mountSuspended(SettlementRow, {
      props: baseProps,
      global: G,
    });
    expect(wrapper.element.tagName).toBe('LI');
    expect(wrapper.html()).not.toContain('bg-gray-50');
  });

  it('always labels the button "Mark paid" with the amount as row text', async () => {
    const wrapper = await mountSuspended(SettlementRow, {
      props: baseProps,
      global: G,
    });
    const button = wrapper.findComponent({ name: 'UiButton' });
    expect(button.attributes('aria-label')).toMatch(/^balance\.markPaid/);
    expect(wrapper.text()).toContain('$50.00');
  });

  it('shows a you-and-them pair: two avatars and an arrow', async () => {
    const wrapper = await mountSuspended(SettlementRow, {
      props: baseProps,
      global: G,
    });
    expect(
      wrapper.findAll('img[src^="data:image/svg+xml"]').length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('the creditor gets "Mark as received", the debtor "Mark paid"', async () => {
    const credit = await mountSuspended(SettlementRow, {
      props: { ...baseProps, currentUserId: 'u-1' },
      global: G,
    });
    expect(
      credit.findComponent({ name: 'UiButton' }).attributes('aria-label'),
    ).toMatch(/^balance\.markReceived/);
    const debt = await mountSuspended(SettlementRow, {
      props: { ...baseProps, currentUserId: 'u-2' },
      global: G,
    });
    expect(
      debt.findComponent({ name: 'UiButton' }).attributes('aria-label'),
    ).toMatch(/^balance\.markPaid/);
  });

  it('shows an avatar', async () => {
    const wrapper = await mountSuspended(SettlementRow, {
      props: baseProps,
      global: G,
    });
    expect(wrapper.find('img[src^="data:image/svg+xml"]').exists()).toBe(true);
  });

  it('shows from_user first name', async () => {
    const wrapper = await mountSuspended(SettlementRow, {
      props: baseProps,
      global: G,
    });
    expect(wrapper.text()).toContain('Jane');
  });

  it('shows to_user first name', async () => {
    const wrapper = await mountSuspended(SettlementRow, {
      props: baseProps,
      global: G,
    });
    expect(wrapper.text()).toContain('John');
  });

  it('shows formattedAmount', async () => {
    const wrapper = await mountSuspended(SettlementRow, {
      props: baseProps,
      global: G,
    });
    expect(wrapper.text()).toContain('$50.00');
  });

  it('emits markPaid with the transaction when UiButton is clicked', async () => {
    const wrapper = await mountSuspended(SettlementRow, {
      props: baseProps,
      global: G,
    });
    await wrapper.findComponent({ name: 'UiButton' }).trigger('click');
    expect(wrapper.emitted('markPaid')).toBeTruthy();
    expect(wrapper.emitted('markPaid')![0]).toEqual([mockTransaction]);
  });

  describe('due date', () => {
    const day = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const p = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    };
    const mountWith = (due_date: string | null) =>
      mountSuspended(SettlementRow, {
        props: { ...baseProps, transaction: { ...mockTransaction, due_date } },
        global: G,
      });

    it('shows nothing when the transfer has no date', async () => {
      const wrapper = await mountWith(null);
      expect(wrapper.text()).not.toContain('balance.due');
    });

    it('shows an upcoming date as secondary text', async () => {
      const wrapper = await mountWith(day(4));
      expect(wrapper.text()).toContain('balance.dueBy');
    });

    it('shows a past date as overdue', async () => {
      const wrapper = await mountWith(day(-2));
      expect(wrapper.text()).toContain('balance.dueOverdue');
    });
  });

  it('words the row from the viewer side, never with their own name', async () => {
    const mine = await mountSuspended(SettlementRow, {
      props: { ...baseProps, currentUserId: 'u-2' },
      global: {
        ...G,
        mocks: { $t: (k: string, p?: { name: string }) => `${k}:${p?.name}` },
      },
    });
    expect(mine.text()).toContain('balance.youOwe:John');
    expect(mine.text()).not.toContain('Jane');

    const theirs = await mountSuspended(SettlementRow, {
      props: { ...baseProps, currentUserId: 'u-1' },
      global: {
        ...G,
        mocks: { $t: (k: string, p?: { name: string }) => `${k}:${p?.name}` },
      },
    });
    expect(theirs.text()).toContain('balance.owesYou:Jane');
  });
});
