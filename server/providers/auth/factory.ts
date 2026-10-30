/**
 * Authentication Provider Factory
 * Creates auth provider instances based on the configured database provider
 */

import type { Pool } from 'pg';
import type { IAuthProvider } from './IAuthProvider';
import { PostgresAuthProvider } from './PostgresAuthProvider';

/**
 * Auth provider factory state
 */
let authProvider: IAuthProvider | null = null;

/**
 * Initialize auth provider with the configured database provider
 */
export function initializeAuthProvider(client: Pool): void {
  authProvider = new PostgresAuthProvider(client);
}

/**
 * Get auth provider instance
 */
export function getAuthProvider(): IAuthProvider {
  if (!authProvider) {
    throw new Error(
      'Auth provider not initialized. Call initializeAuthProvider() first.',
    );
  }

  return authProvider;
}

/**
 * Reset factory (useful for testing)
 */
export function resetAuthProvider(): void {
  authProvider = null;
}
