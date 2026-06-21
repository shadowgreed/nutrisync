-- ── Help Center analytics ────────────────────────────────────────────────────
-- Lightweight event log for the Help Center: searches performed (+ result
-- counts), article views, and Helpful / Not Helpful feedback. One row per event.
-- Written by the client for the signed-in user; read only with the service role
-- (analytics dashboards), so there is no SELECT policy.

CREATE TABLE IF NOT EXISTS help_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type         TEXT NOT NULL CHECK (type IN ('search', 'view', 'feedback')),
  slug         TEXT,        -- article slug (view / feedback)
  query        TEXT,        -- search term (search)
  result_count INT,         -- number of results (search)
  helpful      BOOLEAN,     -- thumbs up/down (feedback)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE help_events ENABLE ROW LEVEL SECURITY;

-- Users can record their own help interactions; the client never reads them back.
DROP POLICY IF EXISTS "Insert own help events" ON help_events;
CREATE POLICY "Insert own help events" ON help_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS help_events_type_created_idx ON help_events (type, created_at DESC);
CREATE INDEX IF NOT EXISTS help_events_slug_idx ON help_events (slug) WHERE slug IS NOT NULL;
