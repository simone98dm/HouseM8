-- GDPR consent records (WP2) + integer legal policy version (A4).

CREATE TABLE IF NOT EXISTS public.user_consents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  purpose      TEXT NOT NULL CHECK (purpose IN ('profile_sharing', 'withdrawal_waiver')),
  version      INTEGER NOT NULL,
  granted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ
);

-- At most one active consent per (user, purpose); history rows are kept.
CREATE UNIQUE INDEX IF NOT EXISTS user_consents_active_uniq
  ON public.user_consents (user_id, purpose)
  WHERE withdrawn_at IS NULL;

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_consents FROM anon, authenticated;

-- users.consent_version: text -> integer ('1.0' and anything else -> 1, NULL stays NULL)
ALTER TABLE public.users ALTER COLUMN consent_version DROP DEFAULT;
ALTER TABLE public.users
  ALTER COLUMN consent_version TYPE INTEGER
  USING (CASE WHEN consent_version IS NULL THEN NULL ELSE 1 END);
