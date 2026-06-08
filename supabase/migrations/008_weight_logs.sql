-- ── Weight history ───────────────────────────────────────────────────────────
-- profiles.weight_kg holds the current weight; this table tracks it over time so
-- the Trends page can chart progress. Nutrition trends work without this table.

CREATE TABLE IF NOT EXISTS weight_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  weight_kg  NUMERIC(5,2) NOT NULL,
  logged_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own weight logs" ON weight_logs;
CREATE POLICY "Users can manage own weight logs" ON weight_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
