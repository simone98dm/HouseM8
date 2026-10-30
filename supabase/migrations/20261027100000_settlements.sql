-- Payments ledger ("settlements").
--
-- Balances are computed from ALL expense shares (creator credited, share user
-- debited, paid or not) minus the non-undone rows of this table. A row is one
-- real payment from `from_user_id` to `to_user_id`:
--   kind = 'settlement'  a transfer of the settle-up plan (POST /houses/:id/settle).
--                        It may be netted across people, so it is NOT tied to one share.
--   kind = 'share'       "mark paid" on a single expense share (share_id set).
--
-- expense_shares.is_paid / paid_at / settlement_id are display-only: a plan
-- payment is allocated FIFO to the debtor's unpaid shares (whole shares only)
-- and those shares get settlement_id = the payment, so undoing the payment
-- reverts exactly them. Balances never read those flags.
--
-- Undo (24h window, enforced by the API) stamps undone_at; the row stays as
-- the audit record.
--
-- GDPR: rows are exported by PostgresGdprRepository.exportUserData. Erasure
-- (pseudonymize_user) deliberately keeps them: they are part of the shared
-- financial ledger of the other housemates and only reference users by id, so
-- the pseudonymised users row is the only personal data they point at.
CREATE TABLE IF NOT EXISTS settlements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id     UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES users(id),
  to_user_id   UUID NOT NULL REFERENCES users(id),
  amount       NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  kind         TEXT NOT NULL DEFAULT 'settlement' CHECK (kind IN ('settlement', 'share')),
  share_id     UUID NULL REFERENCES expense_shares(id) ON DELETE SET NULL,
  created_by   UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  undone_at    TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS idx_settlements_house_created_at ON settlements (house_id, created_at);
CREATE INDEX IF NOT EXISTS idx_settlements_share_id ON settlements (share_id) WHERE share_id IS NOT NULL;
-- at most one live payment per share: double "mark paid" cannot double-count
CREATE UNIQUE INDEX IF NOT EXISTS uq_settlements_live_share
  ON settlements (share_id) WHERE kind = 'share' AND undone_at IS NULL;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON settlements FROM anon, authenticated;

ALTER TABLE expense_shares
  ADD COLUMN IF NOT EXISTS settlement_id UUID NULL REFERENCES settlements(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_expense_shares_settlement_id
  ON expense_shares (settlement_id) WHERE settlement_id IS NOT NULL;

-- Backfill: every share already paid (and not the creator's own) becomes a
-- 'share' payment, so balances stay identical to the old "unpaid shares only"
-- model. Idempotent: skips shares that already have a payment row.
INSERT INTO settlements (house_id, from_user_id, to_user_id, amount, kind, share_id, created_by, created_at)
SELECT e.house_id, es.user_id, e.created_by, es.amount_due, 'share', es.id, es.user_id,
       COALESCE(es.paid_at, NOW())
  FROM expense_shares es
  JOIN expenses e ON e.id = es.expense_id
 WHERE es.is_paid = true
   AND es.user_id <> e.created_by
   AND es.amount_due > 0
   AND es.settlement_id IS NULL  -- paid by a plan payment (re-run safety): already in the ledger
   AND NOT EXISTS (SELECT 1 FROM settlements s WHERE s.share_id = es.id);

-- Audit trail: allow the share pay/unpay events (the CHECK in
-- 20261026120000_security_events.sql predates them).
ALTER TABLE security_events DROP CONSTRAINT IF EXISTS security_events_event_check;
ALTER TABLE security_events ADD CONSTRAINT security_events_event_check CHECK (event IN (
  'signin_success', 'signin_failed', 'signup', 'password_reset',
  'data_export', 'deletion_requested', 'deletion_cancelled',
  'account_pseudonymized', 'role_changed', 'ownership_transferred',
  'consent_granted', 'consent_withdrawn', 'subscription_withdrawn',
  'settlement_recorded', 'settlement_undone', 'share_paid', 'share_unpaid'
));
