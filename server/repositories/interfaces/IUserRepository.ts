import type { RepositoryResponse } from './IBaseRepository';

/**
 * Allowed occupation types
 */
export const OCCUPATION_TYPES = ['student', 'worker', 'other'] as const;
export type OccupationType = (typeof OCCUPATION_TYPES)[number];

/**
 * User entity
 */
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  bio?: string;
  gender?: string;
  occupation_type?: OccupationType;
  study_field?: string;
  job_title?: string;
  languages?: string[];
  pets?: string;
  telephone?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  linkedin?: string;
  profile_pictures?: string[];
  created_at: string;
  is_first_access?: boolean;
  preferred_currency?: 'USD' | 'EUR' | null;
  consent_version?: number | null;
  terms_accepted_at?: string | null;
  /** Set while the account is in the 30-day deletion grace period. */
  deleted_at?: string | null;
}

/**
 * User update data
 */
export interface UserUpdateData {
  first_name?: string;
  last_name?: string;
  /** Also the sign-in identity. `users.email` carries a UNIQUE constraint. */
  email?: string;
  preferred_currency?: 'USD' | 'EUR';
  avatar_url?: string | null;
  bio?: string | null;
  gender?: string | null;
  occupation_type?: OccupationType | null;
  study_field?: string | null;
  job_title?: string | null;
  languages?: string[] | null;
  pets?: string | null;
  telephone?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  tiktok?: string | null;
  linkedin?: string | null;
  profile_pictures?: string[];
  is_first_access?: boolean;
  terms_accepted_at?: string;
  consent_version?: number;
}

/**
 * User repository interface
 */
export interface IUserRepository {
  /**
   * Get user by ID
   */
  getById(userId: string): Promise<RepositoryResponse<User>>;

  /**
   * Get user by email
   */
  getByEmail(email: string): Promise<RepositoryResponse<User>>;

  /**
   * Create a new user profile
   */
  create(
    userId: string,
    data: Partial<User>,
  ): Promise<RepositoryResponse<User>>;

  /**
   * Update user profile
   */
  update(
    userId: string,
    data: UserUpdateData,
  ): Promise<RepositoryResponse<User>>;

  /**
   * Delete user profile
   */
  delete(userId: string): Promise<RepositoryResponse<void>>;

  /**
   * Check if user exists
   */
  exists(userId: string): Promise<boolean>;

  /**
   * Get users by IDs (for batch operations)
   */
  getByIds(userIds: string[]): Promise<RepositoryResponse<User[]>>;
}
