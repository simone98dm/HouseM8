/**
 * Expense domain types
 */

import type { User } from './user';
import type { ExpenseCategory } from '~~/shared/constants/categories';

export interface Expense {
  id: string;
  house_id: string;
  created_by: string;
  description: string;
  total_amount: number;
  currency?: string;
  created_at: string;
  updated_at: string;
  due_date?: string | null;
  recurring: boolean;
  recurring_period?: 'weekly' | 'monthly' | 'yearly' | null;
  categories?: ExpenseCategory[];
  creator?: User;
  payer?: User;
  expense_shares?: ExpenseShare[];
  shares?: ExpenseShare[]; // Frontend compatibility alias
  // Legacy fields for backward compatibility
  payer_id?: string;
  amount?: string;
  date?: string;
}

export interface ExpenseShare {
  id: string;
  expense_id: string;
  user_id: string;
  amount_due: number;
  amount?: string; // Legacy support
  is_paid: boolean;
  paid?: boolean; // Legacy support
  paid_at?: string | null;
  user?: User; // Backend field name
}

export interface ExpenseFilterOptions {
  category?: string;
  payer_id?: string;
  date_from?: string;
  date_to?: string;
}
