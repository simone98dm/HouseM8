import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { AttentionItem } from '~/composables/useDashboardPage';
import StatusLine from '~/components/dashboard/StatusLine.vue';

const mount = (items: AttentionItem[] | null) =>
  mountSuspended(StatusLine, {
    props: { items },
    global: { stubs: { Icon: true } },
  });

describe('DashboardStatusLine', () => {
  it('renders nothing for members and while signals load', async () => {
    const w = await mount(null);
    expect(w.find('section').exists()).toBe(false);
  });

  it('says "All in order" when nothing needs attention', async () => {
    const w = await mount([]);
    expect(w.text()).toBe('All in order');
  });

  it('counts the things and links each to its page', async () => {
    const w = await mount([
      { key: 'overdueBills', count: 2, to: '/bills' },
      { key: 'openReports', count: 1, to: '/reports' },
      { key: 'unsettled', count: 3, to: '/balance', amount: '€40.00' },
    ]);
    expect(w.text()).toContain('6 things need attention');
    expect(w.find('a[href="/bills"]').text()).toBe('2 overdue bills');
    expect(w.find('a[href="/reports"]').text()).toBe('1 open report');
    expect(w.find('a[href="/balance"]').text()).toContain(
      '€40.00 still to pay back',
    );
  });

  it('uses the singular for one thing', async () => {
    const w = await mount([{ key: 'openReports', count: 1, to: '/reports' }]);
    expect(w.text()).toContain('1 thing needs attention');
  });
});

describe('DashboardStatusLine — edge cases', () => {
  it('treats items that are all zero as all in order', async () => {
    const w = await mount([
      { key: 'overdueBills', count: 0, to: '/bills' },
      { key: 'openReports', count: 0, to: '/reports' },
    ]);
    expect(w.text()).toBe('All in order');
    expect(w.find('a').exists()).toBe(false);
  });

  it('still renders a link for a zero-count item next to non-zero ones', async () => {
    const w = await mount([
      { key: 'overdueBills', count: 2, to: '/bills' },
      { key: 'openReports', count: 0, to: '/reports' },
    ]);
    expect(w.text()).toContain('2 things need attention');
    expect(w.findAll('a')).toHaveLength(2);
  });

  it('labels the region for assistive tech', async () => {
    const w = await mount([]);
    expect(w.find('section').attributes('aria-label')).toBeTruthy();
  });
});
