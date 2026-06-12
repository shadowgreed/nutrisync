-- ── Group join requests (member invites + owner approval) ────────────────────
-- The invite code stays private to the creator (UI-enforced). Any member can
-- invite a friend via a link that creates a PENDING request; the group founder
-- approves or denies it.

CREATE TABLE IF NOT EXISTS group_join_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;

-- A user can see their own requests; a group's founder can see all requests for it.
DROP POLICY IF EXISTS "View own or owned group requests" ON group_join_requests;
CREATE POLICY "View own or owned group requests" ON group_join_requests FOR SELECT
  USING (user_id = auth.uid() OR group_id IN (SELECT id FROM groups WHERE created_by = auth.uid()));

-- Allow the 'join_request' notification type (constraint last set in migration 021).
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('reaction', 'comment', 'challenge', 'group_join', 'meal', 'weekly_report', 'cheer', 'join_request'));

-- ── request_group_join: a friend asks to join via a member's invite link ─────
CREATE OR REPLACE FUNCTION request_group_join(p_group_id UUID)
RETURNS TABLE (group_name TEXT, status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g_name TEXT;
  g_owner UUID;
  uid UUID := auth.uid();
  existing TEXT;
BEGIN
  IF uid IS NULL THEN RETURN QUERY SELECT NULL::TEXT, 'unauthenticated'; RETURN; END IF;

  SELECT name, created_by INTO g_name, g_owner FROM groups WHERE id = p_group_id;
  IF g_name IS NULL THEN RETURN QUERY SELECT NULL::TEXT, 'not_found'; RETURN; END IF;

  IF EXISTS (SELECT 1 FROM group_members WHERE group_id = p_group_id AND user_id = uid) THEN
    RETURN QUERY SELECT g_name, 'already_member'; RETURN;
  END IF;

  SELECT gjr.status INTO existing FROM group_join_requests gjr
    WHERE gjr.group_id = p_group_id AND gjr.user_id = uid;
  IF existing = 'pending' THEN RETURN QUERY SELECT g_name, 'already_requested'; RETURN; END IF;

  -- Upsert the request back to pending (re-request after a denial is allowed).
  INSERT INTO group_join_requests (group_id, user_id, status)
  VALUES (p_group_id, uid, 'pending')
  ON CONFLICT (group_id, user_id) DO UPDATE SET status = 'pending', created_at = NOW();

  -- Notify the founder.
  IF g_owner IS NOT NULL THEN
    INSERT INTO notifications (user_id, actor_id, type, data)
    VALUES (g_owner, uid, 'join_request', jsonb_build_object('group_id', p_group_id, 'group_name', g_name));
  END IF;

  RETURN QUERY SELECT g_name, 'requested';
END; $$;

-- ── resolve_join_request: founder approves or denies ─────────────────────────
CREATE OR REPLACE FUNCTION resolve_join_request(p_request_id UUID, p_approve BOOLEAN)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r_group UUID;
  r_user  UUID;
  uid     UUID := auth.uid();
  members INT;
BEGIN
  SELECT group_id, user_id INTO r_group, r_user FROM group_join_requests WHERE id = p_request_id AND status = 'pending';
  IF r_group IS NULL THEN RETURN 'not_found'; END IF;

  -- Only the group's founder may resolve requests.
  IF NOT EXISTS (SELECT 1 FROM groups WHERE id = r_group AND created_by = uid) THEN
    RETURN 'forbidden';
  END IF;

  IF p_approve THEN
    SELECT count(*) INTO members FROM group_members WHERE group_id = r_group;
    IF members >= 6 THEN RETURN 'full'; END IF;
    INSERT INTO group_members (group_id, user_id) VALUES (r_group, r_user)
      ON CONFLICT DO NOTHING;
    UPDATE group_join_requests SET status = 'approved' WHERE id = p_request_id;
    -- Let the requester know they're in.
    INSERT INTO notifications (user_id, actor_id, type, data)
    VALUES (r_user, uid, 'group_join', jsonb_build_object('approved', true));
    RETURN 'approved';
  ELSE
    UPDATE group_join_requests SET status = 'denied' WHERE id = p_request_id;
    RETURN 'denied';
  END IF;
END; $$;
