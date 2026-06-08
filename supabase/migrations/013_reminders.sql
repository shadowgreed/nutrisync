-- ── Scheduled reminder preferences ───────────────────────────────────────────
-- A cron job (see /api/cron/reminders) reads these to decide who to push.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS water_reminders_enabled BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS meal_reminders_enabled  BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reminder_timezone       TEXT;          -- IANA tz, e.g. America/New_York
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_water_reminder_at  TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_meal_reminder_at   TIMESTAMPTZ;
