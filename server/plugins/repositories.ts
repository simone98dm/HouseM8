/**
 * Server plugin to initialize repository pattern
 * This runs once when the Nuxt server starts
 */

import { initializeRepositories } from '~~/server/repositories/factory';
import { initializeAuthProvider } from '~~/server/providers/auth/factory';
import { getPostgresPool } from '~~/server/utils/postgres';

export default defineNitroPlugin(() => {
  // Initialize PostgreSQL client
  const pool = getPostgresPool();

  // Initialize repositories with PostgreSQL
  initializeRepositories(pool);
  initializeAuthProvider(pool);
});
