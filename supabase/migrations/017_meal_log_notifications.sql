-- ── Notify group members when someone logs a meal ───────────────────────────
-- Adds a 'meal' notification type and a trigger that fans a new food_log out to
-- every co-member of the author's group(s). Mirrors notify_on_challenge /
-- notify_on_group_join. (Reactions & comments already notify the post owner.)

-- 1. Allow the new type. The inline CHECK from migration 010 is named
--    notifications_type_check by Postgres convention.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('reaction', 'comment', 'challenge', 'group_join', 'meal'));

-- 2. Trigger: new food_log -> notify the author's group co-members (not the author).
CREATE OR REPLACE FUNCTION notify_on_meal_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications (user_id, actor_id, type, food_log_id, data)
  SELECT DISTINCT gm2.user_id, NEW.user_id, 'meal', NEW.id,
         jsonb_build_object('meal_type', NEW.meal_type)
  FROM   group_members gm1
  JOIN   group_members gm2 ON gm2.group_id = gm1.group_id
  WHERE  gm1.user_id = NEW.user_id AND gm2.user_id <> NEW.user_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_meal_log ON food_logs;
CREATE TRIGGER trg_notify_meal_log AFTER INSERT ON food_logs
  FOR EACH ROW EXECUTE FUNCTION notify_on_meal_log();
