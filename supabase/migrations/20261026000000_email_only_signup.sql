-- Email-only registration: name is set later in the onboarding wizard.
-- Ports the NOT NULL drops from database/011_auth_onboarding.sql, which never
-- reached supabase/migrations (invite-code columns already live in security_hardening).
ALTER TABLE users ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE users ALTER COLUMN last_name DROP NOT NULL;

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
