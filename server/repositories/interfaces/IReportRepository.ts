import type { RepositoryResponse, PaginatedResponse } from './IBaseRepository';
import type { User } from './IUserRepository';

/**
 * Report image entity
 */
export interface ReportImage {
  id: string;
  report_id: string;
  filename: string;
  url: string;
  uploaded_at: string;
}

/**
 * Report entity
 */
export interface Report {
  id: string;
  house_id: string;
  created_by: string;
  description: string;
  created_at: string;
  read_at?: string | null;
  solved_at?: string | null;
  images?: ReportImage[];
  user?: User;
  house_name?: string;
}

/**
 * Report create data
 */
export interface ReportCreateData {
  house_id: string;
  created_by: string;
  description: string;
}

/**
 * Report image create data
 */
export interface ReportImageCreateData {
  report_id: string;
  filename: string;
  url: string;
}

/**
 * Report status type
 */
export type ReportStatus = 'not_read' | 'read' | 'solved';

/**
 * Report filter options
 */
export interface ReportFilterOptions {
  status?: ReportStatus;
  limit?: number;
  offset?: number;
}

/**
 * Report repository interface
 */
export interface IReportRepository {
  /**
   * Get report by ID with optional related data
   */
  getById(reportId: string): Promise<RepositoryResponse<Report>>;

  /**
   * Get reports created by a specific user
   */
  getByUser(
    userId: string,
    options?: ReportFilterOptions,
  ): Promise<PaginatedResponse<Report>>;

  /**
   * Get reports for houses owned by a specific user
   */
  getForOwner(
    ownerId: string,
    options?: ReportFilterOptions,
  ): Promise<PaginatedResponse<Report>>;

  /**
   * Create a new report
   */
  create(data: ReportCreateData): Promise<RepositoryResponse<Report>>;

  /**
   * Add image to report
   */
  addImage(
    data: ReportImageCreateData,
  ): Promise<RepositoryResponse<ReportImage>>;

  /**
   * Get images for a report
   */
  getImages(reportId: string): Promise<RepositoryResponse<ReportImage[]>>;

  /**
   * Mark report as read (set read_at timestamp)
   */
  markAsRead(reportId: string): Promise<RepositoryResponse<Report>>;

  /**
   * Mark report as solved (set solved_at timestamp)
   */
  markAsSolved(reportId: string): Promise<RepositoryResponse<Report>>;

  /**
   * Delete a report
   */
  delete(reportId: string): Promise<RepositoryResponse<boolean>>;

  /**
   * Check if user is the creator of the report
   */
  isCreator(reportId: string, userId: string): Promise<boolean>;

  /**
   * Check if user is the owner of the house the report belongs to
   */
  isHouseOwner(reportId: string, userId: string): Promise<boolean>;
}
