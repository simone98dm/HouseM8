import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { createMockBill } from '~/tests/utils';
import YourMonthCard from '~/components/dashboard/YourMonthCard.vue';

const tx = {
  from_user_id: 'u-2',
  to_user_id: 'u-1',
  amount: 10.99,
  from_user: { id: 'u-2', first_name: 'Silvia', last_name: '' },
  to_user: { id: 'u-1', first_name: 'Simone', last_name: '' },
};

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const mount = (props: Record<string, unknown> = {}) =>
  mountSuspended(YourMonthCard, {
    props: {
      month: { bills: 33.5, shared: 14.99, total: 48.49 },
      currency: 'EUR',
      headline: {
        sentence: 'Silvia owes you €10.99',
        parts: [
          { text: '', tone: undefined },
          { text: 'Silvia owes you €10.99' },
        ].slice(1),
        action: null,
      },
      action: { kind: 'settle', label: 'Mark as received', tx, isCredit: true },
      nextBill: createMockBill({
        id: 'b-1',
        description: 'Affitto',
        next_due_date: tomorrow(),
      }),
      ...props,
    },
    global: { stubs: { Icon: true } },
  });

describe('DashboardYourMonthCard', () => {
  it('leads with whom to pay, then the month as labelled facts', async () => {
    const w = await mount();
    expect(w.find('h2').text()).toBe('Your month');
    // The balance sentence comes before the month's figures.
    const text = w.text();
    expect(text.indexOf('Silvia owes you')).toBeLessThan(text.indexOf('48.49'));
    const facts = w.findAll('dl > div').map((d) => ({
      label: d.find('dt').text(),
      value: d.find('dd').text(),
    }));
    expect(facts.map((f) => f.label)).toEqual([
      'Your part this month',
      'Bills',
      'Split expenses',
    ]);
    expect(facts[0]!.value).toContain('48.49');
    expect(facts[1]!.value).toContain('33.50');
    expect(facts[2]!.value).toContain('14.99');
    // No oversized hero number, no mid-number wrapping.
    expect(w.find('.text-5xl').exists()).toBe(false);
    expect(w.find('.break-all').exists()).toBe(false);
  });

  it('shows the balance sentence with its single settle action', async () => {
    const w = await mount();
    expect(w.text()).toContain('Silvia owes you');
    const button = w
      .findAll('button')
      .find((b) => b.text() === 'Mark as received');
    expect(button).toBeDefined();
    await button!.trigger('click');
    expect(w.emitted('settle')?.[0]).toEqual([tx]);
  });

  it('links to the balance page when several people are involved', async () => {
    const w = await mount({
      action: { kind: 'link', label: 'Pay back', to: '/balance' },
    });
    expect(w.find('a[href="/balance"]').text()).toBe('Pay back');
    expect(w.findAll('button')).toHaveLength(0);
  });

  it('names the next bill with relative wording', async () => {
    const w = await mount();
    expect(w.text()).toContain('Next:');
    expect(w.find('a[href="/bills/b-1"]').text()).toBe('Affitto');
    expect(w.text()).toContain('tomorrow');
  });

  it('says so instead of claiming settled when the balance failed', async () => {
    const w = await mount({
      isBalanceAvailable: false,
      action: null,
      nextBill: null,
    });
    expect(w.text()).toContain("Couldn't load the balance");
    expect(w.text()).not.toContain('Next:');
  });

  it('uses no uppercase or tracked labels', async () => {
    const w = await mount();
    expect(w.html()).not.toMatch(/uppercase|tracking-wide/);
  });
});
