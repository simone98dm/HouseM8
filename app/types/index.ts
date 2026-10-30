/**
 * Main types barrel export
 * Re-exports all types from the organized structure for backward compatibility
 */

// Domain types
import type { OccupationType } from './domain/user';
import type { ExpenseCategory } from '~~/shared/constants/categories';
export * from './domain';

// Composable types
export * from './composables';

// API types
export * from './api';

// Legacy aliases for backward compatibility
export type Currency = 'USD' | 'EUR';

// Additional payload types that don't fit elsewhere
export interface CreateExpensePayload {
  description: string;
  total_amount: number;
  due_date?: string;
  recurring?: boolean;
  recurring_period?: string;
  categories?: ExpenseCategory[];
  payer_id?: string;
  user_ids: string[];
  currency?: string;
}

export interface Invitation {
  id: string;
  token: string;
  house_id: string;
  invited_by: string;
  expires_at: string;
  used: boolean;
  created_at: string;
  house?: import('./domain/house').House;
}

/** A house's 6-digit join code: single use, valid until code_expires_at. */
export interface JoinCode {
  code: string;
  code_expires_at: string;
}

export interface CreateBillPayload {
  description: string;
  monthly_cost: number;
  payment_period: 1 | 2 | 6 | 12;
  next_due_date: string;
  currency: string;
  categories?: ExpenseCategory[];
}

export interface UpdateBillPayload {
  description?: string;
  monthly_cost?: number;
  next_due_date?: string;
  payment_period?: number;
  currency?: string;
  categories?: ExpenseCategory[];
  active?: boolean;
}

export interface UpdateProfilePayload {
  is_first_access?: boolean;
  bio?: string | null;
  telephone?: string | null;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  languages?: string[] | null;
  occupation_type?: OccupationType | null;
  study_field?: string | null;
  job_title?: string | null;
  pets?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
  tiktok?: string | null;
}

export interface CreateBulletinNotePayload {
  message: string;
  dismiss_date?: string;
}
