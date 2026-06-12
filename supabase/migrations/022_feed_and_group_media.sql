-- ── Feed sharing toggle, multi-photo, group photo ────────────────────────────

-- Per-meal control over whether it appears in the group feed (default on).
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS shared_to_feed BOOLEAN NOT NULL DEFAULT true;

-- Support multiple photos per meal. photo_url stays as the first/primary photo
-- for backward compatibility; photo_urls holds the full set.
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS photo_urls TEXT[];

-- Group cover photo, set by the founder.
ALTER TABLE groups ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Let the founder update their group (e.g. set the cover photo / rename).
DROP POLICY IF EXISTS "Founder can update group" ON groups;
CREATE POLICY "Founder can update group" ON groups FOR UPDATE
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
