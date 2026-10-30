/** Balances below this magnitude are treated as settled (PaymentsMinimizer). */
export const SETTLED_BALANCE_EPSILON = 0.001;

/** Hard cap on explored transfers before the search returns its best result. */
export const MAX_SEARCH_ITERATIONS = 40_000;

/** After this many iterations the search starts checking the wall clock. */
export const TIME_CHECK_MIN_ITERATIONS = 1_000;

/** The wall clock is checked every this many iterations. */
export const TIME_CHECK_INTERVAL = 2_500;

/** Time budget for the search, in milliseconds. */
export const SEARCH_TIME_BUDGET_MS = 2_000;

/** Rate assumed when a currency is missing from the rate table. */
export const DEFAULT_CONVERSION_FACTOR = 1;

/** Fraction digits used when none is provided (most currencies use cents). */
export const DEFAULT_FRACTION_DIGITS = 2;

/** Allowed drift when checking that beneficiary fractions sum to 1. */
export const FRACTION_SUM_TOLERANCE = 1e-4;
