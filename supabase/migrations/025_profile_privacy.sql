-- ── Lock down profile reads ──────────────────────────────────────────────────
-- The old policy was `USING (true)` — any authenticated user (and the public anon
-- key is shared with every browser) could read EVERY user's weight, goals, height,
-- birth year, etc. Scope reads to yourself + people who share a group with you.

DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view self and group members" ON profiles;
CREATE POLICY "Users can view self and group members" ON profiles FOR SELECT
  USING (id = auth.uid() OR id IN (SELECT public.get_my_group_member_ids()));

-- A group founder still needs to see the NAME/AVATAR of people requesting to join,
-- even though they aren't group members yet. This bypasses the policy above for
-- exactly that case (and only for the group's owner).
CREATE OR REPLACE FUNCTION get_group_pending_requests(p_group_id UUID)
RETURNS TABLE (id UUID, user_id UUID, display_name TEXT, avatar_url TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM groups WHERE id = p_group_id AND created_by = auth.uid()) THEN
    RETURN; -- caller isn't the founder: expose nothing
  END IF;
  RETURN QUERY
    SELECT gjr.id, gjr.user_id, p.display_name, p.avatar_url
    FROM   group_join_requests gjr
    JOIN   profiles p ON p.id = gjr.user_id
    WHERE  gjr.group_id = p_group_id AND gjr.status = 'pending'
    ORDER BY gjr.created_at ASC;
END; $$;

-- Store the requester's name on the join-request notification so the founder still
-- sees who it's from (their profile is no longer publicly readable).
CREATE OR REPLACE FUNCTION request_group_join(p_group_id UUID)
RETURNS TABLE (group_name TEXT, status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g_name TEXT;
  g_owner UUID;
  uid UUID := auth.uid();
  existing TEXT;
  r_name TEXT;
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

  INSERT INTO group_join_requests (group_id, user_id, status)
  VALUES (p_group_id, uid, 'pending')
  ON CONFLICT (group_id, user_id) DO UPDATE SET status = 'pending', created_at = NOW();

  IF g_owner IS NOT NULL THEN
    SELECT display_name INTO r_name FROM profiles WHERE id = uid;
    INSERT INTO notifications (user_id, actor_id, type, data)
    VALUES (g_owner, uid, 'join_request',
            jsonb_build_object('group_id', p_group_id, 'group_name', g_name, 'requester_name', COALESCE(r_name, 'Someone')));
  END IF;

  RETURN QUERY SELECT g_name, 'requested';
END; $$;
