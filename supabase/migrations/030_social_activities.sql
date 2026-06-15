-- ── Reactions & comments on activities (not just meals) ──────────────────────
-- Make reactions/comments polymorphic: a row targets a food_log OR an
-- activity_log. food_log_id was already nullable; add activity_log_id.

ALTER TABLE reactions ADD COLUMN IF NOT EXISTS activity_log_id UUID REFERENCES activity_logs(id) ON DELETE CASCADE;
ALTER TABLE reactions ALTER COLUMN food_log_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reactions_user_activity_idx
  ON reactions (user_id, activity_log_id) WHERE activity_log_id IS NOT NULL;

ALTER TABLE comments ADD COLUMN IF NOT EXISTS activity_log_id UUID REFERENCES activity_logs(id) ON DELETE CASCADE;
ALTER TABLE comments ALTER COLUMN food_log_id DROP NOT NULL;

-- Notify the owner of whichever target (meal or activity) was reacted to.
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
    INSERT INTO notifications (user_id, actor_id, type, food_log_id, data)
    VALUES (owner, NEW.user_id, 'reaction', NEW.food_log_id, jsonb_build_object('emoji', NEW.emoji));
  END IF;
  RETURN NEW;
END; $$;

-- Comments: replies notify the parent author; activity comments notify the
-- activity owner; meal comments notify the meal owner.
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID; parent_author UUID;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_author FROM comments WHERE id = NEW.parent_id;
    IF parent_author IS NOT NULL AND parent_author <> NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, food_log_id, data)
      VALUES (parent_author, NEW.user_id, 'reply', NEW.food_log_id, jsonb_build_object('text', left(NEW.text, 80)));
    END IF;
  ELSE
    IF NEW.activity_log_id IS NOT NULL THEN
      SELECT user_id INTO owner FROM activity_logs WHERE id = NEW.activity_log_id;
    ELSE
      SELECT user_id INTO owner FROM food_logs WHERE id = NEW.food_log_id;
    END IF;
    IF owner IS NOT NULL AND owner <> NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, food_log_id, data)
      VALUES (owner, NEW.user_id, 'comment', NEW.food_log_id, jsonb_build_object('text', left(NEW.text, 80)));
    END IF;
  END IF;
  RETURN NEW;
END; $$;
