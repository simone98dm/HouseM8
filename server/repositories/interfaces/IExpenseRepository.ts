import type {
  RepositoryResponse,
  PaginatedResponse,
  PaginationParams,
} from './IBaseRepository';
import type { User } from './IUserRepository';
import type { ExpenseCategory } from '~~/shared/constants/categories';

export type RecurringPeriod = 'weekly' | 'monthly' | 'yearly';

/**
 * Expense share entity
 */
export interface ExpenseShare {
  id: string;
  expense_id: string;
  user_id: string;
  amount_due: number;
  is_paid: boolean;
  paid_at?: string | null;
  users?: User;
}

/**
 * Expense entity
 */
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
  recurring_period?: RecurringPeriod | null;
  categories: ExpenseCategory[];
  creator?: User;
  expense_shares?: ExpenseShare[];
  shares?: ExpenseShare[]; // Frontend compatibility alias
}

/**
 * Expense create data
 */
export interface ExpenseCreateData {
  house_id: string;
  created_by: string;
  description: string;
  total_amount: number;
  currency: string;
  due_date?: string | null;
  recurring?: boolean;
  recurring_period?: RecurringPeriod | null;
  categories?: ExpenseCategory[];
  user_ids: string[]; // Users to split the expense with
}

/**
 * Expense update data
 */
export interface ExpenseUpdateData {
  description?: string;
  total_amount?: number;
  due_date?: string | null;
  recurring?: boolean;
  recurring_period?: RecurringPeriod | null;
  categories?: ExpenseCategory[];
}

/**
 * Expense share update data
 */
export interface ExpenseShareUpdateData {
  is_paid?: boolean;
  paid_at?: string | null;
}

/**
 * Expense filter options
 */
export interface ExpenseFilterOptions {
  status?: 'pending' | 'settled';
  user_id?: string;
  from?: string;
  to?: string;
}

/**
 * Expense repository interface
 */
export type SettlementKind = 'settlement' | 'share';

export interface Settlement {
  id: string;
  house_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  kind: SettlementKind;
  created_by: string;
  created_at: string;
  undone_at: string | null;
}

/** A payment as listed on the balance page (public profile of both sides). */
export interface SettlementListItem extends Settlement {
  from_user: Pick<User, 'id' | 'first_name' | 'avatar_url'> | null;
  to_user: Pick<User, 'id' | 'first_name' | 'avatar_url'> | null;
}

export interface RecordSettlementResult {
  settlementId: string;
  /** Shares marked paid by the FIFO display allocation. */
  allocatedCount: number;
  /** Amount recorded: taken from the plan recomputed inside the transaction. */
  amount: number;
}

export interface IExpenseRepository {
  /**
   * Get expense by ID with creator and shares
   */
  getById(expenseId: string): Promise<RepositoryResponse<Expense>>;

  /**
   * Get expenses for a house with pagination and filters
   */
  getByHouse(
    houseId: string,
    pagination: PaginationParams,
    filters?: ExpenseFilterOptions,
  ): Promise<PaginatedResponse<Expense>>;

  /**
   * Create a new expense with shares
   */
  create(data: ExpenseCreateData): Promise<RepositoryResponse<Expense>>;

  /**
   * Update expense details
   */
  update(
    expenseId: string,
    data: ExpenseUpdateData,
  ): Promise<RepositoryResponse<Expense>>;

  /**
   * Delete an expense
   */
  delete(expenseId: string): Promise<RepositoryResponse<void>>;

  /**
   * Get expense shares for an expense
   */
  getShares(expenseId: string): Promise<RepositoryResponse<ExpenseShare[]>>;

  /**
   * Get a single expense share by ID with expense details
   */
  getShareById(
    shareId: string,
  ): Promise<
    RepositoryResponse<
      ExpenseShare & { expense?: { id: string; house_id: string } }
    >
  >;

  /**
   * Update expense share payment status. In one transaction it also records
   * (is_paid true) or undoes (false) the matching `kind='share'` payment.
   * Errors with 'SHARE_PAID_BY_SETTLEMENT' when unpaying a share that a plan
   * settlement paid (undo the settlement instead).
   */
  updateShare(
    shareId: string,
    data: ExpenseShareUpdateData,
  ): Promise<RepositoryResponse<ExpenseShare>>;

  /**
   * Mark multiple shares as paid (already-paid ones are skipped) and record a
   * `kind='share'` payment for each, atomically.
   */
  markSharesAsPaid(shareIds: string[]): Promise<RepositoryResponse<void>>;

  /**
   * Record one plan payment (`kind='settlement'`) from -> to. Under a per-house
   * lock it recomputes the settle-up plan, takes the amount from that plan and
   * fails with `NOT_IN_PLAN` if the pair is no longer a transfer of it (so two
   * concurrent requests cannot both pay). Then allocates it FIFO (oldest due/created first) to the debtor's unpaid shares
   * on expenses the creditor created: whole shares only, tagged with
   * settlement_id. The allocation is display-only; balances come from the
   * payment row. One transaction.
   */
  recordSettlement(
    houseId: string,
    fromUserId: string,
    toUserId: string,
    createdBy: string,
  ): Promise<RepositoryResponse<RecordSettlementResult>>;

  /** Settlement row, scoped to the house. Data is null when not found. */
  getSettlement(
    houseId: string,
    settlementId: string,
  ): Promise<RepositoryResponse<Settlement | null>>;

  /** Most recent payments of the house (newest first), undone ones included. */
  listSettlements(
    houseId: string,
    limit: number,
  ): Promise<RepositoryResponse<SettlementListItem[]>>;

  /**
   * Revert a settlement in one transaction: unpay exactly the shares tagged
   * with it and stamp `undone_at`. Errors with 'ALREADY_UNDONE' (also when a
   * concurrent undo won) or 'SETTLEMENT_NOT_FOUND'. Callers check authorization
   * and the undo window first. Data is the number of shares reverted.
   */
  undoSettlement(
    houseId: string,
    settlementId: string,
  ): Promise<RepositoryResponse<{ count: number }>>;

  /**
   * Get pending expenses for a user
   */
  getPendingForUser(
    userId: string,
    houseId: string,
  ): Promise<RepositoryResponse<Expense[]>>;

  /**
   * Check if user is creator of expense
   */
  isCreator(expenseId: string, userId: string): Promise<boolean>;

  /**
   * Get distinct house IDs that have expenses within a date range
   */
  getHouseIdsWithExpensesBetween(
    from: string,
    to: string,
  ): Promise<RepositoryResponse<string[]>>;
}
