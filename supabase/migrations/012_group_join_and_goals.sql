-- ── Fix: joining a group by invite code ──────────────────────────────────────
-- The groups SELECT policy only lets you see a group you created or already belong
-- to, so a new joiner can never look it up by code. This SECURITY DEFINER function
-- finds the group + adds the membership atomically, bypassing that chicken-and-egg.

CREATE OR REPLACE FUNCTION join_group_by_code(p_code TEXT)
RETURNS TABLE (group_id UUID, group_name TEXT, status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g_id   UUID;
  g_name TEXT;
  members INT;
  uid    UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'unauthenticated'; RETURN;
  END IF;

  SELECT id, name INTO g_id, g_name FROM groups WHERE invite_code = lower(trim(p_code));
  IF g_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'not_found'; RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = g_id AND user_id = uid) THEN
    RETURN QUERY SELECT g_id, g_name, 'already_member'; RETURN;
  END IF;

  SELECT count(*) INTO members FROM group_members WHERE group_members.group_id = g_id;
  IF members >= 6 THEN
    RETURN QUERY SELECT g_id, g_name, 'full'; RETURN;
  END IF;

  INSERT INTO group_members (group_id, user_id) VALUES (g_id, uid);
  RETURN QUERY SELECT g_id, g_name, 'joined';
END; $$;

-- ── Multi-select goals ────────────────────────────────────────────────────────
-- `goal` stays as the single "primary" goal (used for the calorie-target maths);
-- `goals` holds every goal the user selected during onboarding.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goals TEXT[];
