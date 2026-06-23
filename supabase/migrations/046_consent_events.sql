-- ── Consent audit log ────────────────────────────────────────────────────────
-- Append-only record that a user accepted Terms + Privacy at signup (timestamp +
-- terms version), for App Store / Play / GDPR consent evidence. Written by the
-- user for themselves; read only with the service role.

CREATE TABLE IF NOT EXISTS consent_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL DEFAULT 'signup_terms',
  version    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE consent_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Insert own consent" ON consent_events;
CREATE POLICY "Insert own consent" ON consent_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS consent_events_user_idx ON consent_events (user_id, created_at DESC);
