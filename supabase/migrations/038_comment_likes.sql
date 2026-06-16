-- ── Comment likes ─────────────────────────────────────────────────────────────
-- Lets users like a comment on the group feed (meals and activities). One like per
-- user per comment. Visibility mirrors reactions (publicly selectable; the comment
-- itself is already group-gated), and a user manages only their own likes.

CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS comment_likes_comment_idx ON comment_likes (comment_id);

ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comment likes" ON comment_likes;
CREATE POLICY "Anyone can view comment likes" ON comment_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users add own comment likes" ON comment_likes;
CREATE POLICY "Users add own comment likes" ON comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users remove own comment likes" ON comment_likes;
CREATE POLICY "Users remove own comment likes" ON comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Live updates so like counts move in real time, consistent with the rest of the feed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'comment_likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE comment_likes;
  END IF;
END $$;
