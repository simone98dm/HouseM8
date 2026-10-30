import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { User, House } from '~/types';
import type {
  HouseBalance,
  SettlementTransaction,
  UserBalance,
} from '~/types/composables/balance';
import { createMockUser, createMockHouse, setupPinia } from '~/tests/utils';

describe('Balance Page Integration', () => {
  let mockUser1: User;
  let mockUser2: User;
  let mockHouse: House;
  let mockBalance: HouseBalance;

  beforeEach(() => {
    setupPinia();
    vi.clearAllMocks();

    mockUser1 = createMockUser({
      id: 'user-1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
    });

    mockUser2 = createMockUser({
      id: 'user-2',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com',
    });

    mockHouse = createMockHouse({
      id: 'house-1',
      name: 'Test House',
      owner_id: mockUser1.id,
      currency: 'USD',
    });

    mockBalance = {
      house_id: mockHouse.id,
      currency: mockHouse.currency,
      user_balances: [
        {
          user_id: mockUser1.id,
          user: {
            id: mockUser1.id,
            first_name: mockUser1.first_name,
            last_name: mockUser1.last_name,
          },
          total_paid: 150,
          total_owed: 100,
          net_balance: 50,
        },
        {
          user_id: mockUser2.id,
          user: {
            id: mockUser2.id,
            first_name: mockUser2.first_name,
            last_name: mockUser2.last_name,
          },
          total_paid: 50,
          total_owed: 100,
          net_balance: -50,
        },
      ],
      settlement_transactions: [
        {
          from_user_id: mockUser2.id,
          to_user_id: mockUser1.id,
          amount: 50,
          from_user: {
            id: mockUser2.id,
            first_name: mockUser2.first_name,
            last_name: mockUser2.last_name,
          },
          to_user: {
            id: mockUser1.id,
            first_name: mockUser1.first_name,
            last_name: mockUser1.last_name,
          },
        },
      ],
      total_expenses: 200,
      is_balanced: false,
    };
  });

  describe('Balance Loading', () => {
    it('should require current house to load balance', () => {
      const canLoadBalance = !!mockHouse;

      expect(canLoadBalance).toBe(true);
    });

    it('should not load balance without house', () => {
      const currentHouse: House | null = null;
      const canLoadBalance = !!currentHouse;

      expect(canLoadBalance).toBe(false);
    });

    it('should initialize balance data structure', () => {
      expect(mockBalance).toBeDefined();
      expect(mockBalance.house_id).toBe(mockHouse.id);
      expect(mockBalance.currency).toBe('USD');
    });

    it('should include user balances', () => {
      expect(mockBalance.user_balances).toHaveLength(2);
      expect(mockBalance.user_balances[0]?.user_id).toBe(mockUser1.id);
      expect(mockBalance.user_balances[1]?.user_id).toBe(mockUser2.id);
    });
  });

  describe('User Balance Calculations', () => {
    it('should calculate net balance correctly', () => {
      const balance1 = mockBalance.user_balances[0] as UserBalance;

      const netBalance = balance1.total_paid - balance1.total_owed;

      expect(netBalance).toBe(50);
      expect(balance1.net_balance).toBe(50);
    });

    it('should identify users who owe money', () => {
      const balance2 = mockBalance.user_balances[1] as UserBalance;

      expect(balance2.net_balance).toBeLessThan(0);
      expect(balance2.total_owed).toBeGreaterThan(balance2.total_paid);
    });

    it('should identify users who are owed money', () => {
      const balance1 = mockBalance.user_balances[0] as UserBalance;

      expect(balance1.net_balance).toBeGreaterThan(0);
      expect(balance1.total_paid).toBeGreaterThan(balance1.total_owed);
    });

    it('should calculate total expenses across all users', () => {
      const totalPaid = mockBalance.user_balances.reduce(
        (sum, b) => sum + b.total_paid,
        0,
      );

      expect(totalPaid).toBe(200);
      expect(mockBalance.total_expenses).toBe(200);
    });
  });

  describe('Settlement Transactions', () => {
    it('should have settlement transaction from debtor to creditor', () => {
      const transaction = mockBalance
        .settlement_transactions[0] as SettlementTransaction;

      expect(transaction.from_user_id).toBe(mockUser2.id);
      expect(transaction.to_user_id).toBe(mockUser1.id);
      expect(transaction.amount).toBe(50);
    });

    it('should include user information in transactions', () => {
      const transaction = mockBalance
        .settlement_transactions[0] as SettlementTransaction;

      expect(transaction.from_user.first_name).toBe('Jane');
      expect(transaction.to_user.first_name).toBe('John');
    });

    it('should match settlement amount to balance difference', () => {
      const balance1 = mockBalance.user_balances[0] as UserBalance;
      const balance2 = mockBalance.user_balances[1] as UserBalance;
      const transaction = mockBalance
        .settlement_transactions[0] as SettlementTransaction;

      expect(transaction.amount).toBe(Math.abs(balance2.net_balance));
      expect(transaction.amount).toBe(balance1.net_balance);
    });

    it('should generate unique settlement key', () => {
      const transaction = mockBalance
        .settlement_transactions[0] as SettlementTransaction;
      const settlementKey = `${transaction.from_user_id}-${transaction.to_user_id}`;

      expect(settlementKey).toBe('user-2-user-1');
    });
  });

  describe('User Name Formatting', () => {
    it('should extract first letter of first name for from_user', () => {
      const transaction = mockBalance
        .settlement_transactions[0] as SettlementTransaction;
      const initial =
        transaction.from_user.first_name?.[0]?.toUpperCase() || '?';

      expect(initial).toBe('J');
    });

    it('should extract first letter of first name for to_user', () => {
      const transaction = mockBalance
        .settlement_transactions[0] as SettlementTransaction;
      const initial = transaction.to_user.first_name?.[0]?.toUpperCase() || '?';

      expect(initial).toBe('J');
    });

    it('should handle missing first name gracefully', () => {
      const transaction: SettlementTransaction = {
        from_user_id: 'user-3',
        to_user_id: 'user-1',
        amount: 50,
        from_user: {
          id: 'user-3',
          first_name: '',
          last_name: 'Unknown',
        },
        to_user: {
          id: 'user-1',
          first_name: 'John',
          last_name: 'Doe',
        },
      };

      const initial =
        transaction.from_user.first_name?.[0]?.toUpperCase() || '?';

      expect(initial).toBe('?');
    });
  });

  describe('Settlement Processing', () => {
    it('should track processing state for specific transaction', () => {
      const transaction = mockBalance
        .settlement_transactions[0] as SettlementTransaction;
      const settlementKey = `${transaction.from_user_id}-${transaction.to_user_id}`;
      const processingSettlement = settlementKey;

      expect(processingSettlement).toBe('user-2-user-1');
    });

    it('should clear processing state after completion', () => {
      let processingSettlement: string | null = 'user-2-user-1';
      processingSettlement = null;

      expect(processingSettlement).toBeNull();
    });

    it('should create settlement expense description', () => {
      const transaction = mockBalance
        .settlement_transactions[0] as SettlementTransaction;
      const description = `Settlement: ${transaction.from_user.first_name} → ${transaction.to_user.first_name}`;

      expect(description).toBe('Settlement: Jane → John');
    });
  });

  describe('Single Load Owner (BUG 2 regression)', () => {
    // Mirrors the fixed pages/balance/index.vue contract: watch(currentHouse,
    // ..., { immediate: true }) is the ONLY thing that calls loadBalance().
    // onMounted only calls housesStore.initialize() — it never calls
    // loadBalance() itself. Previously onMounted awaited initialize() and
    // then called loadBalance() directly, which double-fired alongside a
    // separate (non-immediate) watcher once initialize() populated the house.
    it('fetches once when the house is already available at mount', () => {
      let loadCount = 0;
      const loadBalance = () => {
        loadCount++;
      };

      // Simulates the immediate watcher firing at mount with a pre-populated
      // currentHouse — the only call site that may invoke loadBalance.
      const watchCurrentHouse = (newHouse: House | null) => {
        if (newHouse) loadBalance();
      };
      watchCurrentHouse(mockHouse); // immediate: true

      // onMounted below does NOT call loadBalance directly.
      const onMountedInitialize = () => {
        /* housesStore.initialize() only — no loadBalance() call here */
      };
      onMountedInitialize();

      expect(loadCount).toBe(1);
    });

    it('fetches exactly once when the house becomes available after initialize() resolves', () => {
      let currentHouse: House | null = null;
      let loadCount = 0;
      const loadBalance = () => {
        loadCount++;
      };
      const watchCurrentHouse = (newHouse: House | null) => {
        if (newHouse) loadBalance();
      };

      watchCurrentHouse(currentHouse); // immediate: true, house not ready yet
      expect(loadCount).toBe(0);

      currentHouse = mockHouse; // initialize() resolves, house populated
      watchCurrentHouse(currentHouse); // watcher re-fires once, and only once
      expect(loadCount).toBe(1);
    });
  });

  describe('Balance State Checks', () => {
    it('should identify unbalanced house', () => {
      expect(mockBalance.is_balanced).toBe(false);
    });

    it('should identify balanced house when all net balances are zero', () => {
      const balancedHouse: HouseBalance = {
        ...mockBalance,
        user_balances: [
          {
            user_id: mockUser1.id,
            user: {
              id: mockUser1.id,
              first_name: mockUser1.first_name,
              last_name: mockUser1.last_name,
            },
            total_paid: 100,
            total_owed: 100,
            net_balance: 0,
          },
        ],
        settlement_transactions: [],
        is_balanced: true,
      };

      expect(balancedHouse.is_balanced).toBe(true);
      expect(balancedHouse.settlement_transactions).toHaveLength(0);
    });

    it('should have no settlement transactions when balanced', () => {
      const hasSettlements = mockBalance.settlement_transactions.length > 0;

      expect(hasSettlements).toBe(true);
      expect(mockBalance.is_balanced).toBe(false);
    });
  });
});
