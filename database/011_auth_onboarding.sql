-- =============================================================================
-- Migration 011: Auth & Onboarding Refactor
-- =============================================================================
-- Enables email-only registration (name/password set in onboarding wizard).
-- Adds 8-digit single-use invite code to house_invitations (additive,
-- does not touch the existing token-based invite columns).
-- =============================================================================

-- Allow email-only users (name set during wizard, password optional for OAuth)
ALTER TABLE users ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE users ALTER COLUMN last_name DROP NOT NULL;

-- Resolve latent NOT NULL on columns that were never populated by the server.
-- Guarded: these columns exist only in schemas that predate email-only signup.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'email_verification_tokens'
               AND column_name = 'first_name') THEN
    ALTER TABLE email_verification_tokens ALTER COLUMN first_name DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'email_verification_tokens'
               AND column_name = 'last_name') THEN
    ALTER TABLE email_verification_tokens ALTER COLUMN last_name DROP NOT NULL;
  END IF;
END $$;

-- 8-digit member invite code — lives alongside the existing UUID token
ALTER TABLE house_invitations ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE house_invitations ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE house_invitations ADD COLUMN IF NOT EXISTS code_used_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE house_invitations ADD COLUMN IF NOT EXISTS code_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE house_invitations ADD COLUMN IF NOT EXISTS code_locked_until TIMESTAMP WITH TIME ZONE;

-- Unique index only where code is set (existing rows have NULL code, safe)
CREATE UNIQUE INDEX IF NOT EXISTS idx_house_invitations_code
  ON house_invitations(code)
  WHERE code IS NOT NULL;
