-- ── Web Push subscriptions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint     TEXT NOT NULL UNIQUE,
  subscription JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subs" ON push_subscriptions;
CREATE POLICY "Users manage own push subs" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Sender needs to read the RECIPIENT's subscriptions (who isn't the caller).
-- SECURITY DEFINER bypasses RLS, but we only return subscriptions for the caller
-- themselves or someone who shares a group with them (same rule as the feed).
CREATE OR REPLACE FUNCTION get_push_subscriptions(target UUID)
RETURNS SETOF JSONB LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT subscription FROM push_subscriptions
  WHERE user_id = target
    AND (target = auth.uid() OR target IN (SELECT get_my_group_member_ids()));
$$;
