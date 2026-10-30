import { toSafeErrorMessage } from './utils';
/**
 * PostgreSQL Report Repository Implementation
 */

import type { Pool } from 'pg';
import type {
  IReportRepository,
  Report,
  ReportImage,
  ReportCreateData,
  ReportImageCreateData,
  ReportFilterOptions,
} from '../interfaces/IReportRepository';
import type {
  RepositoryResponse,
  PaginatedResponse,
} from '../interfaces/IBaseRepository';

export class PostgresReportRepository implements IReportRepository {
  constructor(private readonly pool: Pool) {}

  async getById(reportId: string): Promise<RepositoryResponse<Report>> {
    try {
      const result = await this.pool.query<Report>(
        `SELECT r.*,
          h.name as house_name,
          json_build_object(
            'id', u.id,
            'email', u.email,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'avatar_url', u.avatar_url
          ) as user,
          COALESCE(
            (SELECT json_agg(
              json_build_object(
                'id', ri.id,
                'report_id', ri.report_id,
                'filename', ri.filename,
                'url', ri.url,
                'uploaded_at', ri.uploaded_at
              )
            ) FROM report_images ri WHERE ri.report_id = r.id),
            '[]'::json
          ) as images
         FROM reports r
         LEFT JOIN users u ON r.created_by = u.id
         LEFT JOIN houses h ON r.house_id = h.id
         WHERE r.id = $1`,
        [reportId],
      );

      if (result.rows.length === 0) {
        return { data: null, error: 'Report not found' };
      }

      const report = result.rows[0];
      if (!report) {
        return { data: null, error: 'Report data is invalid' };
      }

      return { data: report, error: null };
    } catch (error) {
      return {
        data: null,
        error: toSafeErrorMessage(error),
      };
    }
  }

  async getByUser(
    userId: string,
    options?: ReportFilterOptions,
  ): Promise<PaginatedResponse<Report>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    try {
      let whereClause = 'r.created_by = $1';
      const params: unknown[] = [userId];
      const paramIndex = 2;

      // Add status filter
      if (options?.status) {
        if (options.status === 'not_read') {
          whereClause += ' AND r.read_at IS NULL';
        } else if (options.status === 'read') {
          whereClause += ' AND r.read_at IS NOT NULL AND r.solved_at IS NULL';
        } else if (options.status === 'solved') {
          whereClause += ' AND r.solved_at IS NOT NULL';
        }
      }

      // Get total count
      const countResult = await this.pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM reports r WHERE ${whereClause}`,
        params,
      );
      const total = Number.parseInt(countResult.rows[0]?.count || '0');

      // Get reports with user info and images
      params.push(limit, offset);

      const reportsResult = await this.pool.query<Report>(
        `SELECT r.*,
          h.name as house_name,
          json_build_object(
            'id', u.id,
            'email', u.email,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'avatar_url', u.avatar_url
          ) as user,
          COALESCE(
            (SELECT json_agg(
              json_build_object(
                'id', ri.id,
                'report_id', ri.report_id,
                'filename', ri.filename,
                'url', ri.url,
                'uploaded_at', ri.uploaded_at
              )
            ) FROM report_images ri WHERE ri.report_id = r.id),
            '[]'::json
          ) as images
         FROM reports r
         LEFT JOIN users u ON r.created_by = u.id
         LEFT JOIN houses h ON r.house_id = h.id
         WHERE ${whereClause}
         ORDER BY r.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params,
      );

      return {
        data: reportsResult.rows,
        error: null,
        total,
        limit,
        offset,
      };
    } catch (error) {
      return {
        data: [],
        error: toSafeErrorMessage(error),
        total: 0,
        limit,
        offset,
      };
    }
  }

  async getForOwner(
    ownerId: string,
    options?: ReportFilterOptions,
  ): Promise<PaginatedResponse<Report>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    try {
      let whereClause = 'h.owner_id = $1';
      const params: unknown[] = [ownerId];
      const paramIndex = 2;

      // Add status filter
      if (options?.status) {
        if (options.status === 'not_read') {
          whereClause += ' AND r.read_at IS NULL';
        } else if (options.status === 'read') {
          whereClause += ' AND r.read_at IS NOT NULL AND r.solved_at IS NULL';
        } else if (options.status === 'solved') {
          whereClause += ' AND r.solved_at IS NOT NULL';
        }
      }

      // Get total count
      const countResult = await this.pool.query<{ count: string }>(
        `SELECT COUNT(*) as count 
         FROM reports r 
         JOIN houses h ON r.house_id = h.id 
         WHERE ${whereClause}`,
        params,
      );
      const total = Number.parseInt(countResult.rows[0]?.count || '0');

      // Get reports with user info and images
      params.push(limit, offset);

      const reportsResult = await this.pool.query<Report>(
        `SELECT r.*,
          h.name as house_name,
          json_build_object(
            'id', u.id,
            'email', u.email,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'avatar_url', u.avatar_url
          ) as user,
          COALESCE(
            (SELECT json_agg(
              json_build_object(
                'id', ri.id,
                'report_id', ri.report_id,
                'filename', ri.filename,
                'url', ri.url,
                'uploaded_at', ri.uploaded_at
              )
            ) FROM report_images ri WHERE ri.report_id = r.id),
            '[]'::json
          ) as images
         FROM reports r
         LEFT JOIN users u ON r.created_by = u.id
         JOIN houses h ON r.house_id = h.id
         WHERE ${whereClause}
         ORDER BY r.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params,
      );

      return {
        data: reportsResult.rows,
        error: null,
        total,
        limit,
        offset,
      };
    } catch (error) {
      return {
        data: [],
        error: toSafeErrorMessage(error),
        total: 0,
        limit,
        offset,
      };
    }
  }

  async create(data: ReportCreateData): Promise<RepositoryResponse<Report>> {
    try {
      const result = await this.pool.query<Report>(
        `INSERT INTO reports (house_id, created_by, description)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [data.house_id, data.created_by, data.description],
      );

      const report = result.rows[0];
      if (!report) {
        return { data: null, error: 'Failed to create report' };
      }

      // Fetch the complete report with user info
      return this.getById(report.id);
    } catch (error) {
      return {
        data: null,
        error: toSafeErrorMessage(error),
      };
    }
  }

  async addImage(
    data: ReportImageCreateData,
  ): Promise<RepositoryResponse<ReportImage>> {
    try {
      const result = await this.pool.query<ReportImage>(
        `INSERT INTO report_images (report_id, filename, url)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [data.report_id, data.filename, data.url],
      );

      const image = result.rows[0];
      if (!image) {
        return { data: null, error: 'Failed to add image' };
      }

      return { data: image, error: null };
    } catch (error) {
      return {
        data: null,
        error: toSafeErrorMessage(error),
      };
    }
  }

  async getImages(
    reportId: string,
  ): Promise<RepositoryResponse<ReportImage[]>> {
    try {
      const result = await this.pool.query<ReportImage>(
        `SELECT * FROM report_images WHERE report_id = $1 ORDER BY uploaded_at`,
        [reportId],
      );

      return { data: result.rows, error: null };
    } catch (error) {
      return {
        data: null,
        error: toSafeErrorMessage(error),
      };
    }
  }

  async markAsRead(reportId: string): Promise<RepositoryResponse<Report>> {
    try {
      const result = await this.pool.query<Report>(
        `UPDATE reports 
         SET read_at = NOW() 
         WHERE id = $1 AND read_at IS NULL
         RETURNING *`,
        [reportId],
      );

      // Even if no rows were updated (already read), fetch and return the report
      if (result.rows.length === 0) {
        return this.getById(reportId);
      }

      return this.getById(reportId);
    } catch (error) {
      return {
        data: null,
        error: toSafeErrorMessage(error),
      };
    }
  }

  async markAsSolved(reportId: string): Promise<RepositoryResponse<Report>> {
    try {
      // Also mark as read if not already
      const result = await this.pool.query<Report>(
        `UPDATE reports 
         SET solved_at = NOW(),
             read_at = COALESCE(read_at, NOW())
         WHERE id = $1
         RETURNING *`,
        [reportId],
      );

      if (result.rows.length === 0) {
        return { data: null, error: 'Report not found' };
      }

      return this.getById(reportId);
    } catch (error) {
      return {
        data: null,
        error: toSafeErrorMessage(error),
      };
    }
  }

  async delete(reportId: string): Promise<RepositoryResponse<boolean>> {
    try {
      const result = await this.pool.query(
        'DELETE FROM reports WHERE id = $1',
        [reportId],
      );

      return {
        data: result.rowCount ? result.rowCount > 0 : false,
        error: null,
      };
    } catch (error) {
      return {
        data: false,
        error: toSafeErrorMessage(error),
      };
    }
  }

  async isCreator(reportId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.pool.query<{ exists: boolean }>(
        `SELECT EXISTS(
          SELECT 1 FROM reports r
          JOIN house_members hm
            ON hm.house_id = r.house_id AND hm.user_id = r.created_by AND hm.left_at IS NULL
          WHERE r.id = $1 AND r.created_by = $2
        ) as exists`,
        [reportId, userId],
      );

      return result.rows[0]?.exists ?? false;
    } catch {
      return false;
    }
  }

  async isHouseOwner(reportId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.pool.query<{ exists: boolean }>(
        // house_members.role is the canonical owner source (see
        // ensureHouseOwner / repos.houses.isOwner). houses.owner_id is a
        // duplicate that has drifted from it in practice, so do not authorize
        // on the column.
        `SELECT EXISTS(
          SELECT 1 FROM reports r
          JOIN house_members hm ON hm.house_id = r.house_id
          WHERE r.id = $1
            AND hm.user_id = $2
            AND hm.role = 'owner'
            AND hm.left_at IS NULL
        ) as exists`,
        [reportId, userId],
      );

      return result.rows[0]?.exists ?? false;
    } catch {
      return false;
    }
  }
}
