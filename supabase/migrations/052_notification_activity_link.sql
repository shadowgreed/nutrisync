-- 052_notification_activity_link.sql
-- Bug: comments/reactions on an activity_log (a workout post) generate a
-- notification with food_log_id = NULL (activities were never linked), so
-- there is no way to deep-link the recipient back to the specific post. The
-- notification preview shows the comment text, but tapping it lands on the
-- generic /feed with no scroll/highlight target — the comment reads as
-- "missing" even though it exists. Add the missing column and populate it
-- from both trigger functions, mirroring the food_log_id path exactly.
-- Idempotent; safe to re-run.

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS activity_log_id UUID REFERENCES activity_logs(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION notify_on_reaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID;
BEGIN
  IF NEW.activity_log_id IS NOT NULL THEN
    SELECT user_id INTO owner FROM activity_logs WHERE id = NEW.activity_log_id;
  ELSE
    SELECT user_id INTO owner FROM food_logs WHERE id = NEW.food_log_id;
  END IF;
  IF owner IS NOT NULL AND owner <> NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, food_log_id, activity_log_id, data)
    VALUES (owner, NEW.user_id, 'reaction', NEW.food_log_id, NEW.activity_log_id, jsonb_build_object('emoji', NEW.emoji));
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID; parent_author UUID;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_author FROM comments WHERE id = NEW.parent_id;
    IF parent_author IS NOT NULL AND parent_author <> NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, food_log_id, activity_log_id, data)
      VALUES (parent_author, NEW.user_id, 'reply', NEW.food_log_id, NEW.activity_log_id, jsonb_build_object('text', left(NEW.text, 80)));
    END IF;
  ELSE
    IF NEW.activity_log_id IS NOT NULL THEN
      SELECT user_id INTO owner FROM activity_logs WHERE id = NEW.activity_log_id;
    ELSE
      SELECT user_id INTO owner FROM food_logs WHERE id = NEW.food_log_id;
    END IF;
    IF owner IS NOT NULL AND owner <> NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, food_log_id, activity_log_id, data)
      VALUES (owner, NEW.user_id, 'comment', NEW.food_log_id, NEW.activity_log_id, jsonb_build_object('text', left(NEW.text, 80)));
    END IF;
  END IF;
  RETURN NEW;
END; $$;
