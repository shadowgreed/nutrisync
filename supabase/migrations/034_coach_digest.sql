-- ── M3: Coach daily digest ────────────────────────────────────────────────────
-- The digest cron pre-builds Copilot drafts for a coach's flagged clients once a
-- day and pushes the coach a "N clients need a check-in" nudge. This column lets
-- the cron fire at most once per ~day per coach (mirrors profiles.last_weekly_report_at).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_coach_digest_at TIMESTAMPTZ;
