-- 054_group_rejoin_fix.sql
-- NF-SEC-1 (audit 2026-07-15): migration 053's group_members INSERT policy
-- accepted any lingering group_join_requests row with status = 'approved'.
-- Neither founder removal (/api/group/remove-member) nor "Leave group" ever
-- resets that row, so an expelled or departed member could re-INSERT their
-- own membership directly with the anon key — defeating the removal and
-- bypassing the member cap (which is enforced only inside the RPCs).
--
-- The approved-request branch was also dead code for every legitimate flow:
-- resolve_join_request() performs the membership INSERT itself under
-- SECURITY DEFINER (bypassing RLS), as does join_group_by_code(). The only
-- client-side INSERT in the codebase is the founder's self-join at group
-- creation. So the policy needs exactly one branch: the founder's.
-- Idempotent; safe to re-run. Apply via the Supabase SQL editor.

DROP POLICY IF EXISTS "Users can join groups" ON group_members;
CREATE POLICY "Users can join groups" ON group_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_members.group_id AND g.created_by = auth.uid()
    )
  );

-- Belt and braces: retire the stale approvals themselves. Any 'approved'
-- request whose user is not currently a member is a removal/leave leftover;
-- mark it denied so no future policy or code path can treat it as live.
UPDATE group_join_requests r
SET status = 'denied'
WHERE r.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM group_members m
    WHERE m.group_id = r.group_id AND m.user_id = r.user_id
  );

-- Rollback reference (do NOT run unless reverting to the 053 policy):
-- DROP POLICY IF EXISTS "Users can join groups" ON group_members;
-- CREATE POLICY "Users can join groups" ON group_members FOR INSERT
--   WITH CHECK (auth.uid() = user_id AND (
--     EXISTS (SELECT 1 FROM groups g WHERE g.id = group_members.group_id AND g.created_by = auth.uid())
--     OR EXISTS (SELECT 1 FROM group_join_requests r WHERE r.group_id = group_members.group_id
--                AND r.user_id = auth.uid() AND r.status = 'approved')));
