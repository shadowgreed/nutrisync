-- ── Member diet + coach diet override ────────────────────────────────────────
-- A member's diet lets the Copilot acknowledge nutrients that naturally run low on
-- it (e.g. a vegan's B12) instead of flagging them. The member sets their own diet;
-- a coach can override it per client (coach_client_settings).

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS diet TEXT
  CHECK (diet IN ('omnivore','vegetarian','vegan','pescatarian','keto',
                  'paleo','mediterranean','carnivore','gluten_free','dairy_free'));

CREATE TABLE IF NOT EXISTS coach_client_settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  coach_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  diet_override TEXT CHECK (diet_override IN ('omnivore','vegetarian','vegan','pescatarian','keto',
                  'paleo','mediterranean','carnivore','gluten_free','dairy_free')),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (coach_id, member_id)
);

ALTER TABLE coach_client_settings ENABLE ROW LEVEL SECURITY;

-- Only the owning coach can see/manage their per-client settings; the member can't.
DROP POLICY IF EXISTS "Coach reads own client settings" ON coach_client_settings;
CREATE POLICY "Coach reads own client settings" ON coach_client_settings FOR SELECT
  USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Coach creates own client settings" ON coach_client_settings;
CREATE POLICY "Coach creates own client settings" ON coach_client_settings FOR INSERT
  WITH CHECK (coach_id = auth.uid() AND public.is_group_coach(group_id, auth.uid()));

DROP POLICY IF EXISTS "Coach updates own client settings" ON coach_client_settings;
CREATE POLICY "Coach updates own client settings" ON coach_client_settings FOR UPDATE
  USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Coach deletes own client settings" ON coach_client_settings;
CREATE POLICY "Coach deletes own client settings" ON coach_client_settings FOR DELETE
  USING (coach_id = auth.uid());
