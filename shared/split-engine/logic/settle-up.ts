import { DEFAULT_FRACTION_DIGITS } from '../constants';
import type { Group, SuggestedPayment } from '../types';
import { roundToFractionDigits } from '../utils/currency';
import { calculateBalances } from './balance-calculator';
import { validateGroup } from './group-validator';
import { minimizePayments, type MinimizerOptions } from './payments-minimizer';

export interface SettleUpOptions extends MinimizerOptions {
  /** Decimals of the group currency (2 for EUR, 0 for JPY). Smaller payments are dropped. */
  readonly fractionDigits?: number;
}

/**
 * Validates the group, computes balances and returns the fewest payments
 * that settle everyone up (what the app shows under "Suggested payments").
 * Amounts are unrounded; use `roundToFractionDigits` for display.
 */
export function suggestPayments(group: Group, options: SettleUpOptions = {}): SuggestedPayment[] {
  validateGroup(group);
  const fractionDigits = options.fractionDigits ?? DEFAULT_FRACTION_DIGITS;
  return minimizePayments(calculateBalances(group), options)
    .filter((transfer) => roundToFractionDigits(transfer.amount, fractionDigits) > 0)
    .map((transfer) => ({ ...transfer, currencyCode: group.defaultCurrencyCode }));
}
