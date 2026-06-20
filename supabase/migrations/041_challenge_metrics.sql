-- ── Challenges V2: more metric types ─────────────────────────────────────────
-- Broaden challenges beyond food logging to activity and hydration goals. Both
-- activity_logs (migration 021) and water_logs (migration 039) are already
-- readable by group members, so per-member progress can be computed live the
-- same way food-based metrics are.

ALTER TABLE challenges DROP CONSTRAINT IF EXISTS challenges_metric_check;
ALTER TABLE challenges ADD CONSTRAINT challenges_metric_check
  CHECK (metric IN ('log_days', 'protein_days', 'micro_days', 'active_days', 'water_days'));
