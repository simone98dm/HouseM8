/**
 * House domain types
 */

import type { User } from './user';

export interface House {
  id: string;
  name: string;
  address: string;
  description?: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  currency: string;
  member_count: number;
  members: HouseMember[];
  invitations: HouseInvitation[];
  max_members?: number | null;
  status: 'active' | 'archived';
}

export interface HouseMember {
  id: string;
  house_id: string;
  user_id: string;
  /**
   * The member's current role. Wider than what can be *assigned*:
   * updateMemberRole accepts only 'admin' | 'member', because there is exactly
   * one owner per house (DB-enforced); 'owner' moves only via
   * transferOwnership.
   */
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  user?: User;
  is_active: boolean;
  left_at?: string | null;
}

export interface HouseInvitation {
  id: string;
  house_id: string;
  code: string;
  expires_at: string;
  created_at: string;
  max_uses: number;
  uses: number;
}
