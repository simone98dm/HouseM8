-- PostgreSQL Schema Migration for House M8
-- This creates all tables required for the application
-- Note: This is for standalone PostgreSQL (not Supabase)
-- Run this after creating your database: CREATE DATABASE house_m8;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- USERS TABLE
-- =============================================================================
-- Note: In Supabase, this extends auth.users. In standalone PostgreSQL,
-- this is the primary users table with authentication handled separately.
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT, -- For PostgreSQL auth (bcrypt hashed)
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    avatar_url TEXT,
    birthdate DATE,
    email_confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Extended profile fields
    profile_pictures TEXT[],
    bio TEXT,
    is_smoker BOOLEAN DEFAULT false,
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    birthplace TEXT,
    occupation_type TEXT CHECK (occupation_type IN ('student', 'worker', 'unemployed', 'other')),
    study_field TEXT,
    job_title TEXT,
    languages TEXT[],
    nationality TEXT,
    pets TEXT,
    telephone TEXT,
    instagram TEXT,
    twitter TEXT,
    linkedin TEXT,
    tiktok TEXT,
    is_first_access BOOLEAN DEFAULT false
);

-- =============================================================================
-- HOUSES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS houses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    currency TEXT CHECK (currency IN ('USD', 'EUR')) DEFAULT 'EUR' NOT NULL,
    max_members INTEGER DEFAULT 10 NOT NULL,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- HOUSE MEMBERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS house_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_id UUID REFERENCES houses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('owner', 'member')) DEFAULT 'member' NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    left_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(house_id, user_id, left_at)
);

-- =============================================================================
-- HOUSE INVITATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS house_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    house_id UUID REFERENCES houses(id) ON DELETE CASCADE NOT NULL,
    invited_email TEXT NOT NULL,
    invited_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE NOT NULL,
    used_by UUID REFERENCES users(id) ON DELETE SET NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- EXPENSES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_id UUID REFERENCES houses(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount > 0),
    currency TEXT CHECK (currency IN ('USD', 'EUR')) DEFAULT 'EUR' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    due_date DATE,
    recurring BOOLEAN DEFAULT FALSE NOT NULL,
    recurring_period TEXT CHECK (recurring_period IN ('weekly', 'monthly', 'yearly'))
);

-- =============================================================================
-- EXPENSE SHARES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS expense_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    amount_due NUMERIC(10,2) NOT NULL CHECK (amount_due >= 0),
    is_paid BOOLEAN DEFAULT FALSE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(expense_id, user_id)
);

-- =============================================================================
-- BILLS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS bills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_id UUID REFERENCES houses(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    monthly_cost NUMERIC(10,2) NOT NULL CHECK (monthly_cost > 0),
    payment_period INTEGER DEFAULT 1 NOT NULL CHECK (payment_period IN (1, 2, 6, 12)),
    next_due_date DATE NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- BILL DOCUMENTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS bill_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE NOT NULL,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- BULLETIN NOTES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS bulletin_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_id UUID REFERENCES houses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    dismiss_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- USER REVIEWS/COMMENTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    about_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    house_id UUID REFERENCES houses(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CHECK (from_user_id != about_user_id)
);

-- =============================================================================
-- EMAIL VERIFICATION TOKENS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    token TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT FALSE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- PASSWORD RESET TOKENS TABLE (for PostgreSQL auth)
-- =============================================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- OAUTH TOKENS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS oauth_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'github', 'facebook', 'apple')),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type TEXT DEFAULT 'Bearer',
    expires_at TIMESTAMP WITH TIME ZONE,
    refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- Ensure one token per user per provider
    UNIQUE(user_id, provider)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider ON oauth_tokens(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON oauth_tokens(expires_at);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- House members indexes
CREATE INDEX IF NOT EXISTS idx_house_members_user_id ON house_members(user_id);
CREATE INDEX IF NOT EXISTS idx_house_members_house_id ON house_members(house_id);
CREATE INDEX IF NOT EXISTS idx_house_members_active ON house_members(user_id, left_at) WHERE left_at IS NULL;

-- House invitations indexes
CREATE INDEX IF NOT EXISTS idx_house_invitations_token ON house_invitations(token);
CREATE INDEX IF NOT EXISTS idx_house_invitations_house_id ON house_invitations(house_id);
CREATE INDEX IF NOT EXISTS idx_house_invitations_expires_at ON house_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_house_invitations_used ON house_invitations(used);

-- Expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_house_id ON expenses(house_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_currency ON expenses(currency);

-- Expense shares indexes
CREATE INDEX IF NOT EXISTS idx_expense_shares_user_id ON expense_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_shares_expense_id ON expense_shares(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_shares_is_paid ON expense_shares(is_paid);

-- Bills indexes
CREATE INDEX IF NOT EXISTS idx_bills_house_id ON bills(house_id);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(next_due_date) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_bills_active ON bills(active);

-- Bill documents indexes
CREATE INDEX IF NOT EXISTS idx_bill_documents_bill_id ON bill_documents(bill_id);

-- Bulletin notes indexes
CREATE INDEX IF NOT EXISTS idx_bulletin_notes_house_id ON bulletin_notes(house_id);
CREATE INDEX IF NOT EXISTS idx_bulletin_notes_dismiss_date ON bulletin_notes(dismiss_date);
CREATE INDEX IF NOT EXISTS idx_bulletin_notes_created_at ON bulletin_notes(created_at DESC);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_about_user ON comments(about_user_id);
CREATE INDEX IF NOT EXISTS idx_comments_house_id ON comments(house_id);

-- Email verification tokens indexes
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_verified ON email_verification_tokens(verified);

-- Password reset tokens indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- =============================================================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- =============================================================================

-- Create or replace the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for tables with updated_at column
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_houses_updated_at ON houses;
CREATE TRIGGER update_houses_updated_at
    BEFORE UPDATE ON houses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bills_updated_at ON bills;
CREATE TRIGGER update_bills_updated_at
    BEFORE UPDATE ON bills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to clean up expired bulletin notes
CREATE OR REPLACE FUNCTION delete_expired_bulletin_notes()
RETURNS void AS $$
BEGIN
    DELETE FROM bulletin_notes
    WHERE dismiss_date IS NOT NULL AND dismiss_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM house_invitations 
    WHERE expires_at < NOW() 
    AND used = FALSE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired email verification tokens
CREATE OR REPLACE FUNCTION cleanup_expired_verification_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM email_verification_tokens
    WHERE expires_at < NOW() AND verified = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired password reset tokens
CREATE OR REPLACE FUNCTION cleanup_expired_password_reset_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM password_reset_tokens
    WHERE expires_at < NOW() AND used = FALSE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- INITIAL GRANTS (adjust as needed for your database user)
-- =============================================================================

-- Grant permissions to your application user (replace 'app_user' with your username)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;

-- =============================================================================
-- NOTES
-- =============================================================================
-- 1. This schema does NOT include RLS (Row Level Security) like Supabase
--    Security must be handled at the application layer
-- 2. Authentication is handled separately (JWT tokens, sessions, etc.)
-- 3. File storage must be handled separately (AWS S3, local storage, etc.)
-- 4. Consider setting up cron jobs to run cleanup functions periodically
-- 5. Remember to create proper database backups regularly
