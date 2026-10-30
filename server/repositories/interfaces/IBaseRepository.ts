/**
 * Base repository response type
 */
export interface RepositoryResponse<T> {
  data: T | null;
  error: string | null;
  count?: number;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  error: string | null;
  total: number;
  limit?: number;
  offset?: number;
}
