-- Categories on expenses and bills: up to 3 fixed keys, translated client-side.
-- Keys mirror shared/constants/categories.ts. (Recurring stays on bills; the
-- file name predates that decision.)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['expenses', 'bills'] LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT ''{}''',
      t);

    -- database/012_categories.sql (old single `category`, 8 keys) may have
    -- been applied: carry its values over to the new keys, then drop it.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'category'
    ) THEN
      EXECUTE format($q$
        UPDATE public.%I SET categories = ARRAY[CASE category
          WHEN 'home' THEN 'rent'
          WHEN 'energy' THEN 'utilities'
          WHEN 'water' THEN 'utilities'
          WHEN 'internet' THEN 'utilities'
          WHEN 'eating_out' THEN 'dining'
          ELSE category
        END]
        WHERE category IS NOT NULL AND categories = '{}'
      $q$, t);
      EXECUTE format('ALTER TABLE public.%I DROP COLUMN category', t);
    END IF;

    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, t || '_categories_check');
    EXECUTE format($q$
      ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (
        cardinality(categories) <= 3
        AND categories <@ ARRAY[
          'groceries', 'rent', 'utilities', 'subscriptions', 'transport', 'dining',
          'household', 'health', 'entertainment', 'travel', 'gifts', 'other'
        ]::TEXT[]
      )
    $q$, t, t || '_categories_check');
  END LOOP;
END $$;
