-- ── In-app notifications ─────────────────────────────────────────────────────
-- Rows are created by SECURITY DEFINER triggers (which bypass RLS) whenever a
-- social event happens, so the recipient gets a notification no matter how the
-- action was performed (API route or direct client insert).

CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- recipient
  actor_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,          -- who triggered it
  type          TEXT NOT NULL CHECK (type IN ('reaction', 'comment', 'challenge', 'group_join')),
  food_log_id   UUID REFERENCES food_logs(id) ON DELETE CASCADE,
  challenge_id  UUID REFERENCES challenges(id) ON DELETE CASCADE,
  data          JSONB NOT NULL DEFAULT '{}',
  read          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications (user_id, read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Recipients can read / update (mark read) / delete their own notifications.
DROP POLICY IF EXISTS "Users manage own notifications" ON notifications;
CREATE POLICY "Users manage own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Trigger: reaction → notify the food log owner ────────────────────────────
CREATE OR REPLACE FUNCTION notify_on_reaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID;
BEGIN
  SELECT user_id INTO owner FROM food_logs WHERE id = NEW.food_log_id;
  IF owner IS NOT NULL AND owner <> NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, food_log_id, data)
    VALUES (owner, NEW.user_id, 'reaction', NEW.food_log_id, jsonb_build_object('emoji', NEW.emoji));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_reaction ON reactions;
CREATE TRIGGER trg_notify_reaction AFTER INSERT ON reactions
  FOR EACH ROW EXECUTE FUNCTION notify_on_reaction();

-- ── Trigger: comment → notify the food log owner ─────────────────────────────
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID;
BEGIN
  SELECT user_id INTO owner FROM food_logs WHERE id = NEW.food_log_id;
  IF owner IS NOT NULL AND owner <> NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, food_log_id, data)
    VALUES (owner, NEW.user_id, 'comment', NEW.food_log_id,
            jsonb_build_object('text', left(NEW.text, 80)));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_comment ON comments;
CREATE TRIGGER trg_notify_comment AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

-- ── Trigger: new challenge → notify every group member except the creator ────
CREATE OR REPLACE FUNCTION notify_on_challenge()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications (user_id, actor_id, type, challenge_id, data)
  SELECT gm.user_id, NEW.created_by, 'challenge', NEW.id, jsonb_build_object('title', NEW.title)
  FROM   group_members gm
  WHERE  gm.group_id = NEW.group_id AND gm.user_id <> NEW.created_by;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_challenge ON challenges;
CREATE TRIGGER trg_notify_challenge AFTER INSERT ON challenges
  FOR EACH ROW EXECUTE FUNCTION notify_on_challenge();

-- ── Trigger: someone joins a group → notify existing members ─────────────────
CREATE OR REPLACE FUNCTION notify_on_group_join()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications (user_id, actor_id, type, data)
  SELECT gm.user_id, NEW.user_id, 'group_join', '{}'::jsonb
  FROM   group_members gm
  WHERE  gm.group_id = NEW.group_id AND gm.user_id <> NEW.user_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_group_join ON group_members;
CREATE TRIGGER trg_notify_group_join AFTER INSERT ON group_members
  FOR EACH ROW EXECUTE FUNCTION notify_on_group_join();

-- Realtime so the bell badge updates live (guarded so re-runs don't error)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
