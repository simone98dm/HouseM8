/**
 * Report domain types
 */

import type { User } from './user';

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
 * Report status type
 */
export type ReportStatus = 'not_read' | 'read' | 'solved';

/**
 * Report entity
 */
export type ReportPriority = 'high' | 'medium' | 'low';

export interface Report {
  id: string;
  house_id: string;
  created_by: string;
  description: string;
  created_at: string;
  read_at?: string | null;
  solved_at?: string | null;
  priority?: ReportPriority | null;
  images?: ReportImage[];
  user?: User;
  house_name?: string;
}

/**
 * Create report payload
 */
export interface CreateReportPayload {
  house_id: string;
  description: string;
  images?: File[];
}

/**
 * Report filters
 */
export interface ReportFilters {
  status?: ReportStatus;
}

/**
 * Helper function to get report status
 */
export function getReportStatus(report: Report): ReportStatus {
  if (report.solved_at) {
    return 'solved';
  }
  if (report.read_at) {
    return 'read';
  }
  return 'not_read';
}

/**
 * Helper function to get status display text key
 */
export function getReportStatusKey(status: ReportStatus): string {
  switch (status) {
    case 'solved':
      return 'reports.status.solved';
    case 'read':
      return 'reports.status.read';
    case 'not_read':
    default:
      return 'reports.status.notRead';
  }
}

/**
 * Helper function to get status variant for Chip component
 */
export function getReportStatusVariant(
  status: ReportStatus,
): 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'solved':
      return 'success';
    case 'read':
      return 'warning';
    case 'not_read':
    default:
      return 'danger';
  }
}
