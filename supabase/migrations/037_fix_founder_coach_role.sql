-- ── Fix: group founders must have the coach role ─────────────────────────────
-- The group-creation flow inserts the founder's membership without a role, so it
-- defaulted to 'member'. Migration 031 only backfilled groups that existed at the
-- time, so any group created since then has its founder as a plain member — and the
-- coach dashboard (which filters role = 'coach') shows an empty roster.
--
-- Make the database authoritative about the role instead of trusting client code:
-- a BEFORE INSERT trigger forces 'coach' for the group's creator and 'member' for
-- everyone else. This fixes all future groups regardless of insert path (direct
-- insert or the join RPCs) and prevents a non-founder from inserting themselves as
-- a coach. SECURITY DEFINER so the groups lookup bypasses RLS (the founder isn't a
-- member yet at the moment of their own insert).

CREATE OR REPLACE FUNCTION set_group_member_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM groups WHERE id = NEW.group_id AND created_by = NEW.user_id) THEN
    NEW.role := 'coach';
  ELSE
    NEW.role := 'member';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_set_group_member_role ON group_members;
CREATE TRIGGER trg_set_group_member_role
  BEFORE INSERT ON group_members
  FOR EACH ROW EXECUTE FUNCTION set_group_member_role();

-- One-time repair: promote any existing founder still stuck as a member.
UPDATE group_members gm
SET    role = 'coach'
FROM   groups g
WHERE  gm.group_id = g.id
  AND  gm.user_id  = g.created_by
  AND  gm.role <> 'coach';
