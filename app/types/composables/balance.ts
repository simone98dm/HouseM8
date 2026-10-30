/**
 * Balance composable types
 */

export interface UserBalance {
  user_id: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
  };
  total_paid: number;
  total_owed: number;
  net_balance: number;
}

export interface SettlementTransaction {
  from_user_id: string;
  to_user_id: string;
  amount: number;
  /** 'YYYY-MM-DD'; the earliest date the debtor has to pay by, if any. */
  due_date?: string | null;
  from_user: {
    id: string;
    first_name: string;
    last_name: string;
  };
  to_user: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface HouseBalance {
  house_id: string;
  currency: string;
  user_balances: UserBalance[];
  settlement_transactions: SettlementTransaction[];
  total_expenses: number;
  is_balanced: boolean;
}

/** One row of GET /api/houses/:id/settlements (the "Recent payments" list). */
export interface RecentPayment {
  id: string;
  from_user: { id: string; first_name: string; avatar_url?: string | null };
  to_user: { id: string; first_name: string; avatar_url?: string | null };
  amount: number;
  kind: 'settlement' | 'share';
  created_at: string;
  undone_at: string | null;
  /** Caller is a participant, within the 24h window, and it is not undone yet. */
  can_undo: boolean;
}
