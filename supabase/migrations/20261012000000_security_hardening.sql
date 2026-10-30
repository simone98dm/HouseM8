-- Security hardening (audit 2026-10-12)
--
-- The app talks to Postgres as the table owner through `pg`, never through the
-- Supabase Data API. Nothing legitimate uses the anon/authenticated roles, so
-- every public table is locked: RLS on with no policies (deny-all for those
-- roles) and their grants revoked. The owner role bypasses RLS, so the app is
-- unaffected.

-- 1. Lock every public table away from the Data API roles
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t.tablename);
  END LOOP;
END $$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated, PUBLIC;

-- 2. Shared rate-limit counters. Replaces the per-instance in-memory map, which
--    did nothing across serverless instances. One row per key per window.
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,
  count        INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON rate_limits FROM anon, authenticated;

-- 3. One free trial per user, ever. stripe_subscription_id is nulled on cancel,
--    so it could not be the "has trialled" marker.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_used_at TIMESTAMPTZ;
UPDATE subscriptions
   SET trial_used_at = COALESCE(trial_ends_at, created_at)
 WHERE trial_used_at IS NULL
   AND (stripe_subscription_id IS NOT NULL OR trial_ends_at IS NOT NULL);

-- 4. At most one active membership per (house, user). The old
--    UNIQUE(house_id, user_id, left_at) never fired for active rows because
--    NULLs are distinct.
DELETE FROM house_members a
 USING house_members b
 WHERE a.house_id = b.house_id
   AND a.user_id = b.user_id
   AND a.left_at IS NULL
   AND b.left_at IS NULL
   AND a.ctid > b.ctid;
CREATE UNIQUE INDEX IF NOT EXISTS house_members_one_active_membership
  ON house_members (house_id, user_id)
  WHERE left_at IS NULL;

-- 5. Pseudonymisation: clear the profile fields the first version left behind
--    and end every session of the erased account.
CREATE OR REPLACE FUNCTION pseudonymize_user(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users SET
    email            = CASE
                         WHEN email NOT LIKE 'deleted-%@anon.local'
                         THEN 'deleted-' || p_user_id || '@anon.local'
                         ELSE email
                       END,
    first_name       = 'Utente',
    last_name        = 'Eliminato',
    password_hash    = NULL,
    avatar_url       = NULL,
    profile_pictures = NULL,
    bio              = NULL,
    birthdate        = NULL,
    birthplace       = NULL,
    telephone        = NULL,
    instagram        = NULL,
    twitter          = NULL,
    linkedin         = NULL,
    tiktok           = NULL,
    gender           = NULL,
    nationality      = NULL,
    is_smoker        = NULL,
    languages        = NULL,
    pets             = NULL,
    job_title        = NULL,
    study_field      = NULL,
    occupation_type  = NULL,
    updated_at       = NOW()
  WHERE id = p_user_id;

  DELETE FROM email_verification_tokens WHERE user_id = p_user_id;
  DELETE FROM password_reset_tokens WHERE user_id = p_user_id;

  UPDATE refresh_tokens
    SET revoked_at = NOW()
  WHERE user_id = p_user_id AND revoked_at IS NULL;

  UPDATE gdpr_requests
    SET status = 'completed', completed_at = NOW()
  WHERE user_id = p_user_id AND type = 'deletion' AND status = 'pending';
END;
$$ LANGUAGE plpgsql;
REVOKE EXECUTE ON FUNCTION pseudonymize_user(UUID) FROM anon, authenticated, PUBLIC;

-- 6. Reset and verification tokens are now stored as SHA-256 hashes. Rows
--    written before this migration hold plaintext and can no longer match, so
--    drop them; affected users simply request a new link.
DELETE FROM password_reset_tokens;
DELETE FROM email_verification_tokens WHERE used_at IS NULL;

-- 7. Stripe reports more subscription states than the original CHECK allowed.
--    A webhook carrying one of the others failed to store, leaving the row on
--    its last (paid) status.
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status = ANY (ARRAY[
    'active', 'trialing', 'past_due', 'canceled', 'incomplete',
    'incomplete_expired', 'unpaid', 'paused'
  ]));

-- 8. Invite-code columns. Until now they were created only by
--    database/011_auth_onboarding.sql, so a database built from this folder
--    alone lacked them.
ALTER TABLE house_invitations ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE house_invitations ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMPTZ;
ALTER TABLE house_invitations ADD COLUMN IF NOT EXISTS code_used_at TIMESTAMPTZ;
ALTER TABLE house_invitations ADD COLUMN IF NOT EXISTS code_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE house_invitations ADD COLUMN IF NOT EXISTS code_locked_until TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_house_invitations_code
  ON house_invitations (code)
  WHERE code IS NOT NULL;
