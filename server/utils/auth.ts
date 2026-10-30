import type { H3Event } from 'h3';
import {
  verifyAuthCompat,
  verifyAuthCompatSafe,
  ensureHouseMember,
} from './repository-auth';

/**
 * Verify authentication - throws 401 if not authenticated
 * Now uses repository pattern instead of direct Supabase
 */
export const verifyAuth = async (event: H3Event) => {
  return await verifyAuthCompat(event);
};

/**
 * Verify authentication safely - returns null if not authenticated
 * Now uses repository pattern instead of direct Supabase
 */
export const verifyAuthSafe = async (event: H3Event) => {
  return await verifyAuthCompatSafe(event);
};

/**
 * Verify user is a member of the house
 * Now uses repository pattern instead of direct Supabase
 */
export const verifyHouseMembership = async (
  userId: string,
  houseId: string,
) => {
  await ensureHouseMember(houseId, userId);

  // Return a basic membership object for compatibility
  // The old version returned { role }, but most code doesn't use it
  return { role: 'member' };
};
