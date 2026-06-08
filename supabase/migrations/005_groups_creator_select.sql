-- The groups SELECT policy only allowed members, not the creator.
-- When creating a group and calling .insert().select(), the user is not yet in
-- group_members, so the SELECT fails with an RLS violation.
-- Fix: also allow the creator to read their own group.

DROP POLICY IF EXISTS "Members can view their groups" ON groups;

CREATE POLICY "Members can view their groups" ON groups FOR SELECT
  USING (
    created_by = auth.uid()
    OR id IN (SELECT get_my_group_ids())
  );
