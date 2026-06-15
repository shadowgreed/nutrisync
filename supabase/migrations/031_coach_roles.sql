-- ── M1: Coach role, group plan + member cap ──────────────────────────────────
-- Generalises the implicit founder (groups.created_by) into an explicit role on
-- group_members, and makes the hard-coded 6-member cap a per-group value driven by
-- the group's plan. Free groups stay at 6; a 'coach' plan unlocks a larger roster.
-- No Copilot/AI tables here — that's migration 032 (M2).

-- ── group_members.role ───────────────────────────────────────────────────────
ALTER TABLE group_members
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'
  CHECK (role IN ('coach', 'member'));

-- Backfill: each group's founder becomes its coach.
UPDATE group_members gm
SET    role = 'coach'
FROM   groups g
WHERE  gm.group_id = g.id
  AND  gm.user_id  = g.created_by
  AND  gm.role <> 'coach';

-- Members can already SELECT co-member rows (migration 016), so the role column is
-- visible to the whole group without a new policy. Members may not change their own
-- role: the existing group_members policies allow INSERT/DELETE of your own row but
-- no UPDATE, so role changes can only happen via SECURITY DEFINER functions.

-- ── groups.plan + member_cap ──────────────────────────────────────────────────
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'coach')),
  ADD COLUMN IF NOT EXISTS member_cap INT NOT NULL DEFAULT 6
    CHECK (member_cap BETWEEN 1 AND 200);

-- ── profiles.coach_visible ────────────────────────────────────────────────────
-- Explicit opt-out from the coach dashboard / Copilot, independent of dark mode.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS coach_visible BOOLEAN NOT NULL DEFAULT TRUE;

-- ── Helper: is the given user a coach of the given group? ─────────────────────
-- SECURITY DEFINER + STABLE so it can be used inside RLS policies without
-- recursing back through group_members' own policies.
CREATE OR REPLACE FUNCTION public.is_group_coach(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = p_user_id AND role = 'coach'
  );
$$;

-- ── Cap is now per-group, not a literal 6 ─────────────────────────────────────
-- Replaces the `>= 6` check in join_group_by_code (migration 012).
CREATE OR REPLACE FUNCTION join_group_by_code(p_code TEXT)
RETURNS TABLE (group_id UUID, group_name TEXT, status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g_id   UUID;
  g_name TEXT;
  g_cap  INT;
  members INT;
  uid    UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'unauthenticated'; RETURN;
  END IF;

  SELECT id, name, member_cap INTO g_id, g_name, g_cap
    FROM groups WHERE invite_code = lower(trim(p_code));
  IF g_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'not_found'; RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = g_id AND user_id = uid) THEN
    RETURN QUERY SELECT g_id, g_name, 'already_member'; RETURN;
  END IF;

  SELECT count(*) INTO members FROM group_members WHERE group_members.group_id = g_id;
  IF members >= COALESCE(g_cap, 6) THEN
    RETURN QUERY SELECT g_id, g_name, 'full'; RETURN;
  END IF;

  INSERT INTO group_members (group_id, user_id) VALUES (g_id, uid);
  RETURN QUERY SELECT g_id, g_name, 'joined';
END; $$;

-- Replaces the `>= 6` check in resolve_join_request (migration 023).
CREATE OR REPLACE FUNCTION resolve_join_request(p_request_id UUID, p_approve BOOLEAN)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r_group UUID;
  r_user  UUID;
  uid     UUID := auth.uid();
  members INT;
  g_cap   INT;
BEGIN
  SELECT group_id, user_id INTO r_group, r_user FROM group_join_requests WHERE id = p_request_id AND status = 'pending';
  IF r_group IS NULL THEN RETURN 'not_found'; END IF;

  -- Only the group's founder may resolve requests.
  IF NOT EXISTS (SELECT 1 FROM groups WHERE id = r_group AND created_by = uid) THEN
    RETURN 'forbidden';
  END IF;

  IF p_approve THEN
    SELECT count(*) INTO members FROM group_members WHERE group_id = r_group;
    SELECT member_cap INTO g_cap FROM groups WHERE id = r_group;
    IF members >= COALESCE(g_cap, 6) THEN RETURN 'full'; END IF;
    INSERT INTO group_members (group_id, user_id) VALUES (r_group, r_user)
      ON CONFLICT DO NOTHING;
    UPDATE group_join_requests SET status = 'approved' WHERE id = p_request_id;
    INSERT INTO notifications (user_id, actor_id, type, data)
    VALUES (r_user, uid, 'group_join', jsonb_build_object('approved', true));
    RETURN 'approved';
  ELSE
    UPDATE group_join_requests SET status = 'denied' WHERE id = p_request_id;
    RETURN 'denied';
  END IF;
END; $$;

-- ── Allow coach notification types (constraint last set in migration 027) ─────
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('reaction', 'comment', 'challenge', 'group_join', 'meal',
                  'weekly_report', 'cheer', 'join_request', 'reply',
                  'coach_message', 'coach_nudge'));
</content>
