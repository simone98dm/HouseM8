/**
 * Bill Card Component Tests
 * Row rendered as <li>; the title link stretches over the whole row.
 */

import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import BillCard from '~/components/bill/Card.vue';
import { useHousesStore } from '~/stores/houses';
import { createMockBill } from '~/tests/utils';

const DAY_MS = 86_400_000;
const isoInDays = (days: number) =>
  new Date(Date.now() + days * DAY_MS).toISOString();

const mountCard = (overrides: Record<string, unknown> = {}) =>
  mountSuspended(BillCard, {
    props: {
      bill: createMockBill({
        id: 'bill-123',
        description: 'Electricity Bill',
        monthly_cost: 150.5,
        currency: 'USD',
        payment_period: 1,
        next_due_date: isoInDays(30),
        ...overrides,
      }),
    },
  });

describe('Bill Card', () => {
  it('renders as a list item', async () => {
    const wrapper = await mountCard();
    expect(wrapper.find('li').exists()).toBe(true);
  });

  it('links the title to the bill detail page and stretches over the row', async () => {
    const wrapper = await mountCard();
    const link = wrapper.find('a');
    expect(link.attributes('href')).toBe('/bills/bill-123');
    expect(link.text()).toBe('Electricity Bill');
    expect(link.classes()).toEqual(
      expect.arrayContaining(['after:absolute', 'after:inset-0']),
    );
    expect(wrapper.findAll('a').length).toBe(1);
  });

  it('renders the amount with the numeric style', async () => {
    const wrapper = await mountCard();
    const amount = wrapper.find('.text-numeric');
    expect(amount.exists()).toBe(true);
    expect(amount.text()).toMatch(/150/);
  });

  it('leads with your share and mutes the total below', async () => {
    useHousesStore().members = [{}, {}, {}, { left_at: '2026-01-01' }] as never;
    const wrapper = await mountCard({ monthly_cost: 100, currency: 'EUR' });
    const share = wrapper.find('.text-numeric.font-semibold');
    expect(share.text()).toMatch(/33[.,]34/);
    expect(wrapper.text()).toMatch(/100/);
    expect(wrapper.text()).toContain('of');
    useHousesStore().members = [];
  });

  it('renders a decorative bill icon', async () => {
    const wrapper = await mountCard();
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true);
  });

  describe('due status', () => {
    it('shows a danger badge with the word "Overdue" for past due dates', async () => {
      const wrapper = await mountCard({ next_due_date: isoInDays(-3) });
      const badge = wrapper.find('.badge-danger');
      expect(badge.exists()).toBe(true);
      expect(badge.text()).toBe('Overdue');
      expect(wrapper.find('.badge-warning').exists()).toBe(false);
    });

    it('shows a warning badge with the words "Due soon" within 7 days', async () => {
      const wrapper = await mountCard({ next_due_date: isoInDays(3) });
      const badge = wrapper.find('.badge-warning');
      expect(badge.exists()).toBe(true);
      expect(badge.text()).toBe('Due soon');
      expect(wrapper.find('.badge-danger').exists()).toBe(false);
    });

    it('shows no badge and "per month" for bills due later', async () => {
      const wrapper = await mountCard({ next_due_date: isoInDays(30) });
      expect(wrapper.find('.badge').exists()).toBe(false);
      expect(wrapper.text()).toContain('per month');
    });

    it('colours the due text by status', async () => {
      const overdue = await mountCard({ next_due_date: isoInDays(-3) });
      const soon = await mountCard({ next_due_date: isoInDays(3) });
      const later = await mountCard({ next_due_date: isoInDays(30) });
      expect(overdue.find('.text-danger-fg').text()).toBe('overdue by 3 days');
      expect(soon.find('.text-warn-fg').text()).toBe('in 3 days');
      expect(later.find('.text-fg-muted').exists()).toBe(true);
    });
  });

  describe('payment period', () => {
    it('hides the period when it is 1', async () => {
      const wrapper = await mountCard({ payment_period: 1 });
      expect(wrapper.text()).not.toMatch(/Every \d+ months/);
    });

    it('shows "Every N months" when the period is greater than 1', async () => {
      const wrapper = await mountCard({ payment_period: 3 });
      expect(wrapper.text()).toContain('Every 3 months');
    });
  });
});
