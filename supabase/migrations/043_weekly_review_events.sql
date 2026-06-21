-- ── Weekly Review 2.0 analytics ──────────────────────────────────────────────
-- Funnel + engagement events for the weekly story (opened, slide_viewed,
-- completed, shared, paused, dismissed, mission_accepted, group_comparison_viewed).
-- Written by the client for the signed-in user; read only with the service role.

CREATE TABLE IF NOT EXISTS weekly_review_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event      TEXT NOT NULL,
  slide      TEXT,        -- slide key, for slide_viewed
  week_key   TEXT,        -- which week's review (local week id)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE weekly_review_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Insert own weekly review events" ON weekly_review_events;
CREATE POLICY "Insert own weekly review events" ON weekly_review_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS weekly_review_events_event_idx ON weekly_review_events (event, created_at DESC);
