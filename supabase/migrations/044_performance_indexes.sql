-- ════════════════════════════════════════════════════════════════════════════
-- 044 — P0 Performance Indexes
-- ════════════════════════════════════════════════════════════════════════════
-- Adds the foreign-key / access-pattern indexes the app relies on but never had.
-- Postgres does NOT auto-create indexes for foreign keys, so the dominant query
-- shape across the app — WHERE user_id = ? [AND logged_at >= ?] ORDER BY logged_at
-- — currently sequential-scans every core table (also inside RLS).
--
-- Every index below maps to a verified query (file references in the comments).
-- All are idempotent (IF NOT EXISTS) and additive (no data change, no lock on
-- reads). Safe to run now while tables are small (sub-second build). If you apply
-- this AFTER tables are already large, use the CREATE INDEX CONCURRENTLY variants
-- in docs/P0-PERFORMANCE-SPRINT.md and run them OUTSIDE a transaction instead.
--
-- Rollback: see the commented DROP block at the bottom.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. group_members(user_id) — KEYSTONE ────────────────────────────────────
-- The PK is (group_id, user_id), so lookups that lead with user_id are unindexed.
-- get_my_group_ids() and get_my_group_member_ids() (migration 004, SECURITY
-- DEFINER, used by ~10 RLS policies) both filter `WHERE user_id = auth.uid()`,
-- as does the feed membership lookup (app/feed/page.tsx:12). This is the single
-- highest-leverage index in the app.
CREATE INDEX IF NOT EXISTS group_members_user_id_idx
  ON group_members (user_id);

-- ── 2. food_logs(user_id, logged_at DESC) — most-queried table ───────────────
-- Serves: dashboard 48h + 60d streak (app/dashboard/page.tsx:33,49), trends 30d
-- (app/trends/page.tsx:27), challenges/weekly member ranges, profile, and the
-- feed `user_id IN (members) AND logged_at >= ? ORDER BY logged_at DESC LIMIT 100`
-- (app/feed/page.tsx:67).
CREATE INDEX IF NOT EXISTS food_logs_user_logged_at_idx
  ON food_logs (user_id, logged_at DESC);

-- ── 3. activity_logs(user_id, logged_at DESC) ───────────────────────────────
-- Feed (app/feed/page.tsx:78), dashboard, trends, challenges, weekly.
CREATE INDEX IF NOT EXISTS activity_logs_user_logged_at_idx
  ON activity_logs (user_id, logged_at DESC);

-- ── 4. water_logs(user_id, logged_at DESC) ──────────────────────────────────
-- Dashboard, trends, challenges, weekly.
CREATE INDEX IF NOT EXISTS water_logs_user_logged_at_idx
  ON water_logs (user_id, logged_at DESC);

-- ── 5. weight_logs(user_id, logged_at) ──────────────────────────────────────
-- Trends 90d (app/trends/page.tsx:36), weekly goal baseline, profile.
CREATE INDEX IF NOT EXISTS weight_logs_user_logged_at_idx
  ON weight_logs (user_id, logged_at);

-- ── 6. reactions(food_log_id) + reactions(activity_log_id) ──────────────────
-- Feed loads `reactions WHERE food_log_id IN (logIds)` (app/feed/page.tsx:74).
-- UNIQUE(user_id, food_log_id) leads with user_id, so it does NOT serve a
-- food_log_id lookup. activity_log_id (migration 030) is polymorphic/nullable.
CREATE INDEX IF NOT EXISTS reactions_food_log_id_idx
  ON reactions (food_log_id) WHERE food_log_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reactions_activity_log_id_idx
  ON reactions (activity_log_id) WHERE activity_log_id IS NOT NULL;

-- ── 7. comments(food_log_id) + comments(activity_log_id) + comments(parent_id)
-- Feed loads `comments WHERE food_log_id IN (logIds)` (app/feed/page.tsx:75);
-- activity comments + threaded replies (migrations 027, 030) join by
-- activity_log_id / parent_id.
CREATE INDEX IF NOT EXISTS comments_food_log_id_idx
  ON comments (food_log_id) WHERE food_log_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS comments_activity_log_id_idx
  ON comments (activity_log_id) WHERE activity_log_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS comments_parent_id_idx
  ON comments (parent_id) WHERE parent_id IS NOT NULL;

-- ── 8. milestones(user_id, created_at DESC) ─────────────────────────────────
-- Feed `user_id IN (members) AND created_at >= ? ORDER BY created_at DESC`
-- (app/feed/page.tsx:84). UNIQUE(user_id, type, key) gives user_id equality but
-- not the created_at range/sort.
CREATE INDEX IF NOT EXISTS milestones_user_created_idx
  ON milestones (user_id, created_at DESC);

-- ── 9. challenges(group_id, created_at DESC) ────────────────────────────────
-- Challenges list `WHERE group_id = ? ORDER BY created_at DESC`
-- (app/challenges/page.tsx:51).
CREATE INDEX IF NOT EXISTS challenges_group_created_idx
  ON challenges (group_id, created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════
-- ROLLBACK (run manually if needed)
-- ════════════════════════════════════════════════════════════════════════════
-- DROP INDEX IF EXISTS group_members_user_id_idx;
-- DROP INDEX IF EXISTS food_logs_user_logged_at_idx;
-- DROP INDEX IF EXISTS activity_logs_user_logged_at_idx;
-- DROP INDEX IF EXISTS water_logs_user_logged_at_idx;
-- DROP INDEX IF EXISTS weight_logs_user_logged_at_idx;
-- DROP INDEX IF EXISTS reactions_food_log_id_idx;
-- DROP INDEX IF EXISTS reactions_activity_log_id_idx;
-- DROP INDEX IF EXISTS comments_food_log_id_idx;
-- DROP INDEX IF EXISTS comments_activity_log_id_idx;
-- DROP INDEX IF EXISTS comments_parent_id_idx;
-- DROP INDEX IF EXISTS milestones_user_created_idx;
-- DROP INDEX IF EXISTS challenges_group_created_idx;
