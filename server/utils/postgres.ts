/**
 * PostgreSQL connection utilities
 */

import consola from 'consola';
import { Pool } from 'pg';
import type { PoolClient, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { SUPABASE_CA_CERT } from './postgres-ca';

let pool: Pool | null = null;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * Build the pool config. `POSTGRES_URL` wins over the discrete fields. TLS with
 * certificate verification is on unless the host is local or
 * `POSTGRES_SSL=disable` is set; never `rejectUnauthorized: false`.
 */
export function buildPoolConfig(): PoolConfig {
  const config = useRuntimeConfig();
  const url = config.postgresUrl || process.env.POSTGRES_URL || '';

  let host: string;
  let base: PoolConfig;
  let connectionString: string | undefined;

  if (url) {
    const parsed = new URL(url);
    host = parsed.hostname;
    // pg lets URL params (sslmode) override the ssl option; we own TLS config.
    parsed.searchParams.delete('sslmode');
    connectionString = parsed.toString();
    base = { connectionString };
  } else {
    host = config.postgresHost || process.env.POSTGRES_HOST || 'localhost';
    base = {
      host,
      port: Number.parseInt(
        config.postgresPort || process.env.POSTGRES_PORT || '5432',
      ),
      database:
        config.postgresDatabase || process.env.POSTGRES_DATABASE || 'house_m8',
      user: config.postgresUser || process.env.POSTGRES_USER || 'postgres',
      password: config.postgresPassword || process.env.POSTGRES_PASSWORD || '',
    };
  }

  const tlsDisabled =
    process.env.POSTGRES_SSL === 'disable' || LOCAL_HOSTS.has(host);

  return {
    ...base,
    ...(tlsDisabled
      ? {}
      : {
          ssl: {
            ca: process.env.POSTGRES_CA_CERT || SUPABASE_CA_CERT,
            rejectUnauthorized: true,
          },
        }),
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

/**
 * Get or create PostgreSQL connection pool
 */
export function getPostgresPool(): Pool {
  if (!pool) {
    pool = new Pool(buildPoolConfig());

    // Handle pool errors
    pool.on('error', (err) => {
      consola.error('Unexpected error on idle PostgreSQL client', err);
    });
  }

  return pool;
}

/**
 * Execute a query with automatic client management
 */
export async function executeQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    const result = await client.query<T>(text, params);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Execute a transaction with automatic rollback on error
 */
export async function executeTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close the connection pool (for graceful shutdown)
 */
export async function closePostgresPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
