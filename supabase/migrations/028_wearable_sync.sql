-- ── Wearable sync (Apple Watch via Shortcuts webhook, etc.) ──────────────────

-- Per-user secret that an Apple Shortcuts automation includes when POSTing
-- Health data to /api/sync/health. Rotatable.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sync_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_sync_key_idx ON profiles (sync_key) WHERE sync_key IS NOT NULL;

-- Tag activity rows with where they came from, and a stable external id so
-- re-running the sync upserts (updates) instead of creating duplicates.
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Dedup key. external_id is NULL for manual logs; Postgres treats NULLs as
-- distinct, so manual rows never collide while synced rows dedup per source.
CREATE UNIQUE INDEX IF NOT EXISTS activity_logs_dedup_idx
  ON activity_logs (user_id, source, external_id);
