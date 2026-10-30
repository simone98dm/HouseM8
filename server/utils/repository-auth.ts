/**
 * Repository-based authentication utilities
 * Compatible with PostgreSQL providers
 */

import type { H3Event } from 'h3';
import type { AuthUser } from '~~/server/providers/auth/IAuthProvider';
import { getAuthProvider as getAuthProviderFactory } from '~~/server/providers/auth/factory';
import { getRepositories } from '~~/server/repositories/factory';

/**
 * Verify authentication compatible with repository pattern
 * @param event - H3 event object
 * @returns Authenticated user
 * @throws 401 error if not authenticated
 */
export async function verifyAuthCompat(event: H3Event): Promise<AuthUser> {
  try {
    const authProvider = getAuthProviderFactory();
    const user = await authProvider.getCurrentUser(event);

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required',
      });
    }

    return user;
  } catch (error) {
    // Only convert actual auth errors to 401; re-throw other failures (DB, network)
    const status = (error as { statusCode?: number }).statusCode;
    if (!status || status === 401 || status === 403) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required',
      });
    }
    throw error;
  }
}

/**
 * Verify authentication and return null if not authenticated (safe version)
 * @param event - H3 event object
 * @returns Authenticated user or null
 */
export async function verifyAuthCompatSafe(
  event: H3Event,
): Promise<AuthUser | null> {
  try {
    const authProvider = getAuthProviderFactory();
    return await authProvider.getCurrentUser(event);
  } catch {
    return null;
  }
}

/**
 * Verify user is a member of the house
 * @param houseId - House ID
 * @param userId - User ID
 * @throws 403 error if not a member
 */
export async function ensureHouseMember(
  houseId: string,
  userId: string,
): Promise<void> {
  const repos = getRepositories();
  const isMember = await repos.houses.isMember(houseId, userId);

  if (!isMember) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Not a member of this house',
    });
  }
}

/**
 * Verify user is the owner of the house
 * @param houseId - House ID
 * @param userId - User ID
 * @throws 403 error if not the owner
 */
export async function ensureHouseOwner(
  houseId: string,
  userId: string,
): Promise<void> {
  const repos = getRepositories();
  const isOwner = await repos.houses.isOwner(houseId, userId);

  if (!isOwner) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only house owner can perform this action',
    });
  }
}

/**
 * Verify the user may act as a house administrator: the owner, or a delegated
 * `admin`.
 *
 * Role model (see migration 20260819000000_house_roles.sql):
 * - `owner`  exactly one per house, DB-enforced. Full control. Cannot be
 *            demoted, removed, or leave; archiving the house is its only exit.
 * - `admin`  delegated. Member rights plus: add members, generate invitation
 *            links, promote other members to admin. Many allowed per house.
 * - `member` base role.
 *
 * Use this for "can administer membership". Use ensureHouseOwner for the
 * owner-only powers: editing house details, removing members, closing reports,
 * changing the subscription, archiving the house.
 *
 * @throws 403 if the user is neither owner nor admin of the house
 */
export async function ensureHouseAdmin(
  houseId: string,
  userId: string,
): Promise<void> {
  const repos = getRepositories();
  const { data: role } = await repos.houses.getMemberRole(houseId, userId);

  if (role !== 'owner' && role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only the house owner or an admin can perform this action',
    });
  }
}

/**
 * Verify user is the creator of an expense
 * @param expenseId - Expense ID
 * @param userId - User ID
 * @throws 403 error if not the creator
 */
export async function ensureExpenseCreator(
  expenseId: string,
  userId: string,
): Promise<void> {
  const repos = getRepositories();
  const isCreator = await repos.expenses.isCreator(expenseId, userId);

  if (!isCreator) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only expense creator can perform this action',
    });
  }
}

/**
 * Verify user is the creator of a bill
 * @param billId - Bill ID
 * @param userId - User ID
 * @throws 403 error if not the creator
 */
export async function ensureBillCreator(
  billId: string,
  userId: string,
): Promise<void> {
  const repos = getRepositories();
  const isCreator = await repos.bills.isCreator(billId, userId);

  if (!isCreator) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only bill creator can perform this action',
    });
  }
}

/**
 * Verify user is the creator of a bulletin note
 * @param noteId - Note ID
 * @param userId - User ID
 * @throws 403 error if not the creator
 */
export async function ensureBulletinNoteCreator(
  noteId: string,
  userId: string,
): Promise<void> {
  const repos = getRepositories();
  const isCreator = await repos.bulletinNotes.isCreator(noteId, userId);

  if (!isCreator) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only note creator can perform this action',
    });
  }
}
