-- 053_p0_security_fixes.sql
-- P0 security fixes from docs/PRODUCTION-READINESS-MASTER-AUDIT-2026-07-06.md:
--   PR-01  group_members INSERT lets any authenticated user self-join any group
--   PR-02  comments/reactions/comment_likes SELECT is USING (true) — global read
--   PR-10  handle_new_user() is SECURITY DEFINER without a search_path pin
--   PR-11  (bonus, zero-risk) missing push_subscriptions(user_id) index
-- Idempotent; safe to re-run. Apply via the Supabase SQL editor per docs/DEPLOYMENT.md.
--
-- NOTE: rename to the next free number if another migration lands first.

-- ── PR-01: scope group_members INSERT ────────────────────────────────────────
-- Old policy: WITH CHECK (auth.uid() = user_id) — "the row is mine" was the
-- entire check, so any signed-in user could join any group directly with the
-- anon key, bypassing invite codes, founder approval, and the member cap.
--
-- New policy: a user may insert their own membership row only when they are
-- the group's creator (the founder self-join during group creation) or they
-- hold an approved join request for that group.
--
-- The SECURITY DEFINER RPCs (join_group_by_code, resolve_join_request) bypass
-- RLS by definition, so the approval flow and code-join flow are unaffected.
DROP POLICY IF EXISTS "Users can join groups" ON group_members;
CREATE POLICY "Users can join groups" ON group_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Founder creating their own group
      EXISTS (
        SELECT 1 FROM groups g
        WHERE g.id = group_members.group_id AND g.created_by = auth.uid()
      )
      -- Or an approved join request for this group
      OR EXISTS (
        SELECT 1 FROM group_join_requests r
        WHERE r.group_id = group_members.group_id
          AND r.user_id  = auth.uid()
          AND r.status   = 'approved'   -- verify literal against the migration that created group_join_requests
      )
    )
  );

-- ── PR-02: enable the scoped SELECT policies drafted in 048 (H7b) ───────────
-- Verbatim from the commented block in 048_rls_and_bounds.sql. A row is
-- visible only when its underlying log is visible to the caller — food_logs /
-- activity_logs RLS already scopes that to "me or my group co-members".
DROP POLICY IF EXISTS "Anyone in group can view comments" ON comments;
DROP POLICY IF EXISTS "View comments on visible logs" ON comments;
CREATE POLICY "View comments on visible logs" ON comments FOR SELECT USING (
  (food_log_id IS NOT NULL AND EXISTS (SELECT 1 FROM food_logs fl WHERE fl.id = comments.food_log_id))
  OR (activity_log_id IS NOT NULL AND EXISTS (SELECT 1 FROM activity_logs al WHERE al.id = comments.activity_log_id))
);

DROP POLICY IF EXISTS "Anyone in group can view reactions" ON reactions;
DROP POLICY IF EXISTS "View reactions on visible logs" ON reactions;
CREATE POLICY "View reactions on visible logs" ON reactions FOR SELECT USING (
  (food_log_id IS NOT NULL AND EXISTS (SELECT 1 FROM food_logs fl WHERE fl.id = reactions.food_log_id))
  OR (activity_log_id IS NOT NULL AND EXISTS (SELECT 1 FROM activity_logs al WHERE al.id = reactions.activity_log_id))
);

DROP POLICY IF EXISTS "Anyone can view comment likes" ON comment_likes;
DROP POLICY IF EXISTS "View likes on visible comments" ON comment_likes;
CREATE POLICY "View likes on visible comments" ON comment_likes FOR SELECT USING (
  EXISTS (SELECT 1 FROM comments c WHERE c.id = comment_likes.comment_id)
);

-- ── PR-10: pin search_path on handle_new_user() ──────────────────────────────
-- The one SECURITY DEFINER function in the codebase missing the pin (every
-- other definer function sets it). Body unchanged from 001_initial.sql.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

-- ── PR-11: push_subscriptions(user_id) index ─────────────────────────────────
-- Every cron loop and push send filters by user_id; the table only had
-- UNIQUE(endpoint). One line, no risk, saves a sequential scan per send.
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON push_subscriptions(user_id);

-- ── Rollback reference (do NOT run unless reverting) ─────────────────────────
-- CREATE POLICY "Users can join groups" ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Anyone in group can view comments"  ON comments  FOR SELECT USING (true);
-- CREATE POLICY "Anyone in group can view reactions" ON reactions FOR SELECT USING (true);
-- CREATE POLICY "Anyone can view comment likes"      ON comment_likes FOR SELECT USING (true);
