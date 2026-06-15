-- ── Shared milestone moments ─────────────────────────────────────────────────
-- Celebratory cards that auto-post to the group feed when someone hits a streak
-- or goal-weight milestone. One row per milestone (deduped), inserted by the
-- app after logging.

CREATE TABLE IF NOT EXISTS milestones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('streak', 'goal_weight')),
  key        TEXT NOT NULL,             -- dedup, e.g. 'streak-7' or 'goal-50'
  data       JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, type, key)
);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View self and group milestones" ON milestones;
CREATE POLICY "View self and group milestones" ON milestones FOR SELECT
  USING (user_id = auth.uid() OR user_id IN (SELECT public.get_my_group_member_ids()));

DROP POLICY IF EXISTS "Insert own milestones" ON milestones;
CREATE POLICY "Insert own milestones" ON milestones FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Realtime so milestone cards appear live in the feed (guarded re-run).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'milestones'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE milestones;
  END IF;
END $$;
