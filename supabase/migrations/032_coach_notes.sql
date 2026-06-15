-- ── M1: private coach notes per client ───────────────────────────────────────
-- A coach can keep private notes about a member they coach. The member never sees
-- them. Gated entirely on is_group_coach() (migration 031). The Copilot draft /
-- status tables come later in M2.

CREATE TABLE IF NOT EXISTS coach_client_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  coach_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coach_client_notes_lookup_idx
  ON coach_client_notes (group_id, member_id, created_at DESC);

ALTER TABLE coach_client_notes ENABLE ROW LEVEL SECURITY;

-- Only a coach of the group may read/write their own notes; the member can never
-- select them (no policy grants the member access).
DROP POLICY IF EXISTS "Coach reads own group notes" ON coach_client_notes;
CREATE POLICY "Coach reads own group notes" ON coach_client_notes FOR SELECT
  USING (coach_id = auth.uid() AND public.is_group_coach(group_id, auth.uid()));

DROP POLICY IF EXISTS "Coach writes own group notes" ON coach_client_notes;
CREATE POLICY "Coach writes own group notes" ON coach_client_notes FOR INSERT
  WITH CHECK (coach_id = auth.uid() AND public.is_group_coach(group_id, auth.uid()));

DROP POLICY IF EXISTS "Coach deletes own notes" ON coach_client_notes;
CREATE POLICY "Coach deletes own notes" ON coach_client_notes FOR DELETE
  USING (coach_id = auth.uid());
