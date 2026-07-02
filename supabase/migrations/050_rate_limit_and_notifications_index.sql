-- 050_rate_limit_and_notifications_index.sql
-- Road-to-90 sprint: distributed rate limiting (engineering audit H2) and the
-- notifications timeline index (re-audit N3). Idempotent; safe to re-run.

-- ── H2: shared rate-limit counter ────────────────────────────────────────────
-- lib/ratelimit.ts#rateLimitDurable calls check_rate_limit() so limits hold
-- across all serverless instances (the in-memory Map is per-instance). The
-- table is only ever touched through the SECURITY DEFINER function — no direct
-- client access.
CREATE TABLE IF NOT EXISTS rate_limit_hits (
  key TEXT        NOT NULL,
  at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS rate_limit_hits_key_at_idx ON rate_limit_hits(key, at);

ALTER TABLE rate_limit_hits ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: with RLS enabled and zero policies, clients can't
-- read or write rows directly; only the definer function below can.

CREATE OR REPLACE FUNCTION check_rate_limit(p_key TEXT, p_limit INT, p_window_ms BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  hits INT;
BEGIN
  -- Prune this key's expired hits (keeps the table self-cleaning per key).
  DELETE FROM rate_limit_hits
  WHERE key = p_key AND at < NOW() - make_interval(secs => p_window_ms / 1000.0);

  SELECT COUNT(*) INTO hits FROM rate_limit_hits WHERE key = p_key;
  IF hits >= p_limit THEN
    RETURN FALSE;
  END IF;

  INSERT INTO rate_limit_hits(key) VALUES (p_key);
  RETURN TRUE;
END;
$$;

REVOKE ALL ON rate_limit_hits FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, INT, BIGINT) TO authenticated;

-- ── N3: notifications timeline index ─────────────────────────────────────────
-- The existing notifications_user_unread_idx is (user_id, read, created_at) —
-- great for the unread badge, but a full-history timeline read
-- (WHERE user_id = ? ORDER BY created_at DESC) can't use it optimally.
CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications(user_id, created_at DESC);
