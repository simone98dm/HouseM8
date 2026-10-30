import type { Report, ReportStatus, ReportImage } from '~/types';

/**
 * Layer 4: API Composable for Reports
 *
 * Responsibilities:
 * - Make HTTP requests via useApi()
 * - Map DTOs to domain objects
 * - Return typed data or null on error
 * - NO business logic
 * - NO state management
 * - NO notifications (stores handle this)
 */
export const useReportsApi = () => {
  const api = useApi();
  const baseUrl = '/api/reports';

  /**
   * Get reports for the current user (as reporter)
   */
  async function getUserReports(
    status?: ReportStatus,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Report[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  } | null> {
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        limit: limit.toString(),
      };

      if (status) {
        params.status = status;
      }

      const result = await api.fetch<{
        data: Report[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          total_pages: number;
        };
      }>(`${baseUrl}/user`, { params }, false);

      return result;
    } catch {
      return null;
    }
  }

  /**
   * Get reports for houses owned by the current user (as owner)
   */
  async function getOwnerReports(
    status?: ReportStatus,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Report[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  } | null> {
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        limit: limit.toString(),
      };

      if (status) {
        params.status = status;
      }

      const result = await api.fetch<{
        data: Report[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          total_pages: number;
        };
      }>(`${baseUrl}/owner`, { params }, false);

      return result;
    } catch {
      return null;
    }
  }

  /**
   * Get a single report by ID
   */
  async function getReport(reportId: string): Promise<Report | null> {
    try {
      const result = await api.fetch<{ data: Report }>(
        `${baseUrl}/${reportId}`,
        {},
        false,
      );
      return result.data;
    } catch {
      return null;
    }
  }

  /**
   * Create a new report
   */
  async function createReport(data: {
    house_id: string;
    description: string;
  }): Promise<Report | null> {
    try {
      const result = await api.fetch<{ data: Report }>(
        baseUrl,
        {
          method: 'POST',
          body: data,
        },
        true,
      );
      return result.data;
    } catch {
      return null;
    }
  }

  /**
   * Upload images for a report
   */
  async function uploadReportImages(
    reportId: string,
    files: File[],
  ): Promise<ReportImage[] | null> {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('images', file);
      });

      const result = await api.fetch<{ data: ReportImage[] }>(
        `${baseUrl}/${reportId}/images`,
        {
          method: 'POST',
          body: formData,
        },
        true,
      );
      return result.data;
    } catch {
      return null;
    }
  }

  /**
   * Mark report as read (owner only)
   */
  async function markAsRead(reportId: string): Promise<Report | null> {
    try {
      const result = await api.fetch<{ data: Report }>(
        `${baseUrl}/${reportId}/read`,
        {
          method: 'PATCH',
        },
        false,
      );
      return result.data;
    } catch {
      return null;
    }
  }

  /**
   * Mark report as solved (owner only)
   */
  async function markAsSolved(reportId: string): Promise<Report | null> {
    try {
      const result = await api.fetch<{ data: Report }>(
        `${baseUrl}/${reportId}/solved`,
        {
          method: 'PATCH',
        },
        false,
      );
      return result.data;
    } catch {
      return null;
    }
  }

  /**
   * Delete a report (creator only)
   */
  async function deleteReport(reportId: string): Promise<boolean> {
    try {
      await api.fetch(
        `${baseUrl}/${reportId}`,
        {
          method: 'DELETE',
        },
        false,
      );
      return true;
    } catch {
      return false;
    }
  }

  return {
    getUserReports,
    getOwnerReports,
    getReport,
    createReport,
    uploadReportImages,
    markAsRead,
    markAsSolved,
    deleteReport,
  };
};
