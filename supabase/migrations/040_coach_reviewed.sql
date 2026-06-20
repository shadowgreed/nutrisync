-- ── Mark Reviewed ────────────────────────────────────────────────────────────
-- Lets a coach mark a client's workspace as "reviewed" for the day. Stored on the
-- existing per-client settings row (one per coach↔member), so no new table/policy.
ALTER TABLE coach_client_settings ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
