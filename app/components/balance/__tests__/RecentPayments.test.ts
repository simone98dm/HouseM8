import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import RecentPayments from '~/components/balance/RecentPayments.vue';
import type { RecentPayment } from '~/types/composables/balance';

const person = (id: string, first_name: string) => ({ id, first_name });
const pay = (over: Partial<RecentPayment> = {}): RecentPayment => ({
  id: 'p1',
  from_user: person('me', 'Me'),
  to_user: person('marco', 'Marco'),
  amount: 47,
  kind: 'settlement',
  created_at: '2026-10-28T10:00:00Z',
  undone_at: null,
  can_undo: true,
  ...over,
});

const mount = (payments: RecentPayment[]) =>
  mountSuspended(RecentPayments, {
    props: { payments, currency: 'EUR', currentUserId: 'me' },
    global: { stubs: { Icon: true } },
  });

describe('RecentPayments', () => {
  it('has an h2 and phrases rows from the viewer side', async () => {
    const w = await mount([
      pay(),
      pay({
        id: 'p2',
        from_user: person('anna', 'Anna'),
        to_user: person('me', 'Me'),
        amount: 12,
        can_undo: false,
      }),
    ]);
    expect(w.find('h2').exists()).toBe(true);
    expect(w.text()).toContain('You paid Marco');
    expect(w.text()).toContain('Anna paid you');
  });

  it('offers Undo while can_undo and emits the payment', async () => {
    const w = await mount([pay(), pay({ id: 'p2', can_undo: false })]);
    const buttons = w.findAll('button');
    expect(buttons).toHaveLength(1);
    await buttons[0]!.trigger('click');
    expect(w.emitted('undo')![0]).toEqual([
      expect.objectContaining({ id: 'p1' }),
    ]);
  });

  it('collapses undone payments under "Show undone (n)" without an Undo button', async () => {
    const w = await mount([
      pay({ id: 'p2', can_undo: false }),
      pay({ undone_at: '2026-10-28T11:00:00Z', can_undo: false }),
    ]);
    const details = w.find('details');
    expect(details.find('summary').text()).toBe('Show undone (1)');
    expect(details.attributes('open')).toBeUndefined();
    expect(details.text()).toContain('Undone');
    expect(w.find('button').exists()).toBe(false);
    expect(w.findAll('ul')[0]!.findAll('li')).toHaveLength(1);
  });

  it('says so when there are no payments', async () => {
    const w = await mount([]);
    expect(w.text()).toContain('No payments recorded yet');
  });
});
