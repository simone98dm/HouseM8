-- GDPR WP9: security audit trail (art. 32). Stores no raw IP, only a hash.
-- Rows are purged after 12 months by /api/cron/gdpr-cleanup.
CREATE TABLE IF NOT EXISTS security_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  event      TEXT NOT NULL CHECK (event IN (
    'signin_success', 'signin_failed', 'signup', 'password_reset',
    'data_export', 'deletion_requested', 'deletion_cancelled',
    'account_pseudonymized', 'role_changed', 'ownership_transferred',
    'consent_granted', 'consent_withdrawn', 'subscription_withdrawn',
    'settlement_recorded', 'settlement_undone'
  )),
  ip_hash    TEXT NULL,
  metadata   JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events (created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events (user_id);
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON security_events FROM anon, authenticated;
