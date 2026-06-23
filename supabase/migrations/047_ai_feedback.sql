-- ── AI feedback (report incorrect estimate) ─────────────────────────────────
-- Lets users flag an AI nutrition estimate as wrong (App Store / Google Play
-- AI-content expectations: a feedback/report path). Append-only; reviewed with
-- the service role. Written by the reporting user for themselves.

CREATE TABLE IF NOT EXISTS ai_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  kind        TEXT NOT NULL DEFAULT 'incorrect_estimate'
                CHECK (kind IN ('incorrect_estimate', 'inappropriate', 'other')),
  context     TEXT,        -- where it happened, e.g. 'meal_photo' / 'food_search'
  detail      TEXT,        -- the food name / short note
  food_log_id UUID REFERENCES food_logs(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Insert own ai feedback" ON ai_feedback;
CREATE POLICY "Insert own ai feedback" ON ai_feedback FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS ai_feedback_kind_created_idx ON ai_feedback (kind, created_at DESC);
