-- ── Comment replies (threaded) + reply notifications ────────────────────────

-- One level of threading: a reply points at its parent comment. Deleting a
-- comment cascades to its replies.
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES comments(id) ON DELETE CASCADE;

-- Allow the 'reply' notification type (constraint last set in migration 023).
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('reaction', 'comment', 'challenge', 'group_join', 'meal', 'weekly_report', 'cheer', 'join_request', 'reply'));

-- A reply notifies the PARENT comment's author ('reply'); a top-level comment
-- still notifies the meal owner ('comment'). Replaces migration 010's function.
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID; parent_author UUID;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_author FROM comments WHERE id = NEW.parent_id;
    IF parent_author IS NOT NULL AND parent_author <> NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, food_log_id, data)
      VALUES (parent_author, NEW.user_id, 'reply', NEW.food_log_id,
              jsonb_build_object('text', left(NEW.text, 80)));
    END IF;
  ELSE
    SELECT user_id INTO owner FROM food_logs WHERE id = NEW.food_log_id;
    IF owner IS NOT NULL AND owner <> NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, food_log_id, data)
      VALUES (owner, NEW.user_id, 'comment', NEW.food_log_id,
              jsonb_build_object('text', left(NEW.text, 80)));
    END IF;
  END IF;
  RETURN NEW;
END; $$;
