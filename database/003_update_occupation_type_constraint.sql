-- Migration: Update occupation_type constraint to match frontend values
-- This aligns the database constraint with the occupation types used in the UI

-- First, migrate existing 'worker' values to 'employed'
UPDATE users SET occupation_type = 'employed' WHERE occupation_type = 'worker';

-- Drop existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_occupation_type_check;

-- Add new constraint with all occupation types
ALTER TABLE users ADD CONSTRAINT users_occupation_type_check 
    CHECK (occupation_type IN ('student', 'employed', 'self_employed', 'unemployed', 'retired', 'other'));

COMMENT ON CONSTRAINT users_occupation_type_check ON users IS 'Valid occupation types: student, employed, self_employed, unemployed, retired, other';
