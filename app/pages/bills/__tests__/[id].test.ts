import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { setActivePinia, createPinia } from 'pinia';
import BillDetailsPage from '~/pages/bills/[id].vue';

import { useUserStore } from '~/stores/user';
import { useHousesStore } from '~/stores/houses';
import { useBillsStore } from '~/stores/bills';
import { createMockBill, createMockUser, createMockHouse } from '~/tests/utils';

vi.mock('~/stores/user', () => ({ useUserStore: vi.fn() }));
vi.mock('~/stores/houses', () => ({ useHousesStore: vi.fn() }));
vi.mock('~/stores/bills', () => ({ useBillsStore: vi.fn() }));

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

let mockRoute = { params: { id: 'test-bill-id' } };
mockNuxtImport('useRoute', () => () => mockRoute);

const navigateToMock = vi.hoisted(() => vi.fn());
mockNuxtImport('navigateTo', () => navigateToMock);

const G = {
  mocks: { $t: (k: string) => k },
  stubs: {
    Icon: true,
    NuxtLink: true,
    UiSkeleton: true,
    UiButton: { template: '<button><slot /></button>' },
    UiModal: {
      template: '<div v-if="show"><slot /><slot name="footer" /></div>',
      props: ['show', 'title'],
    },
    UiUploadDocument: {
      name: 'UiUploadDocument',
      template: '<div />',
      props: ['multiple', 'accept', 'maxSize', 'disabled'],
      emits: ['upload'],
    },
    AppPageHeader: {
      props: ['title'],
      template: '<div>{{ title }}<slot /><slot name="actions" /></div>',
    },
    BillBasicInfo: true,
    BillContractInfo: true,
    BillDetailsDocuments: {
      name: 'BillDetailsDocuments',
      template: '<div />',
      props: ['documents', 'canDelete'],
      emits: ['view', 'download', 'delete', 'upload'],
    },
    LazyBillEditModal: {
      name: 'LazyBillEditModal',
      template: '<div />',
      props: ['show', 'bill'],
      emits: ['close', 'submit'],
    },
  },
};

describe('Bill Details Page', () => {
  let mockBillsStore: {
    currentBill: ReturnType<typeof createMockBill> | null;
    isLoading: boolean;
    loadBill: ReturnType<typeof vi.fn>;
    updateBill: ReturnType<typeof vi.fn>;
    deleteBill: ReturnType<typeof vi.fn>;
    advanceBill: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    navigateToMock.mockClear();
    mockRoute = { params: { id: 'test-bill-id' } };

    mockBillsStore = {
      currentBill: null,
      isLoading: false,
      loadBill: vi.fn().mockResolvedValue(undefined),
      updateBill: vi.fn().mockResolvedValue(undefined),
      deleteBill: vi.fn().mockResolvedValue(true),
      advanceBill: vi.fn().mockResolvedValue(true),
    };

    vi.mocked(useUserStore).mockReturnValue({
      currentUser: createMockUser({ id: 'test-user-id' }),
    } as unknown as ReturnType<typeof useUserStore>);
    vi.mocked(useHousesStore).mockReturnValue({
      currentHouse: createMockHouse({ id: 'test-house-id' }),
      initialize: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useHousesStore>);
    vi.mocked(useBillsStore).mockReturnValue(
      mockBillsStore as unknown as ReturnType<typeof useBillsStore>,
    );
  });

  it('mounts successfully', async () => {
    const wrapper = await mountSuspended(BillDetailsPage, { global: G });
    expect(wrapper.exists()).toBe(true);
  });

  it('calls housesStore.initialize on mount', async () => {
    await mountSuspended(BillDetailsPage, { global: G });
    const housesStore = useHousesStore();
    expect(housesStore.initialize).toHaveBeenCalled();
  });

  it('calls billsStore.loadBill with the route id when a house is present', async () => {
    await mountSuspended(BillDetailsPage, { global: G });
    expect(mockBillsStore.loadBill).toHaveBeenCalledWith('test-bill-id');
  });

  it('does not call billsStore.loadBill when there is no current house', async () => {
    vi.mocked(useHousesStore).mockReturnValue({
      currentHouse: null,
      initialize: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useHousesStore>);
    await mountSuspended(BillDetailsPage, { global: G });
    expect(mockBillsStore.loadBill).not.toHaveBeenCalled();
  });

  it('renders an announced, content-shaped loading skeleton when isLoading is true', async () => {
    mockBillsStore.isLoading = true;
    const wrapper = await mountSuspended(BillDetailsPage, { global: G });
    expect(wrapper.find('[role="status"]').text()).toContain('common.loading');
    expect(
      wrapper.findAllComponents({ name: 'UiSkeleton' }).length,
    ).toBeGreaterThan(3);
  });

  it('renders the not-found state when there is no current bill', async () => {
    mockBillsStore.currentBill = null;
    const wrapper = await mountSuspended(BillDetailsPage, { global: G });
    expect(wrapper.text()).toContain('bills.details.notFound');
    expect(wrapper.text()).toContain('bills.notFoundDesc');
  });

  it('navigates to /bills from the not-found back button', async () => {
    mockBillsStore.currentBill = null;
    const wrapper = await mountSuspended(BillDetailsPage, { global: G });
    await wrapper.find('button').trigger('click');
    expect(navigateToMock).toHaveBeenCalledWith('/bills');
  });

  it('renders the bill description when a bill is loaded', async () => {
    mockBillsStore.currentBill = createMockBill({
      description: 'Electricity Bill',
    });
    const wrapper = await mountSuspended(BillDetailsPage, { global: G });
    expect(wrapper.text()).toContain('Electricity Bill');
  });

  it('shows creator action buttons only when current user created the bill', async () => {
    mockBillsStore.currentBill = createMockBill({
      created_by: 'someone-else',
    });
    const wrapper = await mountSuspended(BillDetailsPage, { global: G });
    // creator buttons render common.edit / common.delete labels
    expect(wrapper.text()).not.toContain('common.edit');
  });

  it('deleteBill button calls billsStore.deleteBill then navigates to /bills', async () => {
    mockBillsStore.currentBill = createMockBill({
      id: 'bill-42',
      created_by: 'test-user-id',
    });
    const wrapper = await mountSuspended(BillDetailsPage, { global: G });
    const buttons = wrapper.findAll('button');
    const deleteBillBtn = buttons.find((b) => b.text() === 'common.delete');
    await deleteBillBtn!.trigger('click');
    // opens confirm modal, confirm button is the last "common.delete" rendered
    const confirmButtons = wrapper
      .findAll('button')
      .filter((b) => b.text() === 'common.delete');
    await confirmButtons[confirmButtons.length - 1].trigger('click');
    expect(mockBillsStore.deleteBill).toHaveBeenCalledWith('bill-42');
    await Promise.resolve();
    expect(navigateToMock).toHaveBeenCalledWith('/bills');
  });

  it('BUG: handleDocumentUpload always shows an error toast, even though it never throws', async () => {
    mockBillsStore.currentBill = createMockBill({
      created_by: 'test-user-id',
    });
    const wrapper = await mountSuspended(BillDetailsPage, { global: G });
    // opens the upload modal first, mirroring the real @upload handler on BillDetailsDocuments
    const docsPanel = wrapper.findComponent({ name: 'BillDetailsDocuments' });
    await docsPanel.vm.$emit('upload');
    await wrapper.vm.$nextTick();
    const uploader = wrapper.findComponent({ name: 'UiUploadDocument' });
    await uploader.vm.$emit('upload', [new File(['x'], 'x.pdf')]);
    await wrapper.vm.$nextTick();
    expect(
      useNotificationStore().activeNotifications.map((n) => n.description),
    ).toContain('errors.uploadNotAvailable');
  });

  it('shows the advance due date button only for the bill creator', async () => {
    mockBillsStore.currentBill = createMockBill({ created_by: 'test-user-id' });
    const wrapper = await mountSuspended(BillDetailsPage, { global: G });
    expect(wrapper.text()).toContain('bills.details.advanceDueDate');
  });

  it('hides the advance due date button for non-creators', async () => {
    mockBillsStore.currentBill = createMockBill({
      created_by: 'someone-else',
    });
    const wrapper = await mountSuspended(BillDetailsPage, { global: G });
    expect(wrapper.text()).not.toContain('bills.details.advanceDueDate');
  });

  it('advance button opens a confirm modal and calls billsStore.advanceBill with the bill id on confirm', async () => {
    mockBillsStore.currentBill = createMockBill({
      id: 'bill-42',
      created_by: 'test-user-id',
      next_due_date: '2025-12-01',
      payment_period: 1,
    });
    const wrapper = await mountSuspended(BillDetailsPage, { global: G });

    const advanceBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === 'bills.details.advanceDueDate');
    await advanceBtn!.trigger('click');

    const confirmBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === 'bills.details.advanceConfirmButton');
    expect(confirmBtn).toBeTruthy();
    await confirmBtn!.trigger('click');

    expect(mockBillsStore.advanceBill).toHaveBeenCalledWith('bill-42');
  });

  it('cancelling the advance confirm modal does not call billsStore.advanceBill', async () => {
    mockBillsStore.currentBill = createMockBill({
      id: 'bill-42',
      created_by: 'test-user-id',
    });
    const wrapper = await mountSuspended(BillDetailsPage, { global: G });

    const advanceBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === 'bills.details.advanceDueDate');
    await advanceBtn!.trigger('click');

    const cancelBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === 'common.cancel');
    await cancelBtn!.trigger('click');

    expect(mockBillsStore.advanceBill).not.toHaveBeenCalled();
  });

  it('BUG: deleteDocument always shows an error toast, even though it never throws', async () => {
    mockBillsStore.currentBill = createMockBill({
      created_by: 'test-user-id',
      documents: [
        {
          id: 'doc-1',
          filename: 'invoice.pdf',
          url: 'https://example.com/invoice.pdf',
        },
      ],
    });
    const wrapper = await mountSuspended(BillDetailsPage, { global: G });
    const docsPanel = wrapper.findComponent({ name: 'BillDetailsDocuments' });
    await docsPanel.vm.$emit('delete', {
      id: 'doc-1',
      filename: 'invoice.pdf',
      url: 'https://example.com/invoice.pdf',
    });
    await wrapper.vm.$nextTick();
    const confirmButtons = wrapper
      .findAll('button')
      .filter((b) => b.text() === 'common.delete');
    await confirmButtons[confirmButtons.length - 1].trigger('click');
    await wrapper.vm.$nextTick();
    expect(
      useNotificationStore().activeNotifications.map((n) => n.description),
    ).toContain('errors.deleteNotAvailable');
  });
});
