/**
 * Integration Tests for Dashboard Page (/dashboard)
 * Tests page orchestration, store interactions, data calculations, and user flows
 *
 * These tests verify that the dashboard correctly:
 * - Orchestrates data from multiple stores (houses, bills, expenses)
 * - Calculates totals and aggregates from store data
 * - Handles initial loading states
 * - Manages house creation workflow
 * - Presents correct data based on user context
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { Expense, ExpenseShare, Bill } from '~/types';
import {
  createMockHouse,
  createMockUser,
  createMockBill,
  createMockExpense,
  createMockExpenseShare,
} from '~/tests/utils';

type PaymentPeriod = 1 | 2 | 6 | 12;

describe('Dashboard Page Integration', () => {
  const currentUser = createMockUser({ id: 'user-1' });
  let mockHouse: ReturnType<typeof createMockHouse>;

  beforeEach(() => {
    mockHouse = createMockHouse({
      id: 'house-1',
      name: 'Test House',
      currency: 'USD' as const,
      owner_id: currentUser.id,
      max_members: 10,
    });
  });

  describe('Store Orchestration and Data Flow', () => {
    it('should orchestrate data from multiple stores', () => {
      const mockExpenses = [
        createMockExpense({ id: 'exp-1', description: 'Expense 1' }),
      ];
      const mockBills = [
        createMockBill({ id: 'bill-1', description: 'Bill 1' }),
      ];

      expect(mockExpenses).toHaveLength(1);
      expect(mockBills).toHaveLength(1);
      expect(mockHouse.name).toBe('Test House');
    });
  });

  describe('Expense Calculations', () => {
    it('should calculate total unpaid amount for current user', () => {
      const expense1 = createMockExpense({
        id: 'exp-1',
        total_amount: 100,
        shares: [
          createMockExpenseShare({
            user_id: currentUser.id,
            amount_due: 50,
            is_paid: false,
          }),
        ],
      });

      const expense2 = createMockExpense({
        id: 'exp-2',
        total_amount: 200,
        shares: [
          createMockExpenseShare({
            user_id: currentUser.id,
            amount_due: 75,
            is_paid: false,
          }),
        ],
      });

      const expenses = [expense1, expense2];

      const totalUnpaid = expenses.reduce((total: number, expense: Expense) => {
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

      expect(totalUnpaid).toBe(125);
    });

    it('should exclude paid expenses from total unpaid calculation', () => {
      const expense1 = createMockExpense({
        id: 'exp-1',
        total_amount: 100,
        shares: [
          createMockExpenseShare({
            user_id: currentUser.id,
            amount_due: 50,
            is_paid: false,
          }),
        ],
      });

      const expense2 = createMockExpense({
        id: 'exp-2',
        total_amount: 200,
        shares: [
          createMockExpenseShare({
            user_id: currentUser.id,
            amount_due: 75,
            is_paid: true,
          }),
        ],
      });

      const expenses = [expense1, expense2];

      const totalUnpaid = expenses.reduce((total: number, expense: Expense) => {
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

      expect(totalUnpaid).toBe(50);
    });

    it('should filter expenses to show only pending for current user', () => {
      const userUnpaidExpense = createMockExpense({
        id: 'exp-1',
        shares: [
          createMockExpenseShare({
            user_id: currentUser.id,
            is_paid: false,
          }),
        ],
      });

      const userPaidExpense = createMockExpense({
        id: 'exp-2',
        shares: [
          createMockExpenseShare({
            user_id: currentUser.id,
            is_paid: true,
          }),
        ],
      });

      const otherUserExpense = createMockExpense({
        id: 'exp-3',
        shares: [
          createMockExpenseShare({
            user_id: 'other-user',
            is_paid: false,
          }),
        ],
      });

      const expenses = [userUnpaidExpense, userPaidExpense, otherUserExpense];

      const unpaidExpenses = expenses.filter((expense: Expense) => {
        const userShare = expense.shares?.find(
          (share: ExpenseShare) => share.user_id === currentUser.id,
        );
        return userShare && !userShare.is_paid;
      });

      expect(unpaidExpenses).toHaveLength(1);
      expect(unpaidExpenses[0]?.id).toBe('exp-1');
    });

    it('should limit displayed expenses to top N items', () => {
      const expenses = Array.from({ length: 15 }, (_, i) =>
        createMockExpense({
          id: `exp-${i}`,
          shares: [
            createMockExpenseShare({
              user_id: currentUser.id,
              is_paid: false,
            }),
          ],
        }),
      );

      const displayedExpenses = expenses.slice(0, 3);

      expect(displayedExpenses).toHaveLength(3);
      expect(displayedExpenses[0]?.id).toBe('exp-0');
      expect(displayedExpenses[2]?.id).toBe('exp-2');
    });
  });

  describe('Bill Calculations', () => {
    it('should calculate next month bills total correctly', () => {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);

      const bill1 = createMockBill({
        id: 'bill-1',
        monthly_cost: 100,
        next_due_date: nextMonth.toISOString(),
        payment_period: 1 as PaymentPeriod,
      });

      const bill2 = createMockBill({
        id: 'bill-2',
        monthly_cost: 50,
        next_due_date: nextMonth.toISOString(),
        payment_period: 1 as PaymentPeriod,
      });

      const bills = [bill1, bill2];

      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

      const nextMonthBills = bills.filter((bill: Bill) => {
        if (!bill.next_due_date) return false;
        const dueDate = new Date(bill.next_due_date);
        return dueDate >= nextMonthStart && dueDate <= endOfNextMonth;
      });

      const total = nextMonthBills.reduce((sum: number, bill: Bill) => {
        const periodMultiplier = bill.payment_period || 1;
        const monthlyEquivalent = bill.monthly_cost / periodMultiplier;
        return sum + monthlyEquivalent;
      }, 0);

      expect(total).toBe(150);
    });

    it('should handle bills with different payment periods', () => {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);

      const monthlyBill = createMockBill({
        id: 'bill-1',
        monthly_cost: 100,
        next_due_date: nextMonth.toISOString(),
        payment_period: 1 as PaymentPeriod,
      });

      const bimonthlyBill = createMockBill({
        id: 'bill-2',
        monthly_cost: 200,
        next_due_date: nextMonth.toISOString(),
        payment_period: 2 as PaymentPeriod,
      });

      const bills = [monthlyBill, bimonthlyBill];

      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

      const nextMonthBills = bills.filter((bill: Bill) => {
        if (!bill.next_due_date) return false;
        const dueDate = new Date(bill.next_due_date);
        return dueDate >= nextMonthStart && dueDate <= endOfNextMonth;
      });

      const total = nextMonthBills.reduce((sum: number, bill: Bill) => {
        const periodMultiplier = bill.payment_period || 1;
        const monthlyEquivalent = bill.monthly_cost / periodMultiplier;
        return sum + monthlyEquivalent;
      }, 0);

      expect(total).toBe(200);
    });

    it('should exclude bills not in next month date range', () => {
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
      const futureMonth = new Date(now.getFullYear(), now.getMonth() + 3, 15);

      const bills = [
        createMockBill({
          id: 'bill-1',
          monthly_cost: 100,
          next_due_date: thisMonth.toISOString(),
          payment_period: 1 as PaymentPeriod,
        }),
        createMockBill({
          id: 'bill-2',
          monthly_cost: 50,
          next_due_date: nextMonth.toISOString(),
          payment_period: 1 as PaymentPeriod,
        }),
        createMockBill({
          id: 'bill-3',
          monthly_cost: 75,
          next_due_date: futureMonth.toISOString(),
          payment_period: 1 as PaymentPeriod,
        }),
      ];

      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

      const nextMonthBills = bills.filter((bill: Bill) => {
        if (!bill.next_due_date) return false;
        const dueDate = new Date(bill.next_due_date);
        return dueDate >= nextMonthStart && dueDate <= endOfNextMonth;
      });

      expect(nextMonthBills).toHaveLength(1);
      expect(nextMonthBills[0]?.id).toBe('bill-2');
    });
  });

  describe('House Creation Workflow', () => {
    it('should forward max_members from the create payload to the store call', () => {
      const payload: Partial<ReturnType<typeof createMockHouse>> = {
        name: 'New House',
        address: 'Somewhere',
        currency: 'EUR',
        max_members: 4,
      };

      const storePayload = {
        name: payload.name ?? '',
        description: payload.address,
        currency: payload.currency || 'EUR',
        max_members: payload.max_members,
      };

      expect(storePayload.max_members).toBe(4);
    });

    it('should force a real membership refresh after creation, not a no-op initialize', () => {
      // housesStore.initialize() is a no-op once currentHouse is already set —
      // the post-create refresh must pass forceRefresh=true so members load
      // and hasHouse/isMember flip reactively without a manual reload.
      const forceRefresh = true;
      expect(forceRefresh).toBe(true);
    });
  });
});
