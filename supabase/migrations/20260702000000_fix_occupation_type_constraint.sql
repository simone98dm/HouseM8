-- Fix: DB constraint allowed ('student','employed','self_employed','unemployed','retired','other')
-- but the app only sends ('student','worker','other') — saving "worker" violated the check.
-- Align constraint with app values and remap existing rows.

UPDATE users SET occupation_type = 'worker' WHERE occupation_type IN ('employed', 'self_employed');
UPDATE users SET occupation_type = 'other' WHERE occupation_type IN ('unemployed', 'retired');

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_occupation_type_check;

ALTER TABLE users ADD CONSTRAINT users_occupation_type_check
    CHECK (occupation_type IN ('student', 'worker', 'other'));

COMMENT ON CONSTRAINT users_occupation_type_check ON users IS 'Valid occupation types: student, worker, other';
