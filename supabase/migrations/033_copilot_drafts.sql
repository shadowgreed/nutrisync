-- ── M2: Copilot message drafts ────────────────────────────────────────────────
-- A Copilot-generated check-in draft awaiting coach review. The hard rule of the
-- product lives here as data: a draft is created in 'pending' and only reaches the
-- member when the coach explicitly sends it (status -> 'sent' / 'edited_sent').
-- The AI never writes to the member directly.

-- Optional coach voice/tone, fed to the drafting prompt.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coach_style TEXT;

CREATE TABLE IF NOT EXISTS coach_message_drafts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  coach_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('nudge', 'praise', 'weekly_checkin')),
  draft_text  TEXT NOT NULL,
  basis       JSONB NOT NULL DEFAULT '{}',  -- signals/stats the draft was built from
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'sent', 'dismissed', 'edited_sent')),
  sent_text   TEXT,                          -- what the coach actually sent (may differ)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS coach_message_drafts_queue_idx
  ON coach_message_drafts (coach_id, status, created_at DESC);
-- At most one live draft per coach↔member so regeneration replaces rather than piles up.
CREATE UNIQUE INDEX IF NOT EXISTS coach_message_drafts_one_pending_idx
  ON coach_message_drafts (coach_id, member_id) WHERE status = 'pending';

ALTER TABLE coach_message_drafts ENABLE ROW LEVEL SECURITY;

-- Only the owning coach can see/create/resolve their drafts; the member never can.
DROP POLICY IF EXISTS "Coach reads own drafts" ON coach_message_drafts;
CREATE POLICY "Coach reads own drafts" ON coach_message_drafts FOR SELECT
  USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Coach creates own drafts" ON coach_message_drafts;
CREATE POLICY "Coach creates own drafts" ON coach_message_drafts FOR INSERT
  WITH CHECK (coach_id = auth.uid() AND public.is_group_coach(group_id, auth.uid()));

DROP POLICY IF EXISTS "Coach updates own drafts" ON coach_message_drafts;
CREATE POLICY "Coach updates own drafts" ON coach_message_drafts FOR UPDATE
  USING (coach_id = auth.uid());

DROP POLICY IF EXISTS "Coach deletes own drafts" ON coach_message_drafts;
CREATE POLICY "Coach deletes own drafts" ON coach_message_drafts FOR DELETE
  USING (coach_id = auth.uid());
