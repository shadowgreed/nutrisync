-- ── Cheers + richer member popup ─────────────────────────────────────────────

-- 1. New 'cheer' notification type (constraint last set in migration 020).
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('reaction', 'comment', 'challenge', 'group_join', 'meal', 'weekly_report', 'cheer'));

-- 2. Let group members see each other's activity logs (read-only) so the member
--    popup can show "3 workouts this week". Writes stay owner-only via the
--    existing FOR ALL policy; this just adds a SELECT grant.
DROP POLICY IF EXISTS "Members can view group activity logs" ON activity_logs;
CREATE POLICY "Members can view group activity logs" ON activity_logs FOR SELECT
  USING (user_id = auth.uid() OR user_id IN (SELECT public.get_my_group_member_ids()));
