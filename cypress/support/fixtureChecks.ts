type Share = { amount_due: number };
type Expense = { total_amount: number; shares: Share[] };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Each expense total must equal the sum of its share amounts (amount_due). */
export function assertExpenseFixtureTiesOut(expenses: Expense[]): void {
  expenses.forEach((e) => {
    const sum = round2(e.shares.reduce((acc, s) => acc + s.amount_due, 0));
    expect(
      sum,
      `expense total ${e.total_amount} must equal sum of shares`,
    ).to.eq(round2(e.total_amount));
  });
}
