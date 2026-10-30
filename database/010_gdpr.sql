-- database/010_gdpr.sql
-- GDPR compliance: soft-delete, consent tracking, gdpr_requests, drop oauth_tokens

-- 1. Soft delete + consent columns on users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS consent_version TEXT DEFAULT '1.0';

CREATE INDEX IF NOT EXISTS idx_users_deleted_at
  ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- 2. GDPR requests audit log
CREATE TABLE IF NOT EXISTS gdpr_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('export', 'deletion', 'deletion_cancelled')) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')) DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  scheduled_for TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user_id ON gdpr_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_type ON gdpr_requests(type);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_scheduled_for ON gdpr_requests(scheduled_for)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user_type ON gdpr_requests(user_id, type);

-- 3. Remove PII from email_verification_tokens
ALTER TABLE email_verification_tokens
  DROP COLUMN IF EXISTS first_name,
  DROP COLUMN IF EXISTS last_name;

-- 4. Drop oauth_tokens (no longer persisted)
DROP TABLE IF EXISTS oauth_tokens;

-- 5. Anonymize invited_email when invitation is used (trigger)
CREATE OR REPLACE FUNCTION anonymize_used_invitation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.used = TRUE AND OLD.used = FALSE AND NEW.invited_email != 'anon@deleted.local' THEN
    NEW.invited_email := 'anon@deleted.local';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_anonymize_invitation ON house_invitations;
CREATE TRIGGER trg_anonymize_invitation
  BEFORE UPDATE ON house_invitations
  FOR EACH ROW EXECUTE FUNCTION anonymize_used_invitation();

-- 6. Pseudonymization function
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
    updated_at       = NOW()
  WHERE id = p_user_id;

  UPDATE gdpr_requests
    SET status = 'completed', completed_at = NOW()
  WHERE user_id = p_user_id AND type = 'deletion' AND status = 'pending';
END;
$$ LANGUAGE plpgsql;
