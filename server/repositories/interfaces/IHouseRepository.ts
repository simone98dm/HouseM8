import type {
  RepositoryResponse,
  PaginatedResponse,
  PaginationParams,
} from './IBaseRepository';
import type { User } from './IUserRepository';

/** What an unauthenticated visitor may learn from an invitation link. */
export interface InvitationPreview {
  house_name: string;
  member_count: number;
}

export type HouseCurrency = 'USD' | 'EUR' | 'GBP';

/**
 * House member entity
 */
export interface HouseMember {
  id: string;
  house_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  left_at?: string | null;
  user?: User;
}

/**
 * House entity
 */
export interface House {
  id: string;
  name: string;
  address?: string;
  description?: string | null;
  currency: HouseCurrency;
  max_members: number;
  owner_id: string;
  created_at: string;
  members?: HouseMember[];
  status: 'active' | 'archived';
}

/**
 * House invitation entity
 * The token-based fields (token, expires_at, used, used_by, used_at) are managed
 * by the existing invite flow and must not be touched by the code flow.
 * The code_* fields are managed independently by the new 6-digit code flow.
 */
export interface HouseInvitation {
  id: string;
  house_id: string;
  invited_email: string;
  invited_by: string;
  token: string;
  expires_at: string;
  used: boolean;
  used_by?: string | null;
  used_at?: string | null;
  created_at: string;
  // 6-digit invite code lifecycle (additive — nullable on legacy rows)
  code?: string | null;
  code_expires_at?: string | null;
  code_used_at?: string | null;
  code_attempts?: number;
  code_locked_until?: string | null;
}

/**
 * House create data
 */
export interface HouseCreateData {
  name: string;
  address?: string;
  currency?: HouseCurrency;
  max_members?: number;
  owner_id: string;
}

/**
 * House update data
 */
export interface HouseUpdateData {
  name?: string;
  /** null clears it. */
  address?: string | null;
  description?: string | null;
  currency?: HouseCurrency;
  max_members?: number;
}

/**
 * House repository interface
 */
export interface IHouseRepository {
  /**
   * Get house by ID with optional member details
   */
  getById(
    houseId: string,
    includeMembers?: boolean,
  ): Promise<RepositoryResponse<House>>;

  /**
   * Get all houses (admin function)
   */
  getAll(
    pagination: PaginationParams,
    includeMembers?: boolean,
  ): Promise<PaginatedResponse<House>>;

  /**
   * Get current house for a user
   */
  getCurrentForUser(userId: string): Promise<RepositoryResponse<House>>;

  /**
   * Create a new house
   */
  create(data: HouseCreateData): Promise<RepositoryResponse<House>>;

  /**
   * Update house details
   */
  update(
    houseId: string,
    data: HouseUpdateData,
  ): Promise<RepositoryResponse<House>>;

  /**
   * Delete a house
   */
  delete(houseId: string): Promise<RepositoryResponse<void>>;

  /**
   * Add member to house
   */
  addMember(
    houseId: string,
    userId: string,
    role?: 'owner' | 'member',
  ): Promise<RepositoryResponse<HouseMember>>;

  /**
   * Remove member from house
   */
  removeMember(
    houseId: string,
    userId: string,
  ): Promise<RepositoryResponse<void>>;

  /**
   * Get house members
   */
  getMembers(houseId: string): Promise<RepositoryResponse<HouseMember[]>>;

  /**
   * Check if user is member of house
   */
  isMember(houseId: string, userId: string): Promise<boolean>;

  /**
   * Check if user is owner of house
   */
  isOwner(houseId: string, userId: string): Promise<boolean>;

  /**
   * Get member role in house
   */
  getMemberRole(
    houseId: string,
    userId: string,
  ): Promise<RepositoryResponse<string>>;

  /**
   * Create house invitation
   */
  createInvitation(
    houseId: string,
    email: string,
    invitedBy: string,
  ): Promise<RepositoryResponse<HouseInvitation>>;

  /**
   * Get invitation by token
   */
  getInvitationByToken(
    token: string,
  ): Promise<RepositoryResponse<HouseInvitation>>;

  /**
   * Public, token-scoped preview of a live invitation: house name and member
   * count only. Errors when the token is unknown, used or expired.
   */
  getInvitationPreview(
    token: string,
  ): Promise<RepositoryResponse<InvitationPreview>>;

  /**
   * Accept invitation
   */
  acceptInvitation(
    token: string,
    userId: string,
  ): Promise<RepositoryResponse<HouseInvitation>>;

  /**
   * Attach a freshly-generated 6-digit code to an existing invitation row.
   * Only writes to code_* columns; never touches token/expires_at/used.
   */
  attachInviteCode(
    invitationId: string,
  ): Promise<RepositoryResponse<{ code: string; code_expires_at: string }>>;

  /**
   * The newest join code an admin can still share: from a link invitation
   * (not one emailed to a specific person), unused, unexpired, not locked.
   * Null when there is none.
   */
  getActiveInviteCode(
    houseId: string,
  ): Promise<
    RepositoryResponse<{ code: string; code_expires_at: string } | null>
  >;

  /**
   * Look up an invitation by its 6-digit code.
   */
  getInvitationByCode(
    code: string,
  ): Promise<RepositoryResponse<HouseInvitation>>;

  /**
   * Atomically redeem a code: add user to house, mark code_used_at.
   * Does NOT touch the token-based columns.
   */
  redeemInviteCode(
    code: string,
    userId: string,
  ): Promise<RepositoryResponse<HouseInvitation>>;

  /**
   * Increment code_attempts; lock for 15 min after 5 failed attempts.
   * No-op if the code does not exist (anti-enumeration safe).
   */
  registerFailedCodeAttempt(code: string): Promise<void>;

  /**
   * Count a failed code redemption against the user (5 per hour, persisted in
   * rate_limits under `redeem-fail:<userId>`).
   */
  registerFailedRedeemAttempt(userId: string): Promise<void>;

  /**
   * True once the user has used up their failed-redemption allowance for the
   * current hour.
   */
  isRedeemBlocked(userId: string): Promise<boolean>;

  /**
   * Check if house is at capacity
   */
  isAtCapacity(houseId: string): Promise<boolean>;

  /**
   * Get all houses a user belongs to (owned or member)
   */
  getHousesForUser(userId: string): Promise<RepositoryResponse<House[]>>;

  /**
   * How many houses this user is the owner of. Distinct from
   * `getHousesForUser`, which also counts houses they merely joined — plan
   * limits apply to houses you create, not ones you were invited into.
   */
  countOwnedHouses(userId: string): Promise<RepositoryResponse<number>>;

  /**
   * Archive a house (sets status to 'archived')
   */
  archiveHouse(houseId: string): Promise<RepositoryResponse<void>>;

  /**
   * Update a member's role in a house
   */
  updateMemberRole(
    houseId: string,
    userId: string,
    role: 'admin' | 'member',
  ): Promise<RepositoryResponse<HouseMember>>;

  /**
   * Atomically move the owner role to another active member; the previous
   * owner becomes a member. Errors: 'NOT_OWNER', 'MEMBER_NOT_FOUND'.
   */
  transferOwnership(
    houseId: string,
    fromUserId: string,
    toUserId: string,
  ): Promise<RepositoryResponse<void>>;
}
