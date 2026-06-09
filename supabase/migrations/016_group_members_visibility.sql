-- ── Let members see their co-members ─────────────────────────────────────────
-- Migration 004 narrowed the group_members SELECT policy to "own row only"
-- (user_id = auth.uid()) to break an RLS recursion. Side effect: the group feed
-- could no longer list the OTHER members of your groups, so it only ever showed
-- your own posts. food_logs RLS already permits reading co-members' logs — the
-- feed just never asked for them because the member list came back as [you].
--
-- Fix: add a second, non-recursive SELECT policy that exposes every membership
-- row for any group you belong to. get_my_group_ids() is SECURITY DEFINER and
-- bypasses RLS, so there is no recursion back into group_members.

CREATE POLICY "Members can view co-members" ON group_members FOR SELECT
  USING (group_id IN (SELECT public.get_my_group_ids()));
