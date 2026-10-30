/**
 * BillsPreview Component Tests
 */

import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import BillsPreview from '~/components/house/BillsPreview.vue';
import { useHousesStore } from '~/stores/houses';
import { createMockBill } from '~/tests/utils';

const DAY_MS = 86_400_000;
// +12h keeps Math.ceil(diff/day) stable regardless of test timing
const isoInDays = (days: number) =>
  new Date(Date.now() + days * DAY_MS - DAY_MS / 2).toISOString();

const makeBills = () => [
  createMockBill({
    id: 'b1',
    description: 'Electricity',
    monthly_cost: 150.5,
    currency: 'USD',
    next_due_date: isoInDays(2),
  }),
  createMockBill({
    id: 'b2',
    description: 'Water',
    monthly_cost: 50,
    currency: 'USD',
    next_due_date: isoInDays(6),
  }),
  createMockBill({
    id: 'b3',
    description: 'Internet',
    monthly_cost: 45.99,
    currency: 'USD',
    next_due_date: isoInDays(20),
  }),
];

const mountPreview = (props: Record<string, unknown> = {}) =>
  mountSuspended(BillsPreview, { props: { bills: makeBills(), ...props } });

describe('House BillsPreview', () => {
  it('leads with your share and mutes the total below', async () => {
    useHousesStore().members = [{}, {}, { left_at: '2026-01-01' }] as never;
    const wrapper = await mountPreview();
    const row = wrapper.findAll('li')[1]!;
    expect(row.find('.font-semibold').text()).toMatch(/25/);
    expect(row.text()).toMatch(/of.*50/);
    useHousesStore().members = [];
  });

  it('renders the card title and a "View all" action', async () => {
    const wrapper = await mountPreview();
    expect(wrapper.text()).toContain('Upcoming bills');
    const viewAll = wrapper
      .findAll('a')
      .find((a) => a.text().startsWith('View all'));
    expect(viewAll).toBeDefined();
  });

  it('links the view-all action to /bills', async () => {
    const wrapper = await mountPreview();
    const viewAll = wrapper
      .findAll('a')
      .find((a) => a.text().startsWith('View all'))!;
    expect(viewAll.attributes('href')).toBe('/bills');
  });

  it('renders one row per bill with description and amount', async () => {
    const wrapper = await mountPreview();
    const rows = wrapper.findAll('li');
    expect(rows).toHaveLength(3);
    expect(rows[0]!.text()).toContain('Electricity');
    expect(rows[0]!.find('.text-numeric').text()).toMatch(/150/);
  });

  it('shows relative due wording and a monthly hint on every row', async () => {
    const wrapper = await mountPreview();
    for (const row of wrapper.findAll('li')) {
      expect(row.text()).toMatch(/today|tomorrow|in \d+ days/);
      expect(row.text()).toMatch(/monthly/i);
    }
  });

  it('says "every N months" when the bill is not monthly', async () => {
    const wrapper = await mountPreview({
      bills: [
        createMockBill({
          id: 'b9',
          description: 'Insurance',
          payment_period: 6,
          next_due_date: isoInDays(3),
        }),
      ],
    });
    const text = wrapper.find('li').text();
    expect(text).toContain('Every 6 months');
    expect(text).not.toMatch(/monthly/i);
  });

  it('uses a decorative heroicon, never an emoji, for the row icon', async () => {
    const wrapper = await mountPreview();
    const row = wrapper.find('li');
    expect(row.find('[aria-hidden="true"]').exists()).toBe(true);
    expect(row.text()).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('uses the same status word as Bills: "Due soon" within a week, none later', async () => {
    const wrapper = await mountPreview();
    const rows = wrapper.findAll('li');
    for (const row of rows.slice(0, 2)) {
      expect(row.find('.badge').classes()).toContain('badge-warning');
      expect(row.find('.badge').text()).toBe('Due soon');
    }
    expect(rows[2]!.find('.badge').exists()).toBe(false);
    expect(rows[2]!.text()).toMatch(/in (19|20) days/);
  });

  it('labels past-due bills "Overdue"', async () => {
    const wrapper = await mountPreview({
      bills: [
        createMockBill({
          id: 'old',
          description: 'Old',
          next_due_date: isoInDays(-5),
        }),
      ],
    });
    expect(wrapper.find('li .badge').text()).toBe('Overdue');
  });

  it('limits rows to maxVisible and shows a "+N more" link', async () => {
    const wrapper = await mountPreview({ maxVisible: 2 });
    expect(wrapper.findAll('li')).toHaveLength(2);
    const more = wrapper.findAll('a').find((a) => a.text().startsWith('+1'));
    expect(more).toBeDefined();
    expect(more!.attributes('href')).toBe('/bills');
  });

  it('shows no "+N more" button when everything fits', async () => {
    const wrapper = await mountPreview({ maxVisible: 5 });
    expect(wrapper.text()).not.toMatch(/\+\d/);
  });

  it('shows the empty message and no list when there are no bills', async () => {
    const wrapper = await mountPreview({ bills: [] });
    expect(wrapper.find('ul').exists()).toBe(false);
    expect(wrapper.text()).toContain('No upcoming bills');
  });
});
