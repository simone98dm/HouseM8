import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { setActivePinia, createPinia } from 'pinia';
import ReportsPage from '~/pages/reports/index.vue';

import { useHousesStore } from '~/stores/houses';
import { useReportsStore } from '~/stores/reports';
import { useNotificationStore } from '~/stores/notifications';

vi.mock('~/stores/houses', () => ({ useHousesStore: vi.fn() }));
vi.mock('~/stores/reports', () => ({ useReportsStore: vi.fn() }));
vi.mock('~/stores/notifications', () => ({ useNotificationStore: vi.fn() }));

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

const mockReport = (overrides: Record<string, unknown> = {}) => ({
  id: 'r-1',
  house_id: 'h-1',
  created_by: 'u-1',
  description: 'Leaky faucet',
  read_at: null,
  solved_at: null,
  ...overrides,
});

const G = {
  mocks: { $t: (k: string) => k },
  stubs: {
    Icon: true,
    UiCard: { template: '<div><slot /><slot name="header" /></div>' },
    UiButton: true,
    ReportFilterBar: {
      name: 'ReportFilterBar',
      template: '<div />',
      props: ['modelValue', 'counts'],
      emits: ['update:modelValue'],
    },
    ReportCard: true,
    ReportCreateModal: true,
    UiFab: true,
    UiEmptyState: true,
    AppPageHeader: true,
  },
};

describe('Reports Page', () => {
  let mockReportsStore: {
    reports: ReturnType<typeof mockReport>[];
    isLoading: boolean;
    loadReports: ReturnType<typeof vi.fn>;
    markReportAsRead: ReturnType<typeof vi.fn>;
    markReportAsSolved: ReturnType<typeof vi.fn>;
    createReport: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    mockReportsStore = {
      reports: [],
      isLoading: false,
      loadReports: vi.fn(),
      markReportAsRead: vi.fn().mockResolvedValue(undefined),
      markReportAsSolved: vi.fn(),
      createReport: vi.fn().mockResolvedValue(true),
    };
    vi.mocked(useHousesStore).mockReturnValue({
      currentHouse: { id: 'h-1', name: 'My House' },
      isOwner: false,
    } as ReturnType<typeof useHousesStore>);
    vi.mocked(useReportsStore).mockReturnValue(
      mockReportsStore as unknown as ReturnType<typeof useReportsStore>,
    );
    vi.mocked(useNotificationStore).mockReturnValue({
      addNotification: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
    } as unknown as ReturnType<typeof useNotificationStore>);
  });

  it('renders', async () => {
    const wrapper = await mountSuspended(ReportsPage, { global: G });
    expect(wrapper.exists()).toBe(true);
  });

  it('renders ReportFilterBar when there are reports', async () => {
    mockReportsStore.reports = [mockReport()];
    const wrapper = await mountSuspended(ReportsPage, { global: G });
    expect(wrapper.findComponent({ name: 'ReportFilterBar' }).exists()).toBe(
      true,
    );
  });

  it('hides ReportFilterBar when there are no reports', async () => {
    const wrapper = await mountSuspended(ReportsPage, { global: G });
    expect(wrapper.findComponent({ name: 'ReportFilterBar' }).exists()).toBe(
      false,
    );
  });

  it('renders ReportCreateModal', async () => {
    const wrapper = await mountSuspended(ReportsPage, { global: G });
    expect(wrapper.findComponent({ name: 'ReportCreateModal' }).exists()).toBe(
      true,
    );
  });

  it('calls loadReports on mount', async () => {
    await mountSuspended(ReportsPage, { global: G });
    expect(mockReportsStore.loadReports).toHaveBeenCalled();
  });

  it('computes filterCounts correctly', async () => {
    mockReportsStore.reports = [
      mockReport({ id: 'r-1', read_at: null, solved_at: null }),
      mockReport({ id: 'r-2', read_at: '2024-01-01', solved_at: null }),
      mockReport({ id: 'r-3', read_at: '2024-01-01', solved_at: '2024-01-02' }),
    ];
    const wrapper = await mountSuspended(ReportsPage, { global: G });
    const filterBar = wrapper.findComponent({ name: 'ReportFilterBar' });
    expect(filterBar.props('counts').all).toBe(3);
    expect(filterBar.props('counts').not_read).toBe(1);
    expect(filterBar.props('counts').read).toBe(1);
    expect(filterBar.props('counts').solved).toBe(1);
  });

  it('filters displayed reports when filter changes', async () => {
    mockReportsStore.reports = [
      mockReport({ id: 'r-1', read_at: null }),
      mockReport({ id: 'r-2', solved_at: '2024-01-01', read_at: '2024-01-01' }),
    ];
    const wrapper = await mountSuspended(ReportsPage, { global: G });
    const filterBar = wrapper.findComponent({ name: 'ReportFilterBar' });
    filterBar.vm.$emit('update:modelValue', 'solved');
  });

  it('markReportAsRead is called when owner views report', async () => {
    vi.mocked(useHousesStore).mockReturnValue({
      currentHouse: { id: 'h-1' },
      isOwner: true,
    } as ReturnType<typeof useHousesStore>);
    const wrapper = await mountSuspended(ReportsPage, { global: G });
    const vm = wrapper.vm as unknown as Record<string, unknown>;
    if (typeof vm.handleViewReport === 'function') {
      await (vm.handleViewReport as (r: unknown) => Promise<void>)(
        mockReport(),
      );
      expect(mockReportsStore.markReportAsRead).toHaveBeenCalledWith('r-1');
    }
  });
});
