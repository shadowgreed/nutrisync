-- 048_rls_and_bounds.sql
-- Engineering re-audit (2026-06-27) follow-ups: H7 (comments UPDATE policy +
-- over-broad SELECT note), unbounded JSONB guards, and the missing
-- group_join_requests access-pattern indexes (re-audit N1).
-- Idempotent; safe to re-run.

-- ── H7a: comments UPDATE policy ──────────────────────────────────────────────
-- comments had INSERT/DELETE/SELECT policies but no UPDATE policy, so any future
-- edit feature would silently fail under RLS. Author-only edit.
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── N1: group_join_requests access-pattern indexes ───────────────────────────
-- The table is read by (group_id[, status]) for the coach "pending requests"
-- list and by (user_id) for "my requests"; it only had a UNIQUE constraint.
CREATE INDEX IF NOT EXISTS group_join_requests_group_status_idx
  ON group_join_requests(group_id, status);
CREATE INDEX IF NOT EXISTS group_join_requests_user_idx
  ON group_join_requests(user_id);

-- ── Unbounded JSONB guards ───────────────────────────────────────────────────
-- Cap the two user-influenced JSONB columns so a malformed/huge payload can't
-- bloat a row. Added NOT VALID so existing rows are never rejected — the bound
-- only applies to new writes. Limits are generous (normal payloads are < 5 KB).
ALTER TABLE food_logs    DROP CONSTRAINT IF EXISTS food_logs_foods_size_chk;
ALTER TABLE food_logs    ADD  CONSTRAINT food_logs_foods_size_chk
  CHECK (octet_length(foods::text) <= 100000) NOT VALID;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_data_size_chk;
ALTER TABLE notifications ADD  CONSTRAINT notifications_data_size_chk
  CHECK (octet_length(data::text) <= 16000) NOT VALID;

-- ── H7b: tighten over-broad SELECT (REVIEW BEFORE ENABLING) ──────────────────
-- comments / reactions / comment_likes all SELECT with USING (true), so any
-- authenticated user can read every row directly (the app only ever reads them
-- joined to a visible food_log/activity_log, so feed UX is unaffected — but the
-- raw policy is over-broad).
--
-- The scoped form below makes a row visible only when the underlying log is
-- visible to the caller (food_logs/activity_logs RLS already scopes that). It is
-- left COMMENTED because tightening a live feed's read policy must be validated
-- against production data first — an off-by-one here silently hides comments.
-- Enable after verifying feed reads in staging.
--
-- DROP POLICY IF EXISTS "Anyone in group can view comments" ON comments;
-- CREATE POLICY "View comments on visible logs" ON comments FOR SELECT USING (
--   (food_log_id IS NOT NULL AND EXISTS (SELECT 1 FROM food_logs fl WHERE fl.id = comments.food_log_id))
--   OR (activity_log_id IS NOT NULL AND EXISTS (SELECT 1 FROM activity_logs al WHERE al.id = comments.activity_log_id))
-- );
--
-- DROP POLICY IF EXISTS "Anyone in group can view reactions" ON reactions;
-- CREATE POLICY "View reactions on visible logs" ON reactions FOR SELECT USING (
--   (food_log_id IS NOT NULL AND EXISTS (SELECT 1 FROM food_logs fl WHERE fl.id = reactions.food_log_id))
--   OR (activity_log_id IS NOT NULL AND EXISTS (SELECT 1 FROM activity_logs al WHERE al.id = reactions.activity_log_id))
-- );
--
-- DROP POLICY IF EXISTS "Anyone can view comment likes" ON comment_likes;
-- CREATE POLICY "View likes on visible comments" ON comment_likes FOR SELECT USING (
--   EXISTS (SELECT 1 FROM comments c WHERE c.id = comment_likes.comment_id)
-- );
