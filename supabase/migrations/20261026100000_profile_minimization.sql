-- Profile minimization (GDPR data minimisation, Art. 5(1)(c))
--
-- birthplace, nationality, birthdate and is_smoker are not needed by any
-- feature (and nationality/birthplace hint at special-category data). Drop
-- the columns, which also wipes the stored values, and update the erasure
-- function so it no longer references them.

ALTER TABLE users
  DROP COLUMN IF EXISTS birthplace,
  DROP COLUMN IF EXISTS nationality,
  DROP COLUMN IF EXISTS birthdate,
  DROP COLUMN IF EXISTS is_smoker;

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
