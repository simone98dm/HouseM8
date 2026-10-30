import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { defineComponent, ref, type Ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { useHouseSummary } from '~/composables/useHouseSummary';
import type { House } from '~/types';

const state = vi.hoisted(() => ({
  bills: { upcomingBills: [] as Record<string, unknown>[] },
  getHouseBalance: null as unknown as ReturnType<typeof vi.fn>,
}));

vi.mock('~/stores/bills', () => ({ useBillsStore: () => state.bills }));
vi.mock('~/composables/useBalance', () => ({
  useBalance: () => ({ getHouseBalance: state.getHouseBalance }),
}));

// Params are echoed so each part of the sentence can be asserted on.
mockNuxtImport('useI18n', () => () => ({
  t: (k: string, p?: Record<string, unknown>) =>
    p ? `${k}|${Object.values(p).join('|')}` : k,
  locale: { value: 'en' },
}));

const houseOf = (over: Partial<House> = {}) =>
  ({ id: 'h-1', name: 'Casa', max_members: 4, ...over }) as House;

const balanceOf = (amounts: number[]) => ({
  data: {
    currency: 'EUR',
    settlement_transactions: amounts.map((amount) => ({ amount })),
  },
  error: null,
});

async function setup(house: House | null, active = 3, canView = true) {
  const houseRef = ref(house) as Ref<House | null>;
  const activeCount = ref(active);
  let summary!: Ref<string>;
  await mountSuspended(
    defineComponent({
      setup() {
        summary = useHouseSummary(houseRef, activeCount, ref(canView)).summary;
        return () => null;
      },
    }),
  );
  await flushPromises();
  return { summary, houseRef, activeCount };
}

beforeEach(() => {
  state.bills.upcomingBills = [];
  state.getHouseBalance = vi.fn().mockResolvedValue(balanceOf([]));
});

describe('useHouseSummary', () => {
  it('is empty without a house', async () => {
    const { summary } = await setup(null);
    expect(summary.value).toBe('');
    expect(state.getHouseBalance).not.toHaveBeenCalled();
  });

  it('does not fetch the balance when the viewer cannot view the house', async () => {
    const { summary } = await setup(houseOf(), 3, false);
    expect(state.getHouseBalance).not.toHaveBeenCalled();
    expect(summary.value).toBe('houseProfile.summary.places|3|4');
  });

  it('reports places taken out of max members', async () => {
    state.getHouseBalance.mockResolvedValue({ data: null, error: 'x' });
    const { summary } = await setup(houseOf({ max_members: 5 }), 2);
    expect(summary.value).toBe('houseProfile.summary.places|2|5');
  });

  it('defaults max to 10 when the house has none', async () => {
    state.getHouseBalance.mockResolvedValue({ data: null, error: 'x' });
    const { summary } = await setup(
      houseOf({ max_members: undefined as unknown as number }),
      1,
    );
    expect(summary.value).toBe('houseProfile.summary.places|1|10');
  });

  it('says everyone is square when nothing is owed', async () => {
    const { summary } = await setup(houseOf());
    expect(summary.value).toBe(
      'houseProfile.summary.places|3|4 · houseProfile.summary.square',
    );
  });

  it('says everyone is square when the plan is empty of money', async () => {
    state.getHouseBalance.mockResolvedValue(balanceOf([0]));
    const { summary } = await setup(houseOf());
    expect(summary.value).toContain('houseProfile.summary.square');
  });

  it('sums the open transfers into one unsettled amount', async () => {
    state.getHouseBalance.mockResolvedValue(balanceOf([10, 5.5]));
    const { summary } = await setup(houseOf());
    expect(summary.value).toContain('houseProfile.summary.unsettled|€15.50');
    expect(summary.value).not.toContain('square');
  });

  it('omits the balance part when it failed to load', async () => {
    state.getHouseBalance.mockResolvedValue({ data: null, error: 'boom' });
    const { summary } = await setup(houseOf());
    expect(summary.value).not.toContain('square');
    expect(summary.value).not.toContain('unsettled');
  });

  it('adds the next bill with its name and date', async () => {
    state.bills.upcomingBills = [
      { description: 'Rent', next_due_date: '2026-10-31' },
      { description: 'Gas', next_due_date: '2026-11-15' },
    ];
    const { summary } = await setup(houseOf());
    expect(summary.value).toMatch(/houseProfile\.summary\.billDue\|Rent\|/);
    expect(summary.value).not.toContain('Gas');
  });

  it('omits the bill part when the next bill has no due date', async () => {
    state.bills.upcomingBills = [{ description: 'Rent' }];
    const { summary } = await setup(houseOf());
    expect(summary.value).not.toContain('billDue');
  });

  it('follows the active count as members join', async () => {
    const { summary, activeCount } = await setup(houseOf(), 2);
    activeCount.value = 4;
    await flushPromises();
    expect(summary.value).toContain('houseProfile.summary.places|4|4');
  });

  it('reloads the balance when the house changes', async () => {
    const { houseRef } = await setup(houseOf());
    houseRef.value = houseOf({ id: 'h-2' });
    await flushPromises();
    expect(state.getHouseBalance).toHaveBeenLastCalledWith('h-2');
  });
});
