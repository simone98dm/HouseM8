/**
 * API and response types
 */

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  count?: number;
}

// Filter types
export interface ExpenseFilters {
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  createdBy?: string;
  isPaid?: boolean;
}

export type ExpenseFilter = 'all' | 'pending' | 'settled';
