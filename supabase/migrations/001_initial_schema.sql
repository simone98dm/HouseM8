-- Enable RLS (Row Level Security)
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.house_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expense_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bill_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comments ENABLE ROW LEVEL SECURITY;
-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    avatar_url TEXT,
    birthdate DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
-- Create houses table
CREATE TABLE IF NOT EXISTS public.houses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    currency TEXT CHECK (currency IN ('USD', 'EUR', 'GBP')) DEFAULT 'USD' NOT NULL,
    max_members INTEGER DEFAULT 4 NOT NULL,
    owner_id UUID REFERENCES public.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
-- Create house_members table
CREATE TABLE IF NOT EXISTS public.house_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('owner', 'member')) DEFAULT 'member' NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    left_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(house_id, user_id, left_at)
);
-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES public.users(id) NOT NULL,
    description TEXT NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    due_date DATE,
    recurring BOOLEAN DEFAULT FALSE NOT NULL,
    recurring_period TEXT CHECK (recurring_period IN ('weekly', 'monthly', 'yearly'))
);
-- Create expense_shares table
CREATE TABLE IF NOT EXISTS public.expense_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) NOT NULL,
    amount_due NUMERIC(10,2) NOT NULL CHECK (amount_due >= 0),
    is_paid BOOLEAN DEFAULT FALSE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(expense_id, user_id)
);
-- Create bills table
CREATE TABLE IF NOT EXISTS public.bills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    monthly_cost NUMERIC(10,2) NOT NULL CHECK (monthly_cost > 0),
    next_due_date DATE NOT NULL,
    created_by UUID REFERENCES public.users(id) NOT NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
-- Create bill_documents table
CREATE TABLE IF NOT EXISTS public.bill_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.users(id) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_user_id UUID REFERENCES public.users(id) NOT NULL,
    about_user_id UUID REFERENCES public.users(id) NOT NULL,
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CHECK (from_user_id != about_user_id)
);
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_house_members_user_id ON public.house_members(user_id);
CREATE INDEX IF NOT EXISTS idx_house_members_house_id ON public.house_members(house_id);
CREATE INDEX IF NOT EXISTS idx_house_members_active ON public.house_members(user_id, left_at) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_house_id ON public.expenses(house_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expense_shares_user_id ON public.expense_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_shares_expense_id ON public.expense_shares(expense_id);
CREATE INDEX IF NOT EXISTS idx_bills_house_id ON public.bills(house_id);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON public.bills(next_due_date) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_comments_about_user ON public.comments(about_user_id);
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_bills_updated_at ON public.bills;
CREATE TRIGGER update_bills_updated_at
    BEFORE UPDATE ON public.bills
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
-- RLS Policies

-- Users table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);
-- Houses table policies
DROP POLICY IF EXISTS "Users can view houses they belong to" ON public.houses;
CREATE POLICY "Users can view houses they belong to" ON public.houses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_id = id
            AND user_id = auth.uid()
            AND left_at IS NULL
        )
    );
DROP POLICY IF EXISTS "Users can create houses" ON public.houses;
CREATE POLICY "Users can create houses" ON public.houses
    FOR INSERT WITH CHECK (auth.uid() = owner_id);
-- House members table policies
DROP POLICY IF EXISTS "Users can view house members of their houses" ON public.house_members;
CREATE POLICY "Users can view house members of their houses" ON public.house_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.house_members hm
            WHERE hm.house_id = house_members.house_id
            AND hm.user_id = auth.uid()
            AND hm.left_at IS NULL
        )
    );
-- Expenses table policies
DROP POLICY IF EXISTS "Users can view expenses of their houses" ON public.expenses;
CREATE POLICY "Users can view expenses of their houses" ON public.expenses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_id = expenses.house_id
            AND user_id = auth.uid()
            AND left_at IS NULL
        )
    );
DROP POLICY IF EXISTS "Users can create expenses for their houses" ON public.expenses;
CREATE POLICY "Users can create expenses for their houses" ON public.expenses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_id = expenses.house_id
            AND user_id = auth.uid()
            AND left_at IS NULL
        )
    );
-- Expense shares table policies
DROP POLICY IF EXISTS "Users can view expense shares of their houses" ON public.expense_shares;
CREATE POLICY "Users can view expense shares of their houses" ON public.expense_shares
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.expenses e
            JOIN public.house_members hm ON e.house_id = hm.house_id
            WHERE e.id = expense_shares.expense_id
            AND hm.user_id = auth.uid()
            AND hm.left_at IS NULL
        )
    );
-- Bills table policies
DROP POLICY IF EXISTS "Users can view bills of their houses" ON public.bills;
CREATE POLICY "Users can view bills of their houses" ON public.bills
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_id = bills.house_id
            AND user_id = auth.uid()
            AND left_at IS NULL
        )
    );
DROP POLICY IF EXISTS "Users can manage bills of their houses" ON public.bills;
CREATE POLICY "Users can manage bills of their houses" ON public.bills
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_id = bills.house_id
            AND user_id = auth.uid()
            AND left_at IS NULL
        )
    );
-- Comments table policies
DROP POLICY IF EXISTS "Users can view comments about themselves" ON public.comments;
CREATE POLICY "Users can view comments about themselves" ON public.comments
    FOR SELECT USING (
        about_user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_id = comments.house_id
            AND user_id = auth.uid()
            AND left_at IS NULL
        )
    );
-- Create storage bucket for bill documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('bill-documents', 'bill-documents', false)
ON CONFLICT (id) DO NOTHING;
-- Storage policies
DROP POLICY IF EXISTS "Users can upload bill documents" ON storage.objects;
CREATE POLICY "Users can upload bill documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'bill-documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );
DROP POLICY IF EXISTS "Users can view bill documents of their houses" ON storage.objects;
CREATE POLICY "Users can view bill documents of their houses" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'bill-documents' AND
        EXISTS (
            SELECT 1 FROM public.bill_documents bd
            JOIN public.bills b ON bd.bill_id = b.id
            JOIN public.house_members hm ON b.house_id = hm.house_id
            WHERE bd.url LIKE '%' || name || '%'
            AND hm.user_id = auth.uid()
            AND hm.left_at IS NULL
        )
    );