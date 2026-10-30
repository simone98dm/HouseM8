import consola from 'consola';
import type { Pool, QueryResultRow } from 'pg';
import type {
  RepositoryResponse,
  PaginatedResponse,
} from '../interfaces/IBaseRepository';

const PG_ERROR_MESSAGES: Record<string, string> = {
  '23505': 'duplicate key',
  '22P02': 'Invalid identifier',
};

/**
 * Convert a thrown value into a client-safe message. Errors from `pg` carry a
 * string SQLSTATE in `code`; their raw messages leak schema details, so they
 * are logged and replaced. Plain errors thrown deliberately inside repository
 * callbacks ('User not found', 'CODE_LOCKED', ...) pass through unchanged.
 */
export function toSafeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Unknown error';
  const code = (error as Error & { code?: unknown }).code;
  if (typeof code !== 'string') return error.message;
  consola.error('Database error', error);
  return PG_ERROR_MESSAGES[code] ?? 'Database error';
}

export async function repoQuery<T>(
  fn: () => Promise<T>,
): Promise<RepositoryResponse<T>> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: toSafeErrorMessage(error),
    };
  }
}

export async function repoPaginated<T extends QueryResultRow>(
  pool: Pool,
  countSql: string,
  dataSql: string,
  params: unknown[],
  options?: { limit?: number; offset?: number },
): Promise<PaginatedResponse<T>> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  try {
    const countResult = await pool.query<{ count: string }>(countSql, params);
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);
    const dataResult = await pool.query<T>(dataSql, [...params, limit, offset]);
    return { data: dataResult.rows, error: null, total };
  } catch (error) {
    return {
      data: [],
      error: toSafeErrorMessage(error),
      total: 0,
    };
  }
}
