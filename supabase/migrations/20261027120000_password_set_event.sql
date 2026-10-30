-- Audit trail: password_set records the first password, chosen on the sign-up
-- confirmation link (POST /api/auth/confirm with a password).
ALTER TABLE security_events DROP CONSTRAINT IF EXISTS security_events_event_check;
ALTER TABLE security_events ADD CONSTRAINT security_events_event_check CHECK (event IN (
  'signin_success', 'signin_failed', 'signup', 'password_reset', 'password_set',
  'data_export', 'deletion_requested', 'deletion_cancelled',
  'account_pseudonymized', 'role_changed', 'ownership_transferred',
  'consent_granted', 'consent_withdrawn', 'subscription_withdrawn',
  'settlement_recorded', 'settlement_undone', 'share_paid', 'share_unpaid'
));
