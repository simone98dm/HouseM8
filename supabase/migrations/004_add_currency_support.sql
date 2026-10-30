-- Add currency support to houses, expenses and bills tables
-- Default currency is EUR for existing records

-- Add currency column to houses table
ALTER TABLE public.houses 
ADD COLUMN IF NOT EXISTS currency TEXT CHECK (currency IN ('USD', 'EUR')) DEFAULT 'EUR' NOT NULL;
-- Add currency column to expenses table  
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS currency TEXT CHECK (currency IN ('USD', 'EUR')) DEFAULT 'EUR' NOT NULL;
-- Add currency column to bills table
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS currency TEXT CHECK (currency IN ('USD', 'EUR')) DEFAULT 'EUR' NOT NULL;
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_houses_currency ON public.houses(currency);
CREATE INDEX IF NOT EXISTS idx_expenses_currency ON public.expenses(currency);
CREATE INDEX IF NOT EXISTS idx_bills_currency ON public.bills(currency);
-- Add comment explaining the currency support
COMMENT ON COLUMN public.houses.currency IS 'Currency used in this house (USD or EUR)';
COMMENT ON COLUMN public.expenses.currency IS 'Currency for this expense (inherited from house)';
COMMENT ON COLUMN public.bills.currency IS 'Currency for this bill (inherited from house)';