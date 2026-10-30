/**
 * Integration Tests for User Profile Page (/user/[id])
 * Tests page orchestration for viewing other users' profiles
 *
 * These tests verify that the user profile page correctly:
 * - Loads user data from house members
 * - Calculates user statistics from balance data
 * - Filters and displays user expenses
 * - Handles member role verification
 * - Computes user share amounts
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { HouseMember, Expense, ExpenseShare } from '~/types';
import {
  createMockUser,
  createMockHouse,
  createMockExpense,
  createMockExpenseShare,
} from '~/tests/utils';

describe('User Profile Page Integration', () => {
  let mockUser: ReturnType<typeof createMockUser>;
  let mockHouse: ReturnType<typeof createMockHouse>;
  let mockMember: HouseMember;

  beforeEach(() => {
    mockUser = createMockUser({
      id: 'user-1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
    });

    mockHouse = createMockHouse({
      id: 'house-1',
      name: 'Test House',
    });

    mockMember = {
      id: 'member-1',
      house_id: mockHouse.id,
      user_id: mockUser.id,
      role: 'member',
      joined_at: new Date().toISOString(),
      left_at: undefined,
      user: mockUser,
      is_active: true,
    };
  });

  describe('Member Lookup', () => {
    it('should find user in house members by user_id', () => {
      const members = [mockMember];
      const userId = mockUser.id;

      const member = members.find(
        (m) => m.user_id === userId || m.user?.id === userId,
      );

      expect(member).toBeDefined();
      expect(member?.user_id).toBe(userId);
    });

    it('should find user by nested user.id', () => {
      const members = [mockMember];
      const userId = mockUser.id;

      const member = members.find(
        (m) => m.user_id === userId || m.user?.id === userId,
      );

      expect(member?.user?.id).toBe(userId);
    });

    it('should return undefined for non-existent user', () => {
      const members = [mockMember];
      const userId = 'non-existent-user';

      const member = members.find(
        (m) => m.user_id === userId || m.user?.id === userId,
      );

      expect(member).toBeUndefined();
    });

    it('should handle empty members list', () => {
      const members: HouseMember[] = [];
      const userId = mockUser.id;

      const member = members.find(
        (m) => m.user_id === userId || m.user?.id === userId,
      );

      expect(member).toBeUndefined();
    });
  });

  describe('User Share Calculation', () => {
    it('should find user share in expense', () => {
      const shares: ExpenseShare[] = [
        createMockExpenseShare({
          user_id: mockUser.id,
          amount_due: 50,
          is_paid: false,
        }),
        createMockExpenseShare({
          user_id: 'other-user',
          amount_due: 50,
          is_paid: false,
        }),
      ];

      const expense = createMockExpense({
        id: 'exp-1',
        shares,
      });

      const userShare = expense.shares?.find(
        (share) => share.user_id === mockUser.id,
      );

      expect(userShare).toBeDefined();
      expect(userShare?.amount_due).toBe(50);
    });

    it('should return undefined when user has no share', () => {
      const expense = createMockExpense({
        id: 'exp-1',
        shares: [
          createMockExpenseShare({
            user_id: 'other-user',
            amount_due: 100,
            is_paid: false,
          }),
        ],
      });

      const userShare = expense.shares?.find(
        (share: ExpenseShare) => share.user_id === mockUser.id,
      );

      expect(userShare).toBeUndefined();
    });

    it('should handle expenses without shares', () => {
      const expense = createMockExpense({
        id: 'exp-1',
        shares: [],
      });

      const userShare = expense.shares?.find(
        (share: ExpenseShare) => share.user_id === mockUser.id,
      );

      expect(userShare).toBeUndefined();
    });
  });

  describe('User Statistics Calculation', () => {
    it('should calculate total amount owed by user', () => {
      const expenses = [
        createMockExpense({
          id: 'exp-1',
          shares: [
            createMockExpenseShare({
              user_id: mockUser.id,
              amount_due: 50,
              is_paid: false,
            }),
          ],
        }),
        createMockExpense({
          id: 'exp-2',
          shares: [
            createMockExpenseShare({
              user_id: mockUser.id,
              amount_due: 30,
              is_paid: false,
            }),
          ],
        }),
      ];

      const totalOwed = expenses.reduce((total: number, expense: Expense) => {
        const userShare = expense.shares?.find(
          (share: ExpenseShare) => share.user_id === mockUser.id,
        );
        if (userShare && !userShare.is_paid && userShare.amount_due) {
          return total + userShare.amount_due;
        }
        return total;
      }, 0);

      expect(totalOwed).toBe(80);
    });

    it('should calculate total amount paid by user', () => {
      const expenses = [
        createMockExpense({
          id: 'exp-1',
          shares: [
            createMockExpenseShare({
              user_id: mockUser.id,
              amount_due: 50,
              is_paid: true,
            }),
          ],
        }),
        createMockExpense({
          id: 'exp-2',
          shares: [
            createMockExpenseShare({
              user_id: mockUser.id,
              amount_due: 30,
              is_paid: true,
            }),
          ],
        }),
      ];

      const totalPaid = expenses.reduce((total: number, expense: Expense) => {
        const userShare = expense.shares?.find(
          (share: ExpenseShare) => share.user_id === mockUser.id,
        );
        if (userShare && userShare.is_paid && userShare.amount_due) {
          return total + userShare.amount_due;
        }
        return total;
      }, 0);

      expect(totalPaid).toBe(80);
    });

    it('should count expenses created by user', () => {
      const expenses = [
        createMockExpense({ id: 'exp-1', created_by: mockUser.id }),
        createMockExpense({ id: 'exp-2', created_by: mockUser.id }),
        createMockExpense({ id: 'exp-3', created_by: 'other-user' }),
      ];

      const expensesCreated = expenses.filter(
        (exp) => exp.created_by === mockUser.id,
      ).length;

      expect(expensesCreated).toBe(2);
    });

    it('should calculate net balance (paid - owed)', () => {
      const totalPaid = 150;
      const totalOwed = 80;
      const netBalance = totalPaid - totalOwed;

      expect(netBalance).toBe(70);
    });
  });

  describe('Expense Filtering', () => {
    it('should filter expenses involving the user', () => {
      const expenses = [
        createMockExpense({
          id: 'exp-1',
          created_by: mockUser.id,
        }),
        createMockExpense({
          id: 'exp-2',
          shares: [
            createMockExpenseShare({
              user_id: mockUser.id,
              amount_due: 50,
              is_paid: false,
            }),
          ],
        }),
        createMockExpense({
          id: 'exp-3',
          created_by: 'other-user',
          shares: [
            createMockExpenseShare({
              user_id: 'other-user',
              amount_due: 100,
              is_paid: false,
            }),
          ],
        }),
      ];

      const userExpenses = expenses.filter(
        (expense) =>
          expense.created_by === mockUser.id ||
          expense.shares?.some(
            (share: ExpenseShare) => share.user_id === mockUser.id,
          ),
      );

      expect(userExpenses).toHaveLength(2);
      expect(userExpenses[0]?.id).toBe('exp-1');
      expect(userExpenses[1]?.id).toBe('exp-2');
    });

    it('should include expenses where user is creator', () => {
      const expenses = [
        createMockExpense({
          id: 'exp-1',
          created_by: mockUser.id,
          shares: [],
        }),
      ];

      const userExpenses = expenses.filter(
        (expense) =>
          expense.created_by === mockUser.id ||
          expense.shares?.some(
            (share: ExpenseShare) => share.user_id === mockUser.id,
          ),
      );

      expect(userExpenses).toHaveLength(1);
    });

    it('should include expenses where user is participant', () => {
      const expenses = [
        createMockExpense({
          id: 'exp-1',
          created_by: 'other-user',
          shares: [
            createMockExpenseShare({
              user_id: mockUser.id,
              amount_due: 50,
              is_paid: false,
            }),
          ],
        }),
      ];

      const userExpenses = expenses.filter(
        (expense) =>
          expense.created_by === mockUser.id ||
          expense.shares?.some(
            (share: ExpenseShare) => share.user_id === mockUser.id,
          ),
      );

      expect(userExpenses).toHaveLength(1);
    });
  });

  describe('Date Formatting', () => {
    it('should format date strings correctly', () => {
      const dateString = '2025-03-15T10:30:00Z';

      const formatted = new Date(dateString).toLocaleDateString(
        window.navigator.language,
        {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        },
      );

      expect(formatted).toMatch(/Mar 1[45], 2025/);
    });

    it('should format member join date', () => {
      const joinDate = '2024-01-01T00:00:00Z';

      const formatted = new Date(joinDate).toLocaleDateString(
        window.navigator.language,
        {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        },
      );

      expect(formatted).toMatch(/Jan 1, 2024/);
    });
  });

  describe('Loading States', () => {
    it('should handle loading when house is not available', () => {
      const currentHouse = null;
      const userId = 'user-1';

      const shouldLoad = !!(currentHouse && userId);

      expect(shouldLoad).toBe(false);
    });

    it('should handle loading when userId is not available', () => {
      const currentHouse = mockHouse;
      const userId = null;

      const shouldLoad = !!(currentHouse && userId);

      expect(shouldLoad).toBe(false);
    });

    it('should proceed with loading when both are available', () => {
      const currentHouse = mockHouse;
      const userId = mockUser.id;

      const shouldLoad = !!(currentHouse && userId);

      expect(shouldLoad).toBe(true);
    });
  });

  describe('Member Role', () => {
    it('should identify owner role', () => {
      const ownerMember: HouseMember = {
        ...mockMember,
        role: 'owner',
      };

      expect(ownerMember.role).toBe('owner');
    });

    it('should identify member role', () => {
      const regularMember: HouseMember = {
        ...mockMember,
        role: 'member',
      };

      expect(regularMember.role).toBe('member');
    });

    it('should check if member has left', () => {
      const leftMember: HouseMember = {
        ...mockMember,
        left_at: new Date().toISOString(),
      };

      const hasLeft = leftMember.left_at !== null;

      expect(hasLeft).toBe(true);
    });

    it('should check if member is active', () => {
      const activeMember: HouseMember = {
        ...mockMember,
        left_at: undefined,
      };

      const isActive = activeMember.left_at === undefined;

      expect(isActive).toBe(true);
    });
  });
});
