-- ── Group challenges ─────────────────────────────────────────────────────────
-- A challenge belongs to a group and defines a metric + goal over a date window.
-- Each member's progress is computed live from their food_logs (no progress table).

CREATE TABLE IF NOT EXISTS challenges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID REFERENCES groups(id) ON DELETE CASCADE,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  metric      TEXT NOT NULL CHECK (metric IN ('log_days', 'protein_days', 'micro_days')),
  goal        INT  NOT NULL CHECK (goal > 0),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Members of the group can see its challenges (get_my_group_ids bypasses recursion)
DROP POLICY IF EXISTS "Members view group challenges" ON challenges;
CREATE POLICY "Members view group challenges" ON challenges FOR SELECT
  USING (group_id IN (SELECT get_my_group_ids()));

-- Members can create challenges in a group they belong to
DROP POLICY IF EXISTS "Members create challenges" ON challenges;
CREATE POLICY "Members create challenges" ON challenges FOR INSERT
  WITH CHECK (created_by = auth.uid() AND group_id IN (SELECT get_my_group_ids()));

-- The creator can delete their challenge
DROP POLICY IF EXISTS "Creator deletes challenge" ON challenges;
CREATE POLICY "Creator deletes challenge" ON challenges FOR DELETE
  USING (created_by = auth.uid());
