import { toSafeErrorMessage } from './utils';
import type { Pool } from 'pg';
import type {
  IMonthlyReportRepository,
  MonthlyReport,
  MonthlyReportUpsertData,
} from '../interfaces/IMonthlyReportRepository';
import type { RepositoryResponse } from '../interfaces/IBaseRepository';

export class PostgresMonthlyReportRepository implements IMonthlyReportRepository {
  constructor(private readonly pool: Pool) {}

  async getByHouseAndPeriod(
    houseId: string,
    year: number,
    month: number,
  ): Promise<RepositoryResponse<MonthlyReport>> {
    try {
      const result = await this.pool.query<MonthlyReport>(
        `SELECT * FROM monthly_reports WHERE house_id = $1 AND year = $2 AND month = $3`,
        [houseId, year, month],
      );

      if (result.rows.length === 0) {
        return { data: null, error: 'Report not found' };
      }

      return { data: result.rows[0]!, error: null };
    } catch (error) {
      return {
        data: null,
        error: toSafeErrorMessage(error),
      };
    }
  }

  async listByHouse(
    houseId: string,
    limit = 12,
  ): Promise<RepositoryResponse<MonthlyReport[]>> {
    try {
      const result = await this.pool.query<MonthlyReport>(
        `SELECT * FROM monthly_reports WHERE house_id = $1 ORDER BY year DESC, month DESC LIMIT $2`,
        [houseId, limit],
      );

      return { data: result.rows, error: null };
    } catch (error) {
      return {
        data: null,
        error: toSafeErrorMessage(error),
      };
    }
  }

  async upsert(
    data: MonthlyReportUpsertData,
  ): Promise<RepositoryResponse<MonthlyReport>> {
    try {
      const result = await this.pool.query<MonthlyReport>(
        `INSERT INTO monthly_reports (house_id, year, month, total_amount, expense_count, pdf_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT (house_id, year, month)
         DO UPDATE SET
           total_amount = EXCLUDED.total_amount,
           expense_count = EXCLUDED.expense_count,
           pdf_url = COALESCE(EXCLUDED.pdf_url, monthly_reports.pdf_url),
           updated_at = NOW()
         RETURNING *`,
        [
          data.house_id,
          data.year,
          data.month,
          data.total_amount,
          data.expense_count,
          data.pdf_url ?? null,
        ],
      );

      return { data: result.rows[0]!, error: null };
    } catch (error) {
      return {
        data: null,
        error: toSafeErrorMessage(error),
      };
    }
  }
}
