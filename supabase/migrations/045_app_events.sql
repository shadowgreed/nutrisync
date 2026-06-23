-- ── App analytics events (Phase 7: Analytics Foundation) ─────────────────────
-- One generic event stream for core product actions: meal_logged,
-- activity_logged, water_logged, weight_logged, group_created, group_joined,
-- challenge_created, challenge_completed. (weekly_review_* already live in
-- weekly_review_events; help_* in help_events.) Written by the signed-in user;
-- read only with the service role for analytics/reporting — no SELECT policy.

CREATE TABLE IF NOT EXISTS app_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event      TEXT NOT NULL,
  props      JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Insert own app events" ON app_events;
CREATE POLICY "Insert own app events" ON app_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS app_events_event_created_idx ON app_events (event, created_at DESC);
CREATE INDEX IF NOT EXISTS app_events_user_created_idx  ON app_events (user_id, created_at DESC);
