import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import ActivityFeed from '~/components/dashboard/ActivityFeed.vue';
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
  can_undo: false,
  ...over,
});

const mount = (payments: RecentPayment[]) =>
  mountSuspended(ActivityFeed, {
    props: { payments, currency: 'EUR', currentUserId: 'me' },
    global: { stubs: { Icon: true } },
  });

describe('DashboardActivityFeed', () => {
  it('phrases each payment from the viewer side', async () => {
    const w = await mount([
      pay(),
      pay({
        id: 'p2',
        from_user: person('anna', 'Anna'),
        to_user: person('me', 'Me'),
        amount: 12,
      }),
      pay({
        id: 'p3',
        from_user: person('anna', 'Anna'),
        to_user: person('marco', 'Marco'),
        amount: 5,
      }),
    ]);
    expect(w.findAll('li')).toHaveLength(3);
    expect(w.text()).toContain('You paid Marco');
    expect(w.text()).toContain('Anna paid you');
    expect(w.text()).toContain('Anna paid Marco');
  });

  it('marks money in and out with distinct tones', async () => {
    const w = await mount([
      pay(),
      pay({
        id: 'p2',
        from_user: person('anna', 'Anna'),
        to_user: person('me', 'Me'),
      }),
    ]);
    expect(w.find('.bg-danger-subtle').exists()).toBe(true);
    expect(w.find('.bg-ok-subtle').exists()).toBe(true);
  });

  it('hides undone payments', async () => {
    const w = await mount([
      pay({ undone_at: '2026-10-28T11:00:00Z' }),
      pay({ id: 'p2' }),
    ]);
    expect(w.findAll('li')).toHaveLength(1);
    expect(w.text()).not.toContain('Undone');
  });

  it('exposes the payment time as a machine-readable datetime', async () => {
    const w = await mount([pay()]);
    expect(w.find('time').attributes('datetime')).toBe('2026-10-28T10:00:00Z');
  });

  it('says so when there are no payments', async () => {
    const w = await mount([]);
    expect(w.text()).toContain('No payments recorded yet');
    expect(w.find('li').exists()).toBe(false);
  });

  it('links "View all" to /balance under an h2', async () => {
    const w = await mount([]);
    expect(w.find('h2').text()).toBe('Recent activity');
    expect(w.find('a[href="/balance"]').exists()).toBe(true);
  });
});
