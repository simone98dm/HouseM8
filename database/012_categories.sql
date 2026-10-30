-- Categories on expenses and bills: up to 3 keys (empty = uncategorised).
-- Keys mirror shared/constants/categories.ts.
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}'
  CONSTRAINT expenses_categories_check CHECK (
    cardinality(categories) <= 3
    AND categories <@ ARRAY[
      'groceries','rent','utilities','subscriptions','transport','dining',
      'household','health','entertainment','travel','gifts','other']::TEXT[]);

ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}'
  CONSTRAINT bills_categories_check CHECK (
    cardinality(categories) <= 3
    AND categories <@ ARRAY[
      'groceries','rent','utilities','subscriptions','transport','dining',
      'household','health','entertainment','travel','gifts','other']::TEXT[]);
