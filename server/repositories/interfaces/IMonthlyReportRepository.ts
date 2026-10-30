import type { RepositoryResponse } from './IBaseRepository';

export interface MonthlyReport {
  id: string;
  house_id: string;
  year: number;
  month: number;
  total_amount: number;
  expense_count: number;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlyReportUpsertData {
  house_id: string;
  year: number;
  month: number;
  total_amount: number;
  expense_count: number;
  pdf_url?: string | null;
}

export interface IMonthlyReportRepository {
  getByHouseAndPeriod(
    houseId: string,
    year: number,
    month: number,
  ): Promise<RepositoryResponse<MonthlyReport>>;

  listByHouse(
    houseId: string,
    limit?: number,
  ): Promise<RepositoryResponse<MonthlyReport[]>>;

  upsert(
    data: MonthlyReportUpsertData,
  ): Promise<RepositoryResponse<MonthlyReport>>;
}
