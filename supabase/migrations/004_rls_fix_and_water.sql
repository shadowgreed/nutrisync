-- ── Fix infinite recursion in group_members RLS ──────────────────────────────
-- The original SELECT policy queried group_members from within itself.
-- Fix: use SECURITY DEFINER functions that bypass RLS.

DROP POLICY IF EXISTS "Members can view group membership" ON group_members;
CREATE POLICY "Members can view own membership" ON group_members
  FOR SELECT USING (user_id = auth.uid());

-- Helper: returns all group_ids the current user belongs to (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_group_ids()
RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT group_id FROM group_members WHERE user_id = auth.uid();
$$;

-- Helper: returns all user_ids that share any group with the current user
CREATE OR REPLACE FUNCTION public.get_my_group_member_ids()
RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT DISTINCT gm2.user_id
  FROM   group_members gm1
  JOIN   group_members gm2 ON gm2.group_id = gm1.group_id
  WHERE  gm1.user_id = auth.uid();
$$;

-- Re-create groups policy using helper (avoids recursion)
DROP POLICY IF EXISTS "Members can view their groups" ON groups;
CREATE POLICY "Members can view their groups" ON groups FOR SELECT
  USING (id IN (SELECT get_my_group_ids()));

-- Re-create food_logs visibility policy using helper
DROP POLICY IF EXISTS "Users can view logs from their group members" ON food_logs;
CREATE POLICY "Users can view logs from their group members" ON food_logs FOR SELECT
  USING (user_id = auth.uid() OR user_id IN (SELECT get_my_group_member_ids()));


-- ── Water intake tracking ─────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS water_bottle_ml      INT DEFAULT 500;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS water_daily_target_ml INT DEFAULT 2500;

CREATE TABLE IF NOT EXISTS water_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount_ml  INT NOT NULL,
  logged_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own water logs" ON water_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
