import type { RepositoryResponse, PaginatedResponse } from './IBaseRepository';
import type { User } from './IUserRepository';
import type { ExpenseCategory } from '~~/shared/constants/categories';

/**
 * Bill document entity
 */
export interface BillDocument {
  id: string;
  bill_id: string;
  filename: string;
  url: string;
  uploaded_by: string;
  uploaded_at: string;
}

/**
 * Bill entity
 */
export interface Bill {
  id: string;
  house_id: string;
  description: string;
  monthly_cost: number;
  payment_period: number; // Billing period in months (1, 2, 6, or 12)
  next_due_date: string;
  created_by: string;
  active: boolean;
  categories: ExpenseCategory[];
  created_at: string;
  updated_at: string;
  creator?: User;
  documents?: BillDocument[];
}

/**
 * Bill create data
 */
export interface BillCreateData {
  house_id: string;
  description: string;
  monthly_cost: number;
  payment_period?: number;
  next_due_date: string;
  created_by: string;
  active?: boolean;
  categories?: ExpenseCategory[];
}

/**
 * Bill update data
 */
export interface BillUpdateData {
  description?: string;
  monthly_cost?: number;
  payment_period?: number;
  next_due_date?: string;
  active?: boolean;
  categories?: ExpenseCategory[];
}

/**
 * Bill repository interface
 */
export interface IBillRepository {
  /**
   * Get bill by ID with creator and documents
   */
  getById(billId: string): Promise<RepositoryResponse<Bill>>;

  /**
   * Get bills for a house with optional filtering and pagination
   */
  getByHouse(
    houseId: string,
    options?: {
      activeOnly?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<PaginatedResponse<Bill>>;

  /**
   * Create a new bill
   */
  create(data: BillCreateData): Promise<RepositoryResponse<Bill>>;

  /**
   * Update bill details
   */
  update(
    billId: string,
    data: BillUpdateData,
  ): Promise<RepositoryResponse<Bill>>;

  /**
   * Delete a bill
   */
  delete(billId: string): Promise<RepositoryResponse<void>>;

  /**
   * Get bill documents
   */
  getDocuments(billId: string): Promise<RepositoryResponse<BillDocument[]>>;

  /**
   * Add document to bill
   */
  addDocument(
    billId: string,
    filename: string,
    url: string,
    uploadedBy: string,
  ): Promise<RepositoryResponse<BillDocument>>;

  /**
   * Delete bill document
   */
  deleteDocument(documentId: string): Promise<RepositoryResponse<void>>;

  /**
   * Get upcoming bills (due within specified days)
   */
  getUpcoming(
    houseId: string,
    daysAhead: number,
  ): Promise<RepositoryResponse<Bill[]>>;

  /**
   * Check if user is creator of bill
   */
  isCreator(billId: string, userId: string): Promise<boolean>;

  /**
   * Advance next_due_date by payment_period months. Returns updated bill.
   */
  advanceDueDate(billId: string): Promise<RepositoryResponse<Bill>>;

  /**
   * Get all active bills across all houses (used by cron).
   */
  getActiveBills(): Promise<RepositoryResponse<Bill[]>>;

  /**
   * Check if a reminder has already been sent for this bill/period/days combination.
   */
  checkReminderSent(
    billId: string,
    duePeriod: string,
    daysBefore: number,
  ): Promise<boolean>;

  /**
   * Record that a reminder was sent (idempotent via ON CONFLICT DO NOTHING).
   */
  markReminderSent(
    billId: string,
    duePeriod: string,
    daysBefore: number,
  ): Promise<void>;
}
