-- Erasure completeness (GDPR Art. 17) + drop the unused comments table (B4).
--
-- pseudonymize_user() now also deletes the user's bulletin notes and reports
-- (and, by cascade, report images) and closes every active membership.

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
    telephone        = NULL,
    instagram        = NULL,
    twitter          = NULL,
    linkedin         = NULL,
    tiktok           = NULL,
    gender           = NULL,
    languages        = NULL,
    pets             = NULL,
    job_title        = NULL,
    study_field      = NULL,
    occupation_type  = NULL,
    updated_at       = NOW()
  WHERE id = p_user_id;

  -- Erasure completeness (Art. 17): user-authored free text and photos go
  -- away. report_images rows cascade from reports. Expenses/bills stay
  -- (shared ledger of the other tenants, only the author is pseudonymised).
  DELETE FROM bulletin_notes WHERE user_id = p_user_id;
  DELETE FROM reports WHERE created_by = p_user_id;

  UPDATE house_members
    SET left_at = NOW()
  WHERE user_id = p_user_id AND left_at IS NULL;

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

-- B4: peer comments were never shipped; no lawful basis to keep the table.
DROP TABLE IF EXISTS comments;

-- Cancelling a deletion restores what the request changed: track the houses
-- it archived and whether the Stripe cancellation was scheduled.
ALTER TABLE gdpr_requests
  ADD COLUMN IF NOT EXISTS archived_house_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS stripe_cancel_scheduled BOOLEAN NOT NULL DEFAULT false;
