-- ── M4: plan-driven member cap ────────────────────────────────────────────────
-- groups.plan + groups.member_cap were added in 031 (default 'free' / 6). This
-- keeps the cap in sync with the plan so they can't drift: the 'coach' plan unlocks
-- a larger roster, 'free' is pinned at 6. Upgrading a group is a single
-- `UPDATE groups SET plan = 'coach'` — the cap follows automatically. (Self-serve
-- billing / Stripe is the remaining M4 piece; until then plan is flipped by an
-- admin via the service role.)

CREATE OR REPLACE FUNCTION sync_group_member_cap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.plan = 'coach' THEN
    -- Don't shrink a cap an admin set higher by hand.
    NEW.member_cap := GREATEST(COALESCE(NEW.member_cap, 0), 30);
  ELSE
    NEW.member_cap := 6;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_group_member_cap ON groups;
CREATE TRIGGER trg_sync_group_member_cap
  BEFORE INSERT OR UPDATE OF plan ON groups
  FOR EACH ROW EXECUTE FUNCTION sync_group_member_cap();

-- Align any existing rows (no 'coach' groups exist yet, but keep it correct).
UPDATE groups SET member_cap = 30 WHERE plan = 'coach' AND member_cap < 30;
UPDATE groups SET member_cap = 6  WHERE plan = 'free'  AND member_cap <> 6;
