-- ── Weekly report notification ───────────────────────────────────────────────
-- Sunday-morning "your week in review" push + in-app notification.

-- Allow the new notification type (constraint last set in migration 017).
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('reaction', 'comment', 'challenge', 'group_join', 'meal', 'weekly_report'));

-- Dedupe column so the weekly cron sends at most once per user per week.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_weekly_report_at TIMESTAMPTZ;
