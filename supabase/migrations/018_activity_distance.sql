-- ── Distance/steps-based activities ──────────────────────────────────────────
-- Walking, cycling and hiking are logged by distance (and steps on foot) rather
-- than duration, so duration becomes optional and we store the new inputs.

ALTER TABLE activity_logs ALTER COLUMN duration_minutes DROP NOT NULL;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS distance_km NUMERIC(6,2);
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS steps       INT;
