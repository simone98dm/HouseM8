/**
 * User domain types
 */

export type OccupationType = 'student' | 'worker' | 'other';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  occupation_type?: OccupationType | null;
  study_field?: string | null;
  job_title?: string | null;
  languages?: string[] | null;
  /**
   * A free-text list, not an array: `users.pets` is a TEXT column and the
   * server schema validates `z.string()`. It was typed as `string[]` here, so
   * the profile form sent an array and every save with a pet returned 400.
   */
  pets?: string | null;
  telephone?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  tiktok?: string | null;
  linkedin?: string | null;
  profile_pictures?: string[] | null;
  preferred_currency?: 'USD' | 'EUR' | null;
  rating?: number;
  current_house_id?: string;
  created_at?: string;
  updated_at?: string;
  is_first_access?: boolean;
  consent_version?: number | null;
  terms_accepted_at?: string | null;
  deleted_at?: string | null;
  /** Set by GET /api/users/me while the account is in the deletion grace period. */
  pending_deletion?: boolean;
  deletion_scheduled_for?: string | null;
}

/** What housemates see of a user (GET /api/users/[id]). Never includes email. */
export interface PublicUserProfile extends Pick<
  User,
  'id' | 'first_name' | 'last_name'
> {
  avatar_url: string | null;
  // Present only while the user has granted `profile_sharing`.
  bio?: User['bio'];
  gender?: User['gender'];
  occupation_type?: User['occupation_type'];
  study_field?: User['study_field'];
  job_title?: User['job_title'];
  languages?: User['languages'];
  pets?: User['pets'];
  telephone?: User['telephone'];
  instagram?: User['instagram'];
  twitter?: User['twitter'];
  tiktok?: User['tiktok'];
  linkedin?: User['linkedin'];
  profile_pictures?: User['profile_pictures'];
}

/** One housemate's net balance with the caller, in a single house. */
export interface PendingSummaryCounterpart {
  user: PublicUserProfile;
  /** Integer cents, caller's POV: >0 they owe me, <0 I owe them, 0 even. */
  net_cents: number;
}

export interface PendingSummaryHouse {
  id: string;
  name: string;
  currency: string;
  counterparts: PendingSummaryCounterpart[];
}

/** GET /api/gdpr/pending-summary payload. */
export interface PendingSummary {
  houses: PendingSummaryHouse[];
}

export interface UserState {
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
  lastFetch: Date | null;
}
