import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { defineComponent } from 'vue';
import { useBillDetailsPage } from '~/composables/useBillDetailsPage';
import { useHousesStore } from '~/stores/houses';
import { useBillsStore } from '~/stores/bills';
import { useUserStore } from '~/stores/user';
import { createMockBill, createMockHouse, createMockUser } from '~/tests/utils';

vi.mock('~/stores/houses', () => ({ useHousesStore: vi.fn() }));
vi.mock('~/stores/bills', () => ({ useBillsStore: vi.fn() }));
vi.mock('~/stores/user', () => ({ useUserStore: vi.fn() }));

const currentUser = createMockUser({ id: 'user-1' });
const currentHouse = createMockHouse({ id: 'house-1' });

/** Mounts the composable inside a host component (it uses onMounted/watch). */
async function setup(bill: ReturnType<typeof createMockBill> | null) {
  const initialize = vi.fn().mockResolvedValue(undefined);
  const loadBill = vi.fn().mockResolvedValue(undefined);
  const advanceBill = vi.fn().mockResolvedValue(true);

  vi.mocked(useHousesStore).mockReturnValue({
    currentHouse,
    initialize,
  } as unknown as ReturnType<typeof useHousesStore>);

  vi.mocked(useBillsStore).mockReturnValue({
    currentBill: bill,
    isLoading: false,
    loadBill,
    advanceBill,
  } as unknown as ReturnType<typeof useBillsStore>);

  vi.mocked(useUserStore).mockReturnValue({
    currentUser,
  } as unknown as ReturnType<typeof useUserStore>);

  let api!: ReturnType<typeof useBillDetailsPage>;
  const Host = defineComponent({
    template: '<div />',
    setup() {
      api = useBillDetailsPage();
      return {};
    },
  });

  await mountSuspended(Host);

  return { api, advanceBill };
}

describe('useBillDetailsPage — advance due date', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('projects the next due date forward by payment_period months, in UTC', async () => {
    const bill = createMockBill({
      next_due_date: '2025-12-01',
      payment_period: 2,
    });
    const { api } = await setup(bill);
    expect(api.nextAdvancedDueDate.value).toBe('2026-02-01');
  });

  it('calls billsStore.advanceBill with the current bill id, then resets loading and closes the modal', async () => {
    const bill = createMockBill({ id: 'bill-9' });
    const { api, advanceBill } = await setup(bill);

    api.showAdvanceConfirm.value = true;
    const pending = api.handleAdvanceBill();
    expect(api.advancingBill.value).toBe(true);
    await pending;

    expect(advanceBill).toHaveBeenCalledWith('bill-9');
    expect(api.advancingBill.value).toBe(false);
    expect(api.showAdvanceConfirm.value).toBe(false);
  });

  it('ignores a second call while a request is already in flight (double-click guard)', async () => {
    const bill = createMockBill({ id: 'bill-9' });
    const { api, advanceBill } = await setup(bill);

    const first = api.handleAdvanceBill();
    const second = api.handleAdvanceBill();
    await Promise.all([first, second]);

    expect(advanceBill).toHaveBeenCalledTimes(1);
  });

  it('resets loading state even when the store call fails', async () => {
    const bill = createMockBill({ id: 'bill-9' });
    const { api, advanceBill } = await setup(bill);
    advanceBill.mockRejectedValueOnce(new Error('network error'));

    await expect(api.handleAdvanceBill()).resolves.toBeUndefined();
    expect(api.advancingBill.value).toBe(false);
  });

  it('does nothing when there is no current bill', async () => {
    const { api, advanceBill } = await setup(null);

    await api.handleAdvanceBill();

    expect(advanceBill).not.toHaveBeenCalled();
  });

  it('routes upload failures through the shared notification store', async () => {
    const { api } = await setup(createMockBill({ id: 'bill-1' }));

    await api.handleDocumentUpload([]);

    const active = useNotificationStore().activeNotifications;
    expect(active).toHaveLength(1);
    expect(active[0]!.type).toBe('error');
  });
});
