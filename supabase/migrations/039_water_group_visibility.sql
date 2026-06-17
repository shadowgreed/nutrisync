-- ── Group-visibility for water logs ──────────────────────────────────────────
-- water_logs were readable only by their owner. Let group members read each
-- other's water logs (same model as food_logs) so a coach can track a client's
-- hydration alongside calories, nutrients and active days. Write access stays
-- owner-only (the existing "manage own" FOR ALL policy). Permissive policies are
-- OR'd, so this only widens SELECT.

DROP POLICY IF EXISTS "View group members water logs" ON water_logs;
CREATE POLICY "View group members water logs" ON water_logs FOR SELECT
  USING (user_id = auth.uid() OR user_id IN (SELECT public.get_my_group_member_ids()));
