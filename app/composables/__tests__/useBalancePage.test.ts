/**
 * The /balance page has to report ONE obligation.
 *
 * It used to report three. "Total to pay" read the gross per-share total
 * (`total_owed`), while Net Standing and the settle-up list both used the
 * netted settlement plan. Anyone who had both paid for something and owed on
 * something else saw a headline figure larger than what the app actually asked
 * them to transfer.
 *
 * The scenario below is the real one, taken from the dev database (house
 * "Casa Saffi", three expenses between two people).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { defineComponent } from 'vue';
import { useBalancePage } from '~/composables/useBalancePage';
import { useHousesStore } from '~/stores/houses';
import { useUserStore } from '~/stores/user';
import { useBalance } from '~/composables/useBalance';
import type { HouseBalance } from '~/types/composables/balance';

vi.mock('~/stores/houses', () => ({ useHousesStore: vi.fn() }));
vi.mock('~/stores/user', () => ({ useUserStore: vi.fn() }));
vi.mock('~/composables/useBalance', () => ({ useBalance: vi.fn() }));

const ME = 'user-me';
const THEM = 'user-them';

const user = (id: string) => ({
  id,
  first_name: 'A',
  last_name: 'B',
  email: `${id}@x.com`,
});

/**
 * Gross: I owe 20.00 on their expense, they owe 8.00 across two of mine.
 * Net: I owe 12.00 — and that is the single transfer the plan asks for.
 */
const casaSaffi: HouseBalance = {
  house_id: 'house-1',
  currency: 'EUR',
  user_balances: [
    {
      user_id: ME,
      user: user(ME),
      total_paid: 8,
      total_owed: 20,
      net_balance: -12,
    },
    {
      user_id: THEM,
      user: user(THEM),
      total_paid: 20,
      total_owed: 8,
      net_balance: 12,
    },
  ],
  settlement_transactions: [
    {
      from_user_id: ME,
      to_user_id: THEM,
      amount: 12,
      from_user: user(ME),
      to_user: user(THEM),
    },
  ],
  total_expenses: 55.97,
  is_balanced: false,
} as unknown as HouseBalance;

async function setup(
  balance: HouseBalance | null,
  currentUserId = ME,
  extra: Record<string, unknown> = {},
) {
  vi.mocked(useHousesStore).mockReturnValue({
    currentHouse: { id: 'house-1' },
    lastFetch: Date.now(),
    initialize: vi.fn(),
  } as unknown as ReturnType<typeof useHousesStore>);
  vi.mocked(useUserStore).mockReturnValue({
    currentUser: { id: currentUserId },
  } as unknown as ReturnType<typeof useUserStore>);
  vi.mocked(useBalance).mockReturnValue({
    getHouseBalance: vi.fn().mockResolvedValue({ data: balance, error: null }),
    getRecentPayments: vi.fn().mockResolvedValue({ data: [], error: null }),
    settleUserToUser: vi.fn(),
    undoSettlement: vi.fn(),
    ...extra,
  } as unknown as ReturnType<typeof useBalance>);

  let api!: ReturnType<typeof useBalancePage>;
  const Host = defineComponent({
    template: '<div />',
    setup() {
      api = useBalancePage();
      return {};
    },
  });
  await mountSuspended(Host);
  await new Promise((r) => setTimeout(r, 0));
  return api;
}

describe('useBalancePage — money to give', () => {
  beforeEach(() => vi.clearAllMocks());

  // The regression. Before the fix this read 20.
  it('reports the net obligation, not the gross share total', async () => {
    const api = await setup(casaSaffi);
    expect(api.totalToPay.value).toBe(12);
  });

  it('agrees with the settle-up list it sits next to', async () => {
    const api = await setup(casaSaffi);
    const listed = api.myDebts.value.reduce((sum, t) => sum + t.amount, 0);
    expect(api.totalToPay.value).toBe(listed);
  });

  it('agrees with Net Standing', async () => {
    const api = await setup(casaSaffi);
    expect(api.totalToReceive.value - api.totalToPay.value).toBe(
      api.netStanding.value,
    );
  });

  it('shows the creditor a receivable and nothing to pay', async () => {
    const api = await setup(casaSaffi, THEM);
    expect(api.totalToReceive.value).toBe(12);
    expect(api.totalToPay.value).toBe(0);
  });

  // settlement amounts arrive as cents/100; naive float addition of three of
  // them yields 34.550000000000004.
  it('sums several transfers without float drift', async () => {
    const api = await setup({
      ...casaSaffi,
      settlement_transactions: [
        { from_user_id: ME, to_user_id: 'a', amount: 10.1 },
        { from_user_id: ME, to_user_id: 'b', amount: 20.2 },
        { from_user_id: ME, to_user_id: 'c', amount: 4.25 },
      ],
    } as unknown as HouseBalance);

    expect(api.totalToPay.value).toBe(34.55);
  });

  it('is zero for a settled house', async () => {
    const api = await setup({
      ...casaSaffi,
      settlement_transactions: [],
      is_balanced: true,
    } as unknown as HouseBalance);

    expect(api.totalToPay.value).toBe(0);
    expect(api.totalToReceive.value).toBe(0);
  });
});

describe('useBalancePage — settle immediately', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationStore().clearAllNotifications();
  });

  it('has no confirm modal: settling calls the API straight away', async () => {
    const settleUserToUser = vi.fn().mockResolvedValue({
      data: { settlement_id: 'set-1', amount: 12 },
      error: null,
    });
    const api = await setup(casaSaffi, ME, { settleUserToUser });
    expect('confirmModal' in api).toBe(false);
    await api.markSettlementComplete(api.myDebts.value[0]!);
    expect(settleUserToUser).toHaveBeenCalledWith('house-1', ME, THEM);
  });

  it('the creditor can mark as received, with an undo toast', async () => {
    const settleUserToUser = vi.fn().mockResolvedValue({
      data: { settlement_id: 'set-2', amount: 12 },
      error: null,
    });
    const api = await setup(casaSaffi, THEM, { settleUserToUser });
    expect(api.myCredits.value).toHaveLength(1);
    await api.markSettlementComplete(api.myCredits.value[0]!);
    expect(settleUserToUser).toHaveBeenCalledWith('house-1', ME, THEM);
    const toast = useNotificationStore().activeNotifications[0]!;
    expect(toast.title).toMatch(/^Recorded .*12.* received from A$/);
    expect(toast.action?.label).toBe('Undo');
  });

  it('splits the house into the viewer and everyone else', async () => {
    const api = await setup(casaSaffi);
    expect(api.me.value?.id).toBe(ME);
    expect(api.otherPeople.value.map((u) => u.id)).toEqual([THEM]);
  });

  it('leads with the shared headline sentence', async () => {
    const api = await setup(casaSaffi);
    expect(api.headline.value.sentence).toMatch(/^You owe A .*12/);
  });
});

describe('useBalancePage — undo a recorded payment', () => {
  const notifications = () => useNotificationStore();

  const settleWith = async (undo: ReturnType<typeof vi.fn>) => {
    const settleUserToUser = vi.fn().mockResolvedValue({
      data: { settlement_id: 'set-1', amount: 12 },
      error: null,
    });
    const getHouseBalance = vi
      .fn()
      .mockResolvedValue({ data: casaSaffi, error: null });
    const api = await setup(casaSaffi, ME, {
      settleUserToUser,
      getHouseBalance,
      undoSettlement: undo,
    });
    await api.markSettlementComplete(api.myDebts.value[0]!);
    return { api, getHouseBalance };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    notifications().clearAllNotifications();
  });

  it('offers Undo on the "Recorded" toast, which stays a status', async () => {
    await settleWith(vi.fn());

    const toast = notifications().activeNotifications[0]!;
    expect(toast.title).toMatch(/^Recorded .*12.* paid to A$/);
    expect(toast.type).toBe('success');
    expect(toast.action?.label).toBe('Undo');
  });

  it('undoing calls the server, refreshes the balance and confirms', async () => {
    const undo = vi.fn().mockResolvedValue({
      data: { reverted_count: 2 },
      error: null,
    });
    const { getHouseBalance } = await settleWith(undo);
    const loadsBefore = getHouseBalance.mock.calls.length;

    notifications().activeNotifications[0]!.action!.action();
    await new Promise((r) => setTimeout(r, 0));

    expect(undo).toHaveBeenCalledWith('house-1', 'set-1');
    expect(getHouseBalance.mock.calls.length).toBe(loadsBefore + 1);
    const titles = notifications().activeNotifications.map((n) => n.title);
    expect(titles).toEqual(['Payment record undone']);
  });

  it.each([
    ['UNDO_WINDOW_EXPIRED', /More than 24 hours/],
    ['ALREADY_UNDONE', /already undone/],
    ['Database error', /Couldn't undo/],
  ])('explains a failed undo (%s)', async (code, copy) => {
    const undo = vi.fn().mockResolvedValue({ data: null, error: code });
    await settleWith(undo);

    notifications().activeNotifications[0]!.action!.action();
    await new Promise((r) => setTimeout(r, 0));

    const error = notifications().activeNotifications.find(
      (n) => n.type === 'error',
    );
    expect(error?.title).toMatch(copy);
  });

  it('records the amount the server took from the plan in the toast', async () => {
    const settleUserToUser = vi.fn().mockResolvedValue({
      data: { settlement_id: 'set-1', amount: 11.5 },
      error: null,
    });
    const api = await setup(casaSaffi, ME, { settleUserToUser });
    await api.markSettlementComplete(api.myDebts.value[0]!);
    expect(notifications().activeNotifications[0]?.title).toMatch(/11\.5/);
  });
});

describe('useBalancePage — failed Mark paid', () => {
  const notifications = () => useNotificationStore();
  beforeEach(() => {
    vi.clearAllMocks();
    notifications().clearAllNotifications();
  });

  it('shows a cause + Retry, and Retry records it', async () => {
    const settleUserToUser = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: 'Network down' })
      .mockResolvedValueOnce({
        data: { settlement_id: 'set-1', amount: 12 },
        error: null,
      });
    const api = await setup(casaSaffi, ME, { settleUserToUser });
    await api.markSettlementComplete(api.myDebts.value[0]!);

    const toast = notifications().activeNotifications[0]!;
    expect(toast.type).toBe('error');
    expect(toast.description).toMatch(/connection problem/);
    expect(toast.action?.label).toBe('Retry');

    toast.action!.action();
    await new Promise((r) => setTimeout(r, 0));

    expect(settleUserToUser).toHaveBeenCalledTimes(2);
    expect(
      notifications().activeNotifications.some((n) => n.type === 'success'),
    ).toBe(true);
  });

  it('NOT_IN_PLAN explains the plan changed, offers no retry and reloads', async () => {
    const settleUserToUser = vi
      .fn()
      .mockResolvedValue({ data: null, error: 'NOT_IN_PLAN' });
    const getHouseBalance = vi
      .fn()
      .mockResolvedValue({ data: casaSaffi, error: null });
    const api = await setup(casaSaffi, ME, {
      settleUserToUser,
      getHouseBalance,
    });
    const before = getHouseBalance.mock.calls.length;
    await api.markSettlementComplete(api.myDebts.value[0]!);

    const toast = notifications().activeNotifications[0]!;
    expect(toast.title).toMatch(/Who pays whom changed/);
    expect(toast.action).toBeUndefined();
    expect(getHouseBalance.mock.calls.length).toBe(before + 1);
  });
});

describe('useBalancePage — loading vs refreshing', () => {
  beforeEach(() => vi.clearAllMocks());

  it('a reload keeps the content mounted (refreshing, not loading)', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const getHouseBalance = vi
      .fn()
      .mockResolvedValueOnce({ data: casaSaffi, error: null })
      .mockImplementationOnce(async () => {
        await gate;
        return { data: casaSaffi, error: null };
      });
    const api = await setup(casaSaffi, ME, { getHouseBalance });
    expect(api.loading.value).toBe(false);

    const reload = api.loadBalance();
    await Promise.resolve();
    expect(api.loading.value).toBe(false);
    expect(api.refreshing.value).toBe(true);
    expect(api.houseBalance.value).not.toBeNull();

    release();
    await reload;
    expect(api.refreshing.value).toBe(false);
  });

  it('a failed background refresh keeps the last good balance', async () => {
    const getHouseBalance = vi
      .fn()
      .mockResolvedValueOnce({ data: casaSaffi, error: null })
      .mockResolvedValueOnce({ data: null, error: 'boom' });
    const api = await setup(casaSaffi, ME, { getHouseBalance });
    await api.loadBalance();
    expect(api.houseBalance.value).not.toBeNull();
  });

  it('exposes the sole transfer as the headline action and the recent payments', async () => {
    const payments = [{ id: 'p1', can_undo: true }];
    const api = await setup(casaSaffi, ME, {
      getRecentPayments: vi
        .fn()
        .mockResolvedValue({ data: payments, error: null }),
    });
    expect(api.soleTransfer.value?.amount).toBe(12);
    expect(api.soleTransferIsCredit.value).toBe(false);
    expect(api.recentPayments.value).toEqual(payments);
  });
});

describe('useBalancePage — creditor receives then undoes', () => {
  it('undo after marking a credit received calls the server and confirms', async () => {
    vi.clearAllMocks();
    useNotificationStore().clearAllNotifications();
    const undoSettlement = vi
      .fn()
      .mockResolvedValue({ data: { reverted_count: 1 }, error: null });
    const api = await setup(casaSaffi, THEM, {
      settleUserToUser: vi.fn().mockResolvedValue({
        data: { settlement_id: 'set-9', amount: 12 },
        error: null,
      }),
      getHouseBalance: vi
        .fn()
        .mockResolvedValue({ data: casaSaffi, error: null }),
      undoSettlement,
    });
    await api.markSettlementComplete(api.myCredits.value[0]!);

    useNotificationStore().activeNotifications[0]!.action!.action();
    await new Promise((r) => setTimeout(r, 0));

    expect(undoSettlement).toHaveBeenCalledWith('house-1', 'set-9');
    expect(
      useNotificationStore().activeNotifications.map((n) => n.title),
    ).toEqual(['Payment record undone']);
  });
});
