import type { RepositoryResponse } from './IBaseRepository';
import type { User } from './IUserRepository';

/**
 * Balance summary for a user
 */
export interface UserBalance {
  user_id: string;
  user?: User;
  total_owed: number; // Amount the user owes to others
  total_owed_to_user: number; // Amount others owe to the user
  net_balance: number; // Negative = user owes, Positive = user is owed
  pending_expenses_count: number;
}

/**
 * Detailed balance breakdown between two users
 */
export interface UserToUserBalance {
  from_user_id: string;
  to_user_id: string;
  from_user?: User;
  to_user?: User;
  amount: number;
  expense_count: number;
  /** 'YYYY-MM-DD' or null; see PostgresBalanceRepository.buildSettlementTransfers. */
  due_date: string | null;
}

/**
 * House balance summary
 */
export interface HouseBalance {
  house_id: string;
  total_expenses: number;
  total_paid: number;
  total_pending: number;
  user_balances: UserBalance[];
  user_to_user_balances: UserToUserBalance[];
}

/**
 * Balance repository interface
 */
export interface IBalanceRepository {
  /**
   * Get complete balance summary for a house
   */
  getHouseBalance(houseId: string): Promise<RepositoryResponse<HouseBalance>>;

  /**
   * Get balance for a specific user in a house
   */
  getUserBalance(
    houseId: string,
    userId: string,
  ): Promise<RepositoryResponse<UserBalance>>;

  /**
   * Get balance between two users
   */
  getUserToUserBalance(
    houseId: string,
    fromUserId: string,
    toUserId: string,
  ): Promise<RepositoryResponse<UserToUserBalance>>;

  /**
   * Get all user-to-user balances for a house
   */
  getAllUserToUserBalances(
    houseId: string,
  ): Promise<RepositoryResponse<UserToUserBalance[]>>;
}
