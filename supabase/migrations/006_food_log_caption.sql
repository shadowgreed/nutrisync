-- User-written caption attached to a meal log (replaces AI auto-description in feed)
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS caption TEXT;
