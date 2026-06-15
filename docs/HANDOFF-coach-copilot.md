# Coach + Copilot — Engineering Handoff

A build guide for the Coach + Copilot feature. Pairs with the design doc
[`coach-copilot-spec.md`](./coach-copilot-spec.md). Everything described here is
implemented on branch `claude/fitness-market-research-98tupj` (PR #1) **except**
M3/M4, which are scoped but not built.

---

## TL;DR for engineers

NutriSync becomes a **coach-led accountability community**: a real human coach runs a
small group through the feed, and an AI **Copilot** removes the admin so one coach can
carry more clients. The Copilot **drafts** check-ins; the coach **edits and sends**. AI
never messages a member on its own — this rule is enforced in the data model and routes,
not just the UI. Keep it that way.

Status:
- **M1 — Coach role + dashboard:** ✅ built
- **M2 — Copilot drafts (draft → review → send):** ✅ built
- **M3 — daily digest cron + coach push + coach-style settings:** ⬜ scoped, not built
- **M4 — plan gating + larger member caps (monetization):** ⬜ scoped, not built

---

## Apply in this order

### 1. Database migrations (Supabase / Postgres)
Run in numeric order; they're forward-only (no down scripts), matching the existing
`supabase/migrations/` convention.

| File | Adds |
| --- | --- |
| `supabase/migrations/031_coach_roles.sql` | `group_members.role` (coach/member, founder backfilled), `groups.plan` + `member_cap`, `profiles.coach_visible`, `is_group_coach()` helper, per-group cap in `join_group_by_code` + `resolve_join_request`, `coach_message`/`coach_nudge` notification types |
| `supabase/migrations/032_coach_notes.sql` | `coach_client_notes` table + coach-only RLS |
| `supabase/migrations/033_copilot_drafts.sql` | `coach_message_drafts` table (one pending per coach↔member) + RLS, `profiles.coach_style` |

> RLS note: cross-user writes (sending a member a notification) go through the **admin
> client**, mirroring `app/api/cheer/route.ts`. The coach's own reads/writes go through
> the auth-scoped client so RLS enforces access.

### 2. Environment variables
Already used by the app; the Copilot reuses them:
- `ANTHROPIC_API_KEY` — required for live draft generation. Without it, `draftCheckin()`
  falls back to deterministic templates (the queue still works).
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  (admin client, used by the send path).
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — web push (best-effort).

### 3. Build
`npm install && npm run build`. Verified clean: `tsc --noEmit` passes and `next build`
compiles all coach routes. (Heads up: this is a modified Next.js 16 — read
`node_modules/next/dist/docs` before changing routes; `params` is a `Promise`.)

---

## File inventory

**Design**
- `docs/coach-copilot-spec.md` — full design + rationale + data model + phasing.

**Core logic (pure, testable)**
- `lib/copilot.ts` — `assessClient()`: deterministic attention level + signals from a
  member's week. **No AI here.** Reuses `lib/weekly.ts` + `lib/coaching.ts`.
- `lib/copilot-ai.ts` — `draftCheckin()` (the only AI) + `chooseKind()` + template fallback.
- `lib/coach-server.ts` — shared coach↔member verification + assessment pipeline.

**API routes**
- `app/api/coach/note/route.ts` — POST/DELETE private coach notes.
- `app/api/coach/draft/route.ts` — POST: generate/regenerate a pending draft (rate-limited).
- `app/api/coach/send/route.ts` — POST: `send` (notification + push) or `dismiss`. The only
  path a draft reaches a member.

**Pages / UI**
- `app/coach/page.tsx` + `CoachClient.tsx` — roster triage (needs-attention first) + queue badge.
- `app/coach/[memberId]/page.tsx` + `CoachMemberClient.tsx` — drill-down: week stats, signals,
  Copilot draft panel, private notes.
- `app/coach/queue/page.tsx` + `QueueClient.tsx` — "do all check-ins in 5 minutes" review queue.

**Touched existing files**
- `types/index.ts` — `GroupRole`/`GroupPlan`, `role`/`plan`/`member_cap`, `coach_visible`,
  new `NotificationType`s.
- `app/notifications/NotificationsClient.tsx` — render `coach_message`/`coach_nudge`.
- `app/profile/ProfileClient.tsx` — "Coach dashboard" entry point for the founder.

---

## Invariants to preserve

1. **Human-in-the-loop.** A draft is created `pending` and only delivered by an explicit
   coach `send`. Never auto-send; never post AI text as the coach without review.
2. **No invented facts.** The LLM only phrases pre-computed numbers from `lib/copilot.ts`.
   Don't move nutrition math into the prompt.
3. **Privacy/consent.** `privacy_mode = 'dark'` or `coach_visible = false` excludes a member
   from the dashboard, drill-down, and drafting. Honor it everywhere new.
4. **Gentle tone.** Drafts celebrate effort, never shame — a deliberate differentiator.

---

## Suggested next steps (M3/M4)

- **M3:** clone `app/api/cron/weekly-report/route.ts` into `app/api/cron/coach-digest`
  to pre-build drafts daily + push the coach a "N clients need a check-in" nudge; add a
  `coach_style` settings field on the profile-edit screen.
- **M4:** flip `groups.plan` to gate the dashboard + raise `member_cap`; add a single
  `assertCoachPlan(groupId)` helper as the one place to wire Stripe later.
</content>
