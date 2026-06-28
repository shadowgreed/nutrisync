-- 049_water_goal_milestone.sql
-- Allow a 'water_goal' milestone so hitting the daily water target posts to the
-- group feed. Reuses the existing milestones table (realtime + RLS already grant
-- group visibility) — no new table, trigger, or feed plumbing required.
-- Idempotent; safe to re-run.

ALTER TABLE milestones DROP CONSTRAINT IF EXISTS milestones_type_check;
ALTER TABLE milestones ADD  CONSTRAINT milestones_type_check
  CHECK (type IN ('streak', 'goal_weight', 'water_goal'));
