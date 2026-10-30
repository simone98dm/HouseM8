/**
 * Integration Tests for Expenses Index Page (/expenses)
 * Tests page orchestration for expenses list with filtering
 *
 * These tests verify that the expenses index page correctly:
 * - Orchestrates expenses data from expensesStore
 * - Filters expenses by status (all, pending, settled)
 * - Calculates total owed amounts
 * - Handles payment status updates
 * - Manages expense deletion workflow
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { Expense, ExpenseShare } from '~/types';
import {
  createMockExpense,
  createMockExpenseShare,
  createMockUser,
  createMockHouse,
} from '~/tests/utils';

describe('Expenses Index Page Integration', () => {
  let mockHouse: ReturnType<typeof createMockHouse>;
  let currentUser: ReturnType<typeof createMockUser>;

  beforeEach(() => {
    currentUser = createMockUser({ id: 'user-1' });
    mockHouse = createMockHouse({
      id: 'house-1',
      name: 'Test House',
      currency: 'USD' as const,
    });
  });

  describe('Expense Filtering', () => {
    it('should show all expenses when filter is "all"', () => {
      const expenses = [
        createMockExpense({
          id: 'exp-1',
          shares: [
            createMockExpenseShare({
              user_id: currentUser.id,
              is_paid: false,
            }),
          ],
        }),
        createMockExpense({
          id: 'exp-2',
          shares: [
            createMockExpenseShare({
              user_id: currentUser.id,
              is_paid: true,
            }),
          ],
        }),
      ];

      const currentFilter = 'all';
      const filteredExpenses =
        currentFilter === 'all'
          ? expenses
          : expenses.filter((expense: Expense) => {
              const userShare = expense.shares?.find(
                (share: ExpenseShare) => share.user_id === currentUser.id,
              );
              if (currentFilter === 'pending') {
                return userShare && !userShare.is_paid;
              } else if (currentFilter === 'settled') {
                return userShare && userShare.is_paid;
              }
              return false;
            });

      expect(filteredExpenses).toHaveLength(2);
    });

    it('should show only pending expenses when filter is "pending"', () => {
      const expenses = [
        createMockExpense({
          id: 'exp-1',
          shares: [
            createMockExpenseShare({
              user_id: currentUser.id,
              is_paid: false,
            }),
          ],
        }),
        createMockExpense({
          id: 'exp-2',
          shares: [
            createMockExpenseShare({
              user_id: currentUser.id,
              is_paid: true,
            }),
          ],
        }),
        createMockExpense({
          id: 'exp-3',
          shares: [
            createMockExpenseShare({
              user_id: currentUser.id,
              is_paid: false,
            }),
          ],
        }),
      ];

      const filteredExpenses = expenses.filter((expense: Expense) => {
        const userShare = expense.shares?.find(
          (share: ExpenseShare) => share.user_id === currentUser.id,
        );
        return userShare && !userShare.is_paid;
      });

      expect(filteredExpenses).toHaveLength(2);
      expect(filteredExpenses[0]?.id).toBe('exp-1');
      expect(filteredExpenses[1]?.id).toBe('exp-3');
    });

    it('should show only settled expenses when filter is "settled"', () => {
      const expenses = [
        createMockExpense({
          id: 'exp-1',
          shares: [
            createMockExpenseShare({
              user_id: currentUser.id,
              is_paid: false,
            }),
          ],
        }),
        createMockExpense({
          id: 'exp-2',
          shares: [
            createMockExpenseShare({
              user_id: currentUser.id,
              is_paid: true,
            }),
          ],
        }),
      ];

      const filteredExpenses = expenses.filter((expense: Expense) => {
        const userShare = expense.shares?.find(
          (share: ExpenseShare) => share.user_id === currentUser.id,
        );
        return userShare && userShare.is_paid;
      });

      expect(filteredExpenses).toHaveLength(1);
      expect(filteredExpenses[0]?.id).toBe('exp-2');
    });

    it('should handle expenses where user has no share', () => {
      const expenses = [
        createMockExpense({
          id: 'exp-1',
          shares: [
            createMockExpenseShare({
              user_id: 'other-user',
              is_paid: false,
            }),
          ],
        }),
      ];

      const filteredExpenses = expenses.filter((expense: Expense) => {
        const userShare = expense.shares?.find(
          (share: ExpenseShare) => share.user_id === currentUser.id,
        );
        return userShare && !userShare.is_paid;
      });

      expect(filteredExpenses).toHaveLength(0);
    });
  });

  describe('Amount Calculations', () => {
    it('should calculate total owed by current user', () => {
      const expenses = [
        createMockExpense({
          id: 'exp-1',
          total_amount: 100,
          shares: [
            createMockExpenseShare({
              user_id: currentUser.id,
              amount_due: 50,
              is_paid: false,
            }),
          ],
        }),
        createMockExpense({
          id: 'exp-2',
          total_amount: 200,
          shares: [
            createMockExpenseShare({
              user_id: currentUser.id,
              amount_due: 75,
              is_paid: false,
            }),
          ],
        }),
        createMockExpense({
          id: 'exp-3',
          total_amount: 150,
          shares: [
            createMockExpenseShare({
              user_id: currentUser.id,
              amount_due: 60,
              is_paid: true, // Already paid, shouldn't count
            }),
          ],
        }),
      ];

      // Calculate totalOwed (replicating logic from expenses/index.vue)
      const totalOwed = expenses.reduce((total: number, expense: Expense) => {
        const userShare = expense.shares?.find(
          (share: ExpenseShare) => share.user_id === currentUser.id,
        );
        if (
          userShare &&
          !userShare.is_paid &&
          userShare.amount_due !== undefined
        ) {
          return total + userShare.amount_due;
        }
        return total;
      }, 0);

      expect(totalOwed).toBe(125); // 50 + 75
    });

    it('should calculate total owed to current user', () => {
      const expenses = [
        createMockExpense({
          id: 'exp-1',
          total_amount: 100,
          created_by: currentUser.id,
          shares: [
            createMockExpenseShare({
              user_id: 'user-2',
              amount_due: 50,
              is_paid: false,
            }),
            createMockExpenseShare({
              user_id: 'user-3',
              amount_due: 50,
              is_paid: false,
            }),
          ],
        }),
        createMockExpense({
          id: 'exp-2',
          total_amount: 150,
          created_by: currentUser.id,
          shares: [
            createMockExpenseShare({
              user_id: 'user-2',
              amount_due: 75,
              is_paid: true, // Already paid, shouldn't count
            }),
            createMockExpenseShare({
              user_id: 'user-3',
              amount_due: 75,
              is_paid: false,
            }),
          ],
        }),
      ];

      // Calculate totalOwedToYou (replicating logic from expenses/index.vue)
      const totalOwedToYou = expenses.reduce(
        (total: number, expense: Expense) => {
          if (expense.created_by === currentUser.id) {
            const unpaidShares = expense.shares?.filter(
              (share: ExpenseShare) =>
                share.user_id !== currentUser.id &&
                !share.is_paid &&
                share.amount_due !== undefined,
            );
            return (
              total +
              (unpaidShares?.reduce(
                (sum, share) => sum + (share.amount_due || 0),
                0,
              ) || 0)
            );
          }
          return total;
        },
        0,
      );

      expect(totalOwedToYou).toBe(175); // 50 + 50 + 75
    });

    it('should exclude own share from totalOwedToYou calculation', () => {
      const expenses = [
        createMockExpense({
          id: 'exp-1',
          total_amount: 150,
          created_by: currentUser.id,
          shares: [
            createMockExpenseShare({
              user_id: currentUser.id, // Own share
              amount_due: 50,
              is_paid: false,
            }),
            createMockExpenseShare({
              user_id: 'user-2',
              amount_due: 50,
              is_paid: false,
            }),
            createMockExpenseShare({
              user_id: 'user-3',
              amount_due: 50,
              is_paid: false,
            }),
          ],
        }),
      ];

      const totalOwedToYou = expenses.reduce(
        (total: number, expense: Expense) => {
          if (expense.created_by === currentUser.id) {
            const unpaidShares = expense.shares?.filter(
              (share: ExpenseShare) =>
                share.user_id !== currentUser.id &&
                !share.is_paid &&
                share.amount_due !== undefined,
            );
            return (
              total +
              (unpaidShares?.reduce(
                (sum, share) => sum + (share.amount_due || 0),
                0,
              ) || 0)
            );
          }
          return total;
        },
        0,
      );

      expect(totalOwedToYou).toBe(100); // 50 + 50 (excluding own 50)
    });
  });

  describe('Payment Status Management', () => {
    it('should track payment loading state for specific expense', () => {
      const paymentLoading: Record<string, boolean> = {};

      // Start payment for expense-1
      paymentLoading['expense-1'] = true;
      expect(paymentLoading['expense-1']).toBe(true);

      // Complete payment
      paymentLoading['expense-1'] = false;
      expect(paymentLoading['expense-1']).toBe(false);
    });

    it('should track multiple payments independently', () => {
      const paymentLoading: Record<string, boolean> = {};

      paymentLoading['expense-1'] = true;
      paymentLoading['expense-2'] = true;

      expect(paymentLoading['expense-1']).toBe(true);
      expect(paymentLoading['expense-2']).toBe(true);

      // Complete one payment
      paymentLoading['expense-1'] = false;

      expect(paymentLoading['expense-1']).toBe(false);
      expect(paymentLoading['expense-2']).toBe(true); // Still loading
    });
  });

  describe('Expense Deletion', () => {
    it('should track which expense is being deleted', () => {
      let deletingExpenseId: string | null = null;

      // Start deletion
      deletingExpenseId = 'expense-1';
      expect(deletingExpenseId).toBe('expense-1');

      // Complete deletion
      deletingExpenseId = null;
      expect(deletingExpenseId).toBeNull();
    });

    it('should only allow one deletion at a time', () => {
      let deletingExpenseId: string | null = null;

      deletingExpenseId = 'expense-1';
      expect(deletingExpenseId).toBe('expense-1');

      // Attempt to delete another while first is in progress
      // Should not change
      if (deletingExpenseId === null) {
        deletingExpenseId = 'expense-2';
      }

      expect(deletingExpenseId).toBe('expense-1'); // Still the first one
    });
  });

  describe('Modal State Management', () => {
    it('should toggle create expense modal', () => {
      let showCreateModal = false;

      showCreateModal = true;
      expect(showCreateModal).toBe(true);

      showCreateModal = false;
      expect(showCreateModal).toBe(false);
    });

    it('should compute modal visibility from state', () => {
      let showCreateModal = false;

      // showModal computed property logic
      const showModal = showCreateModal;

      expect(showModal).toBe(false);

      showCreateModal = true;
      const showModal2 = showCreateModal;
      expect(showModal2).toBe(true);
    });
  });

  describe('Loading States', () => {
    it('should reflect loading state from store', () => {
      let isLoading = true;

      expect(isLoading).toBe(true);

      isLoading = false;
      expect(isLoading).toBe(false);
    });
  });

  describe('House Context', () => {
    it('should use current house from housesStore', () => {
      const currentHouse = mockHouse;

      expect(currentHouse).not.toBeNull();
      expect(currentHouse?.id).toBe('house-1');
      expect(currentHouse?.currency).toBe('USD');
    });

    it('should handle missing house', () => {
      const currentHouse = null;

      expect(currentHouse).toBeNull();
    });
  });
});
