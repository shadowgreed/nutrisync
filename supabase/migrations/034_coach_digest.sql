-- ── M3: coach daily digest throttle ──────────────────────────────────────────
-- The coach-digest cron runs hourly and fires once per coach at their local
-- morning. This column throttles it to once per day per coach (same shape as
-- profiles.last_weekly_report_at used by the weekly-report cron).

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_coach_digest_at TIMESTAMPTZ;
