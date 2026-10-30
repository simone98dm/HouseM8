/**
 * Reports Store Tests — real store with mocked dependencies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

import { useReportsApi } from '~/composables/useReportsApi';
import { useHousesStore } from '~/stores/houses';
import { useNotificationStore } from '~/stores/notifications';
import { useReportsStore } from '~/stores/reports';
import { createMockReport } from '~/tests/utils';

vi.mock('~/composables/useReportsApi', () => ({ useReportsApi: vi.fn() }));
vi.mock('~/stores/houses', () => ({ useHousesStore: vi.fn() }));
vi.mock('~/stores/notifications', () => ({ useNotificationStore: vi.fn() }));

const mockPagination = { page: 1, limit: 20, total: 2, total_pages: 1 };

describe('useReportsStore', () => {
  let mockReportsApi: {
    getUserReports: ReturnType<typeof vi.fn>;
    getOwnerReports: ReturnType<typeof vi.fn>;
    createReport: ReturnType<typeof vi.fn>;
    markAsRead: ReturnType<typeof vi.fn>;
    markAsSolved: ReturnType<typeof vi.fn>;
    deleteReport: ReturnType<typeof vi.fn>;
    uploadReportImages: ReturnType<typeof vi.fn>;
  };
  let mockNotificationStore: { addNotification: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    setActivePinia(createPinia());

    mockReportsApi = {
      getUserReports: vi.fn(),
      getOwnerReports: vi.fn(),
      createReport: vi.fn(),
      markAsRead: vi.fn(),
      markAsSolved: vi.fn(),
      deleteReport: vi.fn(),
      uploadReportImages: vi.fn(),
    };
    mockNotificationStore = { addNotification: vi.fn() };

    vi.mocked(useReportsApi).mockReturnValue(mockReportsApi as any);
    vi.mocked(useHousesStore).mockReturnValue({ isOwner: false } as any);
    vi.mocked(useNotificationStore).mockReturnValue(
      mockNotificationStore as any,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('initializes with empty reports array', () => {
      const store = useReportsStore();
      expect(store.reports).toEqual([]);
    });

    it('initializes with undefined currentFilter', () => {
      const store = useReportsStore();
      expect(store.currentFilter).toBeUndefined();
    });

    it('initializes with isLoading false', () => {
      const store = useReportsStore();
      expect(store.isLoading).toBe(false);
    });

    it('initializes pagination with default values', () => {
      const store = useReportsStore();
      expect(store.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 0,
      });
    });
  });

  describe('computed: filteredReports', () => {
    const readReport = createMockReport({
      id: 'r1',
      read_at: '2025-01-01',
      solved_at: null,
    });
    const unreadReport = createMockReport({
      id: 'r2',
      read_at: null,
      solved_at: null,
    });
    const solvedReport = createMockReport({
      id: 'r3',
      read_at: '2025-01-01',
      solved_at: '2025-01-02',
    });

    beforeEach(async () => {
      mockReportsApi.getUserReports.mockResolvedValue({
        data: [readReport, unreadReport, solvedReport],
        pagination: mockPagination,
      });
    });

    it('returns all reports when no filter set', async () => {
      const store = useReportsStore();
      await store.loadUserReports();
      expect(store.filteredReports).toHaveLength(3);
    });

    it('filters by solved', async () => {
      const store = useReportsStore();
      await store.loadUserReports();
      store.setFilter('solved');
      expect(store.filteredReports).toHaveLength(1);
      expect(store.filteredReports[0]!.id).toBe('r3');
    });

    it('filters by read (read but not solved)', async () => {
      const store = useReportsStore();
      await store.loadUserReports();
      store.setFilter('read');
      expect(store.filteredReports).toHaveLength(1);
      expect(store.filteredReports[0]!.id).toBe('r1');
    });

    it('filters by not_read', async () => {
      const store = useReportsStore();
      await store.loadUserReports();
      store.setFilter('not_read');
      expect(store.filteredReports).toHaveLength(1);
      expect(store.filteredReports[0]!.id).toBe('r2');
    });
  });

  describe('computed: unreadCount', () => {
    it('counts reports without read_at', async () => {
      mockReportsApi.getUserReports.mockResolvedValue({
        data: [
          createMockReport({ read_at: null }),
          createMockReport({ read_at: '2025-01-01' }),
          createMockReport({ read_at: null }),
        ],
        pagination: mockPagination,
      });
      const store = useReportsStore();
      await store.loadUserReports();
      expect(store.unreadCount).toBe(2);
    });
  });

  describe('loadUserReports', () => {
    it('populates reports and pagination', async () => {
      const reports = [createMockReport({ id: 'r1' })];
      mockReportsApi.getUserReports.mockResolvedValue({
        data: reports,
        pagination: mockPagination,
      });
      const store = useReportsStore();
      await store.loadUserReports();
      expect(store.reports).toEqual(reports);
      expect(store.pagination).toEqual(mockPagination);
      expect(store.isLoading).toBe(false);
    });

    it('notifies and clears reports on API failure', async () => {
      mockReportsApi.getUserReports.mockResolvedValue(null);
      const store = useReportsStore();
      await store.loadUserReports();
      expect(store.reports).toEqual([]);
      expect(mockNotificationStore.addNotification).toHaveBeenCalled();
    });
  });

  describe('loadReports', () => {
    it('calls loadOwnerReports when isOwner is true', async () => {
      vi.mocked(useHousesStore).mockReturnValue({ isOwner: true } as any);
      mockReportsApi.getOwnerReports.mockResolvedValue({
        data: [],
        pagination: mockPagination,
      });
      const store = useReportsStore();
      await store.loadReports();
      expect(mockReportsApi.getOwnerReports).toHaveBeenCalled();
      expect(mockReportsApi.getUserReports).not.toHaveBeenCalled();
    });

    it('calls loadUserReports when isOwner is false', async () => {
      mockReportsApi.getUserReports.mockResolvedValue({
        data: [],
        pagination: mockPagination,
      });
      const store = useReportsStore();
      await store.loadReports();
      expect(mockReportsApi.getUserReports).toHaveBeenCalled();
    });
  });

  describe('createReport', () => {
    const validData = {
      house_id: 'house-1',
      description: 'The kitchen tap is leaking badly',
    };

    it('creates report and prepends to state', async () => {
      const newReport = createMockReport({ id: 'new-r' });
      mockReportsApi.createReport.mockResolvedValue(newReport);
      const store = useReportsStore();
      const result = await store.createReport(validData);
      expect(result).toBe(true);
      expect(store.reports[0]!.id).toBe('new-r');
      expect(store.isLoading).toBe(false);
    });

    it('returns false when house_id is empty', async () => {
      const store = useReportsStore();
      const result = await store.createReport({
        house_id: '',
        description: 'Long enough desc',
      });
      expect(result).toBe(false);
      expect(mockReportsApi.createReport).not.toHaveBeenCalled();
    });

    it('returns false when description is empty', async () => {
      const store = useReportsStore();
      const result = await store.createReport({
        house_id: 'house-1',
        description: '',
      });
      expect(result).toBe(false);
    });

    it('returns false when description is shorter than 10 chars', async () => {
      const store = useReportsStore();
      const result = await store.createReport({
        house_id: 'house-1',
        description: 'Short',
      });
      expect(result).toBe(false);
      expect(mockReportsApi.createReport).not.toHaveBeenCalled();
    });

    it('returns false and notifies when API returns null', async () => {
      mockReportsApi.createReport.mockResolvedValue(null);
      const store = useReportsStore();
      const result = await store.createReport(validData);
      expect(result).toBe(false);
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('markReportAsRead', () => {
    it('updates report in state and returns true', async () => {
      const report = createMockReport({ id: 'r1', read_at: null });
      const updated = createMockReport({ id: 'r1', read_at: '2025-01-01' });
      mockReportsApi.getUserReports.mockResolvedValue({
        data: [report],
        pagination: mockPagination,
      });
      mockReportsApi.markAsRead.mockResolvedValue(updated);
      const store = useReportsStore();
      await store.loadUserReports();
      const result = await store.markReportAsRead('r1');
      expect(result).toBe(true);
      expect(store.reports[0]!.read_at).toBe('2025-01-01');
    });

    it('returns false when API fails', async () => {
      mockReportsApi.markAsRead.mockResolvedValue(null);
      const store = useReportsStore();
      const result = await store.markReportAsRead('r1');
      expect(result).toBe(false);
    });
  });

  describe('markReportAsSolved', () => {
    it('updates report in state and notifies with success', async () => {
      const report = createMockReport({ id: 'r1', solved_at: null });
      const updated = createMockReport({ id: 'r1', solved_at: '2025-01-01' });
      mockReportsApi.getUserReports.mockResolvedValue({
        data: [report],
        pagination: mockPagination,
      });
      mockReportsApi.markAsSolved.mockResolvedValue(updated);
      const store = useReportsStore();
      await store.loadUserReports();
      const result = await store.markReportAsSolved('r1');
      expect(result).toBe(true);
      expect(store.reports[0]!.solved_at).toBe('2025-01-01');
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'success',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('deleteReport', () => {
    it('removes report from state on success', async () => {
      mockReportsApi.getUserReports.mockResolvedValue({
        data: [createMockReport({ id: 'r1' }), createMockReport({ id: 'r2' })],
        pagination: mockPagination,
      });
      mockReportsApi.deleteReport.mockResolvedValue(true);
      const store = useReportsStore();
      await store.loadUserReports();
      const result = await store.deleteReport('r1');
      expect(result).toBe(true);
      expect(store.reports).toHaveLength(1);
      expect(store.reports[0]!.id).toBe('r2');
    });

    it('returns false and notifies on failure', async () => {
      mockReportsApi.deleteReport.mockResolvedValue(false);
      const store = useReportsStore();
      const result = await store.deleteReport('r1');
      expect(result).toBe(false);
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('clearReports', () => {
    it('resets reports, filter, and pagination', async () => {
      mockReportsApi.getUserReports.mockResolvedValue({
        data: [createMockReport()],
        pagination: mockPagination,
      });
      const store = useReportsStore();
      await store.loadUserReports();
      store.setFilter('solved');
      store.clearReports();
      expect(store.reports).toEqual([]);
      expect(store.currentFilter).toBeUndefined();
      expect(store.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 0,
      });
    });
  });
});
