# Coach + Copilot — Technical Spec

> **Positioning:** NutriSync is a *coach-led accountability community*. A real human —
> a trainer, a nutritionist, or just the fit friend/parent who already informally
> coaches their crew — carries a small group through the feed. The AI's job is **not**
> to coach the member. It's to make the human coach superhuman: kill the admin so one
> coach can carry a fuller group and spend their energy on the relationship.
>
> **The hard rule:** the Copilot *drafts*, the coach *edits and sends*. AI text is
> never auto-posted in the coach's voice. (Industry data is blunt that robotic,
> auto-generated check-ins kill retention — the relationship is the product.)

---

## 1. Goals & non-goals

**Goals**
- Give group founders a **Coach role** with a dashboard over their members' progress.
- A **Copilot** that surfaces *who needs attention* and *drafts* a personalized,
  on-brand check-in message the coach can edit and send in one tap.
- A weekly **client digest** per member (reuses the existing weekly-report engine).
- Monetization wedge: the **coach pays**; members stay free.

**Non-goals (v1)**
- No AI that messages members directly or autonomously.
- No workout-program builder (that's the Trainerize lane; stay lightweight).
- No billing/payments implementation here (gating hooks only — see §9).

---

## 2. Design principles

1. **Human-in-the-loop, always.** Every Copilot output is a *draft* in a review queue.
   Nothing reaches a member without an explicit coach send.
2. **Reuse, don't reinvent.** Per-member stats come from the existing deterministic
   engine (`buildWeeklyReport` in `lib/weekly.ts`, `weeklyCoaching` in `lib/coaching.ts`).
   The LLM only turns already-computed facts into a warm human sentence — it does not
   compute nutrition or invent numbers.
3. **Consent + privacy.** A member's data is already visible to group members via RLS
   (migration `001_initial.sql`). The Coach view adds *aggregation*, not new exposure.
   A member's `privacy_mode = 'dark'` opts them out of the coach dashboard too (§8).
4. **Gentle by design.** Attention signals and draft tone celebrate consistency over
   perfection — no guilt framing (this is a deliberate differentiator vs. the category).

---

## 3. Data model changes

New migration: `supabase/migrations/031_coach_roles.sql` and `032_copilot.sql`.

### 3.1 Coach role on membership

Today the founder is implied by `groups.created_by`. Generalize to an explicit role so a
group can have a coach who isn't necessarily the only privileged user.

```sql
-- 031_coach_roles.sql
ALTER TABLE group_members
  ADD COLUMN role TEXT NOT NULL DEFAULT 'member'
  CHECK (role IN ('coach', 'member'));

-- Backfill: the founder of each group becomes its coach.
UPDATE group_members gm
SET role = 'coach'
FROM groups g
WHERE gm.group_id = g.id AND gm.user_id = g.created_by;

-- A per-group seat tier controls the member cap (monetization hook, §9).
ALTER TABLE groups
  ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'
  CHECK (plan IN ('free', 'coach')),
  ADD COLUMN member_cap INT NOT NULL DEFAULT 6;
```

The hard-coded `>= 6` cap in `resolve_join_request` (migration `023`) becomes
`>= (SELECT member_cap FROM groups WHERE id = r_group)`. `free` stays 6; `coach` unlocks
e.g. 30. New helper `is_group_coach(group_id, user_id)` (SECURITY DEFINER) used by RLS.

### 3.2 Copilot tables

```sql
-- 032_copilot.sql

-- A point-in-time snapshot of one member's status, produced by the digest job.
-- Drives the dashboard "who needs attention" list without recomputing on every view.
CREATE TABLE coach_client_status (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attention     TEXT NOT NULL CHECK (attention IN ('on_track', 'watch', 'needs_attention')),
  signals       JSONB NOT NULL DEFAULT '[]',   -- structured reasons (see §5)
  stats         JSONB NOT NULL DEFAULT '{}',   -- the WeeklyReport snapshot
  UNIQUE (group_id, member_id)
);

-- A Copilot-generated message draft awaiting coach review.
CREATE TABLE coach_message_drafts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  coach_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('nudge', 'praise', 'weekly_checkin')),
  draft_text    TEXT NOT NULL,
  basis         JSONB NOT NULL DEFAULT '{}',   -- signals/stats the draft was built from
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'sent', 'dismissed', 'edited_sent')),
  sent_text     TEXT,                          -- what the coach actually sent (may differ)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

-- Optional private coach notes per client (not visible to the member).
CREATE TABLE coach_client_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  coach_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (char_length(body) <= 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

RLS: coach-only read/write keyed on `is_group_coach(group_id, auth.uid())`; notes are
never selectable by the member. A *sent* draft becomes a normal `comment` on the
member's most recent log **or** a new `coach_message` notification (§7) — so it flows
through the existing feed/notification rails the member already knows.

### 3.3 Notification types

Extend the `notifications_type_check` constraint (last set in `023`) to add
`'coach_message'` and `'coach_nudge'`. Add the matching `NotificationType` union members
in `types/index.ts:160`.

---

## 4. Coach dashboard

New route group `app/coach/` (gated to users who are a `coach` in ≥1 group).

### 4.1 Overview — `/coach`
- **Roster triage**, sorted by `attention`: `needs_attention` → `watch` → `on_track`.
  Each row: avatar, name, last-logged relative time, current streak, this-week calorie
  delta + nutrients-on-track, and a one-line signal summary ("3 days since last log").
- **Draft queue badge**: count of `pending` rows in `coach_message_drafts`.
- Group switcher if the coach runs more than one group.

### 4.2 Client drill-down — `/coach/[memberId]`
- The member's `WeeklyReport` rendered with the existing dashboard components (calorie
  trend, macro bars, the 10-nutrient panel) — read-only.
- **Copilot panel**: the current draft(s) for this member with **Edit / Send / Dismiss**.
  Editing flips the eventual status to `edited_sent` and stores `sent_text`.
- Private **coach notes** editor (`coach_client_notes`).
- A "Regenerate draft" action (rate-limited, §8) for a fresh tone/angle.

### 4.3 Draft queue — `/coach/queue`
- All `pending` drafts across clients in a single review stream — the "do my check-ins
  in 5 minutes" surface. Each card shows the basis ("why this") so the coach trusts it.

UI reuses existing components (feed cards, nutrient panel, notification patterns); no new
design system needed.

---

## 5. Copilot engine — `lib/copilot.ts`

Pure, testable, **no AI in the signal layer**. Input: a member's recent logs + profile.
Output: an attention level + structured signals. The LLM is called separately (§6) only
to phrase a draft from these facts.

```ts
export type AttentionLevel = 'on_track' | 'watch' | 'needs_attention'

export interface ClientSignal {
  code: 'logging_gap' | 'streak_break' | 'calorie_drift_over' | 'calorie_drift_under'
      | 'nutrient_gap' | 'strong_week' | 'goal_weight_hit'
  severity: 'info' | 'warn'
  label: string                 // human-readable, e.g. "3 days since last log"
  data: Record<string, unknown> // structured, for the draft prompt
}

export interface ClientStatus {
  attention: AttentionLevel
  signals: ClientSignal[]
  report: WeeklyReport          // from buildWeeklyReport()
}

export function assessClient(opts: {
  foods: WeeklyFoodRow[]; activities: WeeklyActivityRow[];
  calorieTarget: number; lastLoggedAt: string | null; streak: number; now?: Date
}): ClientStatus
```

**Signal rules (v1, deterministic):**
- `logging_gap` (warn) — no food log in ≥ 2 days → strongest driver of `needs_attention`.
- `streak_break` (warn) — streak dropped from ≥ 3 to 0 since last assessment.
- `calorie_drift_*` (warn) — 7-day avg off target by > 20% (reuses `buildWeeklyReport`).
- `nutrient_gap` (info) — top miss from `weeklyCoaching()` (already in `lib/coaching.ts`).
- `strong_week` / `goal_weight_hit` (info) — drive **praise** drafts, not just nudges.

`attention = needs_attention` if any `warn` signal; `watch` if only `info` warns exist
alongside a soft logging dip; else `on_track`. Praise-worthy signals always generate a
`praise` draft so the coach has something positive to send, not only fixes.

---

## 6. AI integration — `lib/copilot-ai.ts`

Adds one function to the existing Anthropic layer, mirroring `lib/anthropic.ts` style
(shared `client`, `parseJsonLoose`, whitelist parsing, graceful empty fallback).

```ts
export interface DraftRequest {
  coachStyle?: string          // optional coach-set voice, e.g. "warm, casual, emoji-light"
  memberFirstName: string
  kind: 'nudge' | 'praise' | 'weekly_checkin'
  signals: ClientSignal[]      // the facts — the model must not invent beyond these
  report: WeeklyReport
}

export async function draftCheckin(req: DraftRequest): Promise<{ text: string }>
```

**Model:** `claude-sonnet-4-6` (the repo's existing "smart" model; volume is low — one
call per pending draft, not per log — so quality over cost). Falls back to a deterministic
template string if the call fails or returns no text, so the queue is never empty-broken.

**Prompt contract (system + user):**
- *Role:* "You are a drafting assistant for a fitness/nutrition coach named {coach}. You
  write a short check-in message the coach will review and send **in their own voice**."
- *Grounding:* pass `signals` + `report` as JSON. **Rule:** "Only reference facts present
  in the data. Never invent numbers, foods, or workouts. If data is thin, keep it brief."
- *Tone:* honor `coachStyle`; default warm, specific, non-judgmental; celebrate effort;
  ≤ 60 words; no medical claims; first name only.
- *Output:* `{"text": "..."}` — parsed with the existing `parseJsonLoose`.

**Why this is safe:** the model never sees raw PII beyond a first name + already-computed
aggregates, never writes to the DB directly, and its output lands in a *review queue*, not
the member's inbox.

---

## 7. API routes & cron

| Route | Method | Purpose |
|---|---|---|
| `app/api/coach/digest/route.ts` | POST | Recompute `coach_client_status` + generate `pending` drafts for a coach's group(s). Coach-triggered "refresh". |
| `app/api/coach/draft/route.ts` | POST | Regenerate a single draft (rate-limited). |
| `app/api/coach/send/route.ts` | POST | Send/edit/dismiss a draft → writes `comment` + `coach_message` notification + best-effort web push to the member. |
| `app/api/cron/coach-digest/route.ts` | GET | Daily batch: rebuild statuses + drafts for all coach groups. |

The cron route is a near-clone of `app/api/cron/weekly-report/route.ts`: `CRON_SECRET`
bearer check, `createAdminClient()`, iterate coach groups, and reuse
`sendPushToSubscriptions` (from `lib/push.ts`) to ping the **coach** ("5 clients need a
check-in today"). Schedule via the same pg_cron mechanism as reminders/weekly-report.

The **send** path reuses existing rails: inserting a `comment` fires the existing
`notify_on_comment` trigger, and the member sees it as a normal coach reply in the feed —
no new client surface required for v1.

---

## 8. Permissions, privacy, rate limits

- **RLS:** all coach tables gated on `is_group_coach(group_id, auth.uid())`. Coach notes
  never selectable by the member.
- **Opt-out:** a member with `privacy_mode = 'dark'` is excluded from
  `coach_client_status` and cannot be drafted about — mirror the feed's dark-mode rule.
  Add a `coach_visible BOOLEAN DEFAULT TRUE` on `profiles` for an explicit per-coach-feature
  opt-out, surfaced in settings.
- **Rate limits** (reuse `lib/ratelimit.ts`): draft generation 60/hour per coach;
  regenerate 10/hour per member; send 200/day per coach. Digest cron is server-side, no
  per-user AI fan-out beyond pending-draft generation.
- **Disclosure:** members see a one-time notice that their group has a coach who can view
  their progress summaries — consent baked into joining a `plan = 'coach'` group.

---

## 9. Monetization hook (gating only)

- `groups.plan = 'coach'` unlocks: larger `member_cap`, the `/coach` dashboard, Copilot
  drafting, and the daily digest.
- `free` groups keep cap 6 and **no** Copilot (founder still sees a basic roster).
- Gate checks live in a single `assertCoachPlan(groupId)` helper used by all coach API
  routes, so wiring real billing later (Stripe) is one integration point, not many.
- Pricing model deferred — the architecture just needs the boolean today.

---

## 10. Phasing

1. **M1 — Coach role + dashboard (no AI).** Migrations `031`, roster triage, drill-down
   reusing `buildWeeklyReport`, private notes. Ships standalone value.
2. **M2 — Copilot drafts.** Migration `032`, `lib/copilot.ts` signals, `lib/copilot-ai.ts`,
   draft queue, send-via-comment. The headline feature.
3. **M3 — Daily digest cron + coach push**, regenerate, coach style settings.
4. **M4 — Plan gating + larger caps** (monetization switch on).

---

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| AI draft sounds robotic / hurts the relationship | Drafts only; coach edits & sends; tone constraints; coach style setting. |
| Member feels surveilled | Explicit consent on joining a coach group; dark-mode opt-out; coach sees aggregates, not raw exposure beyond existing RLS. |
| Guilt/disordered-eating framing | Gentle-by-design tone rules; praise drafts are first-class, not just fixes. |
| LLM invents numbers | Strict grounding prompt; deterministic stats computed *before* the call; template fallback. |
| Cost blowup | Low call volume (per-draft, not per-log); rate limits; `sonnet-4-6` not a frontier tier per draft. |

---

## 12. Touch-point summary (files)

- `supabase/migrations/031_coach_roles.sql`, `032_copilot.sql` — schema, RLS, helpers.
- `types/index.ts` — `role`, coach entities, new `NotificationType`s.
- `lib/copilot.ts` — deterministic signal/attention engine (reuses `weekly.ts`, `coaching.ts`).
- `lib/copilot-ai.ts` — `draftCheckin()` on the existing Anthropic client.
- `app/coach/*` — dashboard, drill-down, queue.
- `app/api/coach/{digest,draft,send}/route.ts`, `app/api/cron/coach-digest/route.ts`.
- Reuses as-is: `lib/weekly.ts`, `lib/coaching.ts`, `lib/push.ts`, `lib/ratelimit.ts`,
  `lib/supabase/admin.ts`, the `notify_on_comment` trigger.
</content>
</invoke>
