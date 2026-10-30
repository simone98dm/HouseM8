-- Migration: Add preferred_currency to users table
-- This allows users to set their preferred currency for expenses

ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferred_currency TEXT 
CHECK (preferred_currency IN ('USD', 'EUR')) 
DEFAULT 'EUR';

COMMENT ON COLUMN users.preferred_currency IS 'User preferred currency for expenses (defaults to EUR)';
