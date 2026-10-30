import { defineStore } from 'pinia';
import type { Report, ReportStatus, CreateReportPayload } from '~/types';

/**
 * Layer 3: Reports Store
 *
 * Responsibilities:
 * - State management (reactive data)
 * - Business logic and validation
 * - Data manipulation and transformation
 * - Computed properties (derived state)
 * - Call Layer 4 composables for API operations
 * - Handle notifications (success/error)
 */
export const useReportsStore = defineStore('reports', () => {
  const reportsApi = useReportsApi();
  const housesStore = useHousesStore();
  const notificationStore = useNotificationStore();

  const reports = ref<Report[]>([]);
  const currentFilter = ref<ReportStatus | undefined>(undefined);
  const isLoading = ref(false);
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });

  const filteredReports = computed(() => {
    if (!currentFilter.value) return reports.value;
    return reports.value.filter((report) => {
      if (currentFilter.value === 'solved') return !!report.solved_at;
      if (currentFilter.value === 'read')
        return !!report.read_at && !report.solved_at;
      if (currentFilter.value === 'not_read') return !report.read_at;
      return true;
    });
  });

  const unreadCount = computed(() => {
    return reports.value.filter((r) => !r.read_at).length;
  });

  /**
   * Load reports for regular users (their own reports)
   */
  async function loadUserReports(
    status?: ReportStatus,
    page: number = 1,
  ): Promise<void> {
    isLoading.value = true;
    currentFilter.value = status;

    const result = await reportsApi.getUserReports(status, page);

    if (result) {
      reports.value = result.data;
      pagination.value = result.pagination;
    } else {
      reports.value = [];
      notificationStore.addNotification(
        'error',
        'errors.generic',
        'errors.failedToLoad',
        { i18n: true },
      );
    }

    isLoading.value = false;
  }

  /**
   * Load reports for house owners (reports from their tenants)
   */
  async function loadOwnerReports(
    status?: ReportStatus,
    page: number = 1,
  ): Promise<void> {
    isLoading.value = true;
    currentFilter.value = status;

    const result = await reportsApi.getOwnerReports(status, page);

    if (result) {
      reports.value = result.data;
      pagination.value = result.pagination;
    } else {
      reports.value = [];
      notificationStore.addNotification(
        'error',
        'errors.generic',
        'errors.failedToLoad',
        { i18n: true },
      );
    }

    isLoading.value = false;
  }

  /**
   * Load reports based on user role
   */
  async function loadReports(
    status?: ReportStatus,
    page: number = 1,
  ): Promise<void> {
    if (housesStore.isOwner) {
      await loadOwnerReports(status, page);
    } else {
      await loadUserReports(status, page);
    }
  }

  /**
   * Create a new report
   * Business logic: validation, state updates, notifications
   */
  async function createReport(data: CreateReportPayload): Promise<boolean> {
    // Validation
    if (!data.house_id) {
      notificationStore.addNotification(
        'error',
        'errors.validation',
        'errors.noHouseSelected',
        { i18n: true },
      );
      return false;
    }

    if (!data.description || data.description.trim().length === 0) {
      notificationStore.addNotification(
        'error',
        'errors.validation',
        'reports.form.description',
        { i18n: true },
      );
      return false;
    }

    if (data.description.trim().length < 10) {
      notificationStore.addNotification(
        'error',
        'errors.validation',
        'reports.validation.descriptionTooShort',
        { i18n: true },
      );
      return false;
    }

    isLoading.value = true;

    // Create the report
    const report = await reportsApi.createReport({
      house_id: data.house_id,
      description: data.description.trim(),
    });

    if (!report) {
      notificationStore.addNotification(
        'error',
        'errors.generic',
        'errors.failedToCreateReport',
        { i18n: true },
      );
      isLoading.value = false;
      return false;
    }

    // Upload images if provided
    if (data.images && data.images.length > 0) {
      const images = await reportsApi.uploadReportImages(
        report.id,
        data.images,
      );

      if (images) {
        report.images = images;
      }
    }

    // Add to state
    reports.value.unshift(report);

    notificationStore.addNotification(
      'success',
      'common.success',
      'success.reportSubmitted',
      { i18n: true },
    );

    isLoading.value = false;
    return true;
  }

  /**
   * Mark report as read (owner only)
   */
  async function markReportAsRead(reportId: string): Promise<boolean> {
    const updatedReport = await reportsApi.markAsRead(reportId);

    if (updatedReport) {
      // Update in state
      const index = reports.value.findIndex((r) => r.id === reportId);
      if (index !== -1) {
        reports.value[index] = updatedReport;
      }
      return true;
    }

    return false;
  }

  /**
   * Mark report as solved (owner only)
   */
  async function markReportAsSolved(reportId: string): Promise<boolean> {
    const updatedReport = await reportsApi.markAsSolved(reportId);

    if (updatedReport) {
      // Update in state
      const index = reports.value.findIndex((r) => r.id === reportId);
      if (index !== -1) {
        reports.value[index] = updatedReport;
      }

      notificationStore.addNotification(
        'success',
        'common.success',
        'success.reportSolved',
        { i18n: true },
      );
      return true;
    }

    notificationStore.addNotification(
      'error',
      'errors.generic',
      'errors.failedToUpdateReport',
      { i18n: true },
    );
    return false;
  }

  /**
   * Delete a report
   */
  async function deleteReport(reportId: string): Promise<boolean> {
    const success = await reportsApi.deleteReport(reportId);

    if (success) {
      // Remove from state
      reports.value = reports.value.filter((r) => r.id !== reportId);

      notificationStore.addNotification(
        'success',
        'common.success',
        'success.reportDeleted',
        { i18n: true },
      );
      return true;
    }

    notificationStore.addNotification(
      'error',
      'errors.generic',
      'errors.failedToDeleteReport',
      { i18n: true },
    );
    return false;
  }

  /**
   * Set filter
   */
  function setFilter(status: ReportStatus | undefined): void {
    currentFilter.value = status;
  }

  /**
   * Clear state
   */
  function clearReports(): void {
    reports.value = [];
    currentFilter.value = undefined;
    pagination.value = {
      page: 1,
      limit: 20,
      total: 0,
      total_pages: 0,
    };
  }

  return {
    // State
    reports,
    currentFilter,
    isLoading,
    pagination,
    // Getters
    filteredReports,
    unreadCount,
    // Actions
    loadReports,
    loadUserReports,
    loadOwnerReports,
    createReport,
    markReportAsRead,
    markReportAsSolved,
    deleteReport,
    setFilter,
    clearReports,
  };
});
