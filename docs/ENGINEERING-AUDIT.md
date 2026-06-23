# NutriSync — Full Engineering Audit

**Date:** 2026-06-21
**Auditors (roles):** Staff Software Engineer · Mobile Architect · Security Engineer · QA Lead · Product Analyst
**Scope:** Next.js 16 / React 19 PWA, Supabase (Postgres + RLS + Storage). 29 API routes, 43 migrations, 21 components, ~18.6k LOC. Audited on `main`.
**Method:** Four parallel specialist sweeps (database, security/API, architecture/code-quality, UI/UX/analytics/product) plus direct verification of the highest-impact claims.

> **Corrections applied after verification** (do not treat as findings):
> - "Coach can draft but not send messages" — **false.** `/api/coach/send` and `/api/coach/message` both deliver coach messages (notification + push).
> - "Barcode scanning not implemented / broken" — **unconfirmed.** `@zxing/browser` + `@zxing/library` are installed and `/api/barcode` exists. Marked "verify," not a confirmed dead-end.

---

## 1. Executive Summary

NutriSync is a **well-architected MVP** with strong fundamentals: a clean type system, disciplined RLS using `SECURITY DEFINER` helpers to avoid recursion, proper service-role isolation, ON DELETE CASCADE integrity, a polished dark-mode UI, and real-time social loops. Security is above average for an app this size.

It is **not yet ready to scale.** Three systemic gaps dominate:
1. **No database indexes on any core table** (verified).
2. **Zero automated tests** (verified).
3. **No analytics on any core user action** (signup, login, meal/water/activity logging, group/challenge events).

Layered on top: an **inconsistent UTC-vs-local "day" definition** (correctness bug class), in-memory rate limiting that doesn't hold on serverless, and several oversized "god" components.

**Overall score: 71 / 100.** **Recommendation: 🟡 Needs remediation** before scaling (not high-risk — the security base is sound).

---

## 2. Critical Issues (scale blockers)

| # | Area | Issue | Evidence |
|---|------|-------|----------|
| C1 | Performance / DB | **No indexes on core tables.** `food_logs`, `activity_logs`, `water_logs`, `weight_logs`, `group_members`, `reactions`, `comments`, `milestones` have only PK indexes. Postgres does **not** auto-index foreign keys. Every `.eq('user_id',x).gte('logged_at',…)` (the dominant pattern, also inside RLS policies) is a full table scan. **Verified:** only 7 `CREATE INDEX` statements exist across all migrations, none on these tables. | `supabase/migrations/*` |
| C2 | Reliability | **Zero automated tests.** No vitest/jest/playwright; no `"test"` script. Pure, testable logic (streak, challenges, weekly-review, calorie math) has no coverage. **Verified.** | `package.json` |
| C3 | Analytics | **No tracking on core actions.** Only Help Center + Weekly Review emit events. Signup, login, meal/activity/water/weight logging, group create/join, challenge create/complete, sharing, cheers are **untracked** — activation, retention, DAU/MAU, and funnels are unmeasurable. | `lib/help/track.ts`, `lib/weekly-review-track.ts` cover only 2 surfaces |

---

## 3. High-Priority Issues

| # | Area | Issue | Fix |
|---|------|-------|-----|
| H1 | Correctness | **UTC vs local "day" inconsistency.** `lib/weekly.ts`, `lib/water.ts`, `lib/coach-intel.ts`, `app/trends`, `app/coach` use UTC (`logged_at.slice(0,10)`); `dashboard`, `log`, `challenges`, `weekly-review`, `MiniProfileModal` use local (`toLocaleDateString('en-CA')` / `getFullYear`). Same concept, two definitions → off-by-one near midnight and mismatched day boundaries between dashboard (local) and trends/weekly (UTC). **Verified.** | One `dayKey(ts, tz)` util; standardize on local (user-facing) |
| H2 | Security | **Rate limiting is in-memory, per-instance** (`lib/ratelimit.ts`). On serverless, effective limit = limit × warm instances → bypassable. | Supabase/Upstash-backed distributed limiter |
| H3 | Security / QA | **`await req.json()` without try/catch** in `cheer`, `log-activity`, `log-meal`, `log-water`, `reactions`, `log-weight` → malformed body throws (500 instead of 400). | Wrap, return 400 |
| H4 | Security / QA | **Unvalidated/unbounded inputs:** `log-activity` (`activity_name` length; `duration_minutes`/`distance_km`/`steps`/`calories_burned` ranges), `log-meal` (`caption`/`photo_urls[]` length), `push/subscribe` (keys). | Type + bound checks |
| H5 | Architecture | **God components:** `CoachMemberClient.tsx` (901), `FeedCard.tsx` (782; 12 props, 10+ `useState`), `app/onboarding/page.tsx` (597), `DashboardClient.tsx` (553). High regression surface, hard to test. | Extract subcomponents / hooks |
| H6 | Reliability | **No `error.tsx` boundaries** in `app/`. One failed query can blank a route (e.g., coach page assembling many queries). | Root + per-route error boundaries |
| H7 | DB | **`comments` has no UPDATE policy** (edits silently fail under RLS); `reactions`/`comments` SELECT is `USING(true)` (gated only indirectly by `food_logs` RLS). | Add scoped UPDATE policy; tighten SELECT |

---

## 4. Quick Wins (< 1 day each)

1. **Add a missing-index migration** (C1) — single migration, outsized perf win. Suggested `044_add_missing_indexes.sql` in §13.
2. **Wrap `req.json()` in try/catch** across 6 routes (H3).
3. **Fix `alt` text / `aria-label`** on icon-only buttons & non-decorative images (NotificationBell, modal close buttons, avatars).
4. **Bump 36px touch targets** (`w-9 h-9`) → 44px (`w-11 h-11`) in InstallPrompt, MacroDetailModal, ActivityCard, FeedCard.
5. **Remove dead code:** `computeMemberProgress` (`lib/challenges.ts`, unused) and the duplicated search scorer (`lib/help/index.ts` vs `app/help/HelpClient.tsx`).
6. **Add loading state to challenge creation** + success toasts after delete-meal / approve-request.
7. **Extract one shared `dayKey` / `timeAgo` util** (kills 4–6 copies; H1 groundwork).
8. **Bound `notifications.data` / `food_logs.foods` JSONB** with CHECK size limits.

---

## 5. Architecture Audit (score 70)

**Strengths:** clean `lib/` separation; consistent server-component → client-component data flow; strong `types/index.ts`.

**Weaknesses:**
- **State:** all `useState` (~269 instances), no Context → heavy prop drilling. `FeedCard` takes 12 props; moderation context (`canModerate`, `moderationGroup`, `onRemoveMember`) threaded through layers. A Context for auth / moderation / feed-mutations would remove ~30%.
- **Navigation coupling:** `BottomNav` is exported from `DashboardClient.tsx` and imported by 6 pages — a page acting as a component library. Move to `components/`.
- **Duplication:** day-key helper ×6; `timeAgo`/`relTime`/`shortAgo` ×3; meal-emoji map ×4; `ACTIVE_DAYS_GOAL` defined in 3 libs; `get_my_group_member_ids` RPC parsing duplicated (`cheer` route + `MiniProfileModal`).
- **God components** (H5).
- **Render purity:** `Date.now()` / `new Date()` in render (`DashboardClient:55`, `CoachMemberClient:704`, `EditProfileClient`) — flagged by `react-hooks/purity`.

## 6. Code Quality Audit

- **Dead code:** `computeMemberProgress`, `searchArticles` (server search reimplemented client-side in `HelpClient`).
- **Duplicate logic** as above (day-key, time-ago, emoji maps, RPC parsing, search scoring).
- **Naming drift:** `dayKey` / `localDayKey` / `localDay` used interchangeably for subtly **different** behavior (root of H1).
- **No unused components** — all 21 are imported (good).

## 7. UI Audit (score 78)

- **Missing states:** challenge-create (no loading/feedback); trends weight-log (no loading); notifications/coach (no error fallback).
- **Accessibility:** empty/auto `alt`; no heading hierarchy on Trends/Challenges/Weekly; no focus management or modal focus-trap; `text-stone-500/600` on `stone-950` likely fails WCAG AA contrast; some 36px touch targets.
- **Design system:** mostly cohesive (stone/emerald/orange/sky, `rounded-2xl` cards) but inconsistent paddings, border-radii, and button heights; limited typographic scale.
- **Strengths:** polished dark theme, water-log undo, celebratory streak/milestones, live feed, `role="progressbar"`/`role="status"` in places.

## 8. UX Audit

- **Tap counts:** meal log 6–8 (no photo-analysis progress); water 2 (FAB not a direct shortcut); activity 6 (forced sequential fields); create group 4; create challenge 7 (no preview); join group 3 (smooth).
- **Friction / impact:**
  - `shareToFeed` toggle buried → accidental private logs → **less social proof, weaker retention loop.**
  - No photo-analysis progress → uncertainty → **abandoned logs.**
  - Group invite buried under Profile → Manage → **slower group growth (viral coefficient).**
  - Missing feedback after delete/approve → perceived unresponsiveness.
  - Onboarding loses data if closed mid-form → **activation drop.**
  - Feed dead-ends to group-create for solo users → **first-session drop.**

## 9. Performance Audit (score 55)

Dominated by C1. Also: feed N+1 risk (reactions/comments per post, unindexed `food_log_id`); large client bundles from god-components; `<img>` everywhere (no `next/image`) → LCP/bandwidth. Notification triggers correctly use batch inserts (good).

## 10. Security Audit (score 80)

**Strong:** service-role key server-only; admin client gated behind ownership checks; CRON_SECRET enforced on all cron routes; RLS + belt-and-suspenders `.eq('user_id')`; delete operations verify row counts; no SQL injection (query builder only); weight-privacy invariant upheld; push delivery group-gated; barcode/search/photo inputs validated & rate-limited.

**Gaps:** H2 (rate limiting), H3/H4 (validation); push-subscription endpoints readable by group members (Medium); no request-size cap except the photo route; coach message length mismatch (2000 input vs 500 stored).

## 11. Database Audit (score 60)

Beyond C1: `profiles.goal` vs `profiles.goals` redundancy with no sync (Medium); missing `comments` UPDATE policy (H7); unbounded JSONB; verbose constraint recreate-by-drop pattern (safe).
**Excellent:** cascades, storage folder-scoped policies, `is_group_coach` / `get_my_group_ids` SECURITY DEFINER helpers, member-cap trigger, idempotent migrations, realtime publication guards.

## 12. API Audit (score 68)

Consistent auth/status-code conventions; good rate-limit *targets*. Undermined by H2/H3/H4; inconsistent `.single()` vs `.maybeSingle()`; **no idempotency keys** on writes (double-tap Save → duplicate meal).

## 13. Analytics Audit (score 30)

See C3. Recommend a single generic `app_events` table + `track()` util, fired from each `/api/log-*`, auth callbacks, and group/challenge routes. Suggested event schema:

```ts
type AppEvent =
  | { type: 'signup' } | { type: 'login'; method: 'password' | 'oauth' }
  | { type: 'meal_logged'; meal_type: string; photo_count: number; shared: boolean }
  | { type: 'activity_logged'; activity_name: string; duration_min: number }
  | { type: 'water_logged'; amount_ml: number } | { type: 'weight_logged' }
  | { type: 'group_created' } | { type: 'group_joined'; via: 'code' | 'request' }
  | { type: 'challenge_created'; metric: string } | { type: 'challenge_completed'; metric: string }
  | { type: 'comment_added' | 'reaction_added' | 'cheer_sent' }
```

---

## QA Audit — Top risks (from 50 reviewed)

**Data / correctness**
1. UTC/local day mismatch (H1).
2. Streak miscount near midnight across screens.
3. Double-tap Save → duplicate meal (no idempotency).
4. `goal`/`goals` divergence breaks calorie target.
5. Weekly-review group rank edge when RPC returns only self.
6. `buildGoalProgress` skips "at goal" for lose_weight when start == target.
7. Weight-milestone pct precision when total is tiny.

**Crash / robustness**
8–13. `req.json()` throws ×6 routes (H3).
14. Coach page blanks if one query fails (no error boundary, H6).
15. Unbounded `photo_urls` / `foods` row bloat.
16. Malformed push keys accepted.
17. Negative/huge `duration_minutes` / `steps` accepted (H4).

**Performance**
18. Full scans on all core tables at scale (C1).
19. Feed reaction/comment fan-out unindexed.
20. `get_my_group_member_ids` evaluated per-row in scans.

**Security**
21. Per-instance rate-limit bypass (H2).
22. Cross-user push-endpoint read.
23. No request body-size cap (except photo).

**UX / feedback**
24. No challenge-create loading.
25. No delete/approve toasts.
26. Accidental private meals (buried share toggle).
27. Onboarding loses data if closed mid-form.
28. Feed dead-ends to group-create for solo users.

**Accessibility**
29. Empty/auto `alt`.
30. 36px touch targets.
31. No modal focus trap.
32. Low-contrast secondary text.

**Maintainability**
33. Zero tests (C2).
34. God-components (H5).
35. Duplicate logic ×4–6.
36. No error boundaries (H6).

*(Remaining ~14 are lower-severity variants of the above; expand on request.)*

---

## Product Audit

- **Stubbed ("Soon"):** Apple Health / Google Health Connect / wearables sync; Contact support; billing history & coach-plan upgrade; global feed-default privacy.
- **Dead ends:** solo user on `/feed` → forced to group-create; settings has no bottom nav; group invite buried under Profile → Manage.
- **Missing for retention:** meal history search / favorites / presets; mid-week engagement (weekly review is Sunday-seeded).
- **Verify:** barcode scan path (deps present).

---

## Technical Debt Register

| Item | Severity | Effort | Business impact | Priority |
|------|----------|--------|-----------------|----------|
| Missing indexes (C1) | Critical | 0.5d | App slows to a crawl with data | **P0** |
| No tests (C2) | Critical | ongoing | Every release risks regressions | **P0** |
| Core analytics (C3) | Critical | 2–3d | Can't measure or grow retention | **P0** |
| UTC/local day (H1) | High | 1d | Wrong streaks/reports | **P1** |
| Distributed rate limit (H2) | High | 1d | Abuse / cost | **P1** |
| Input validation (H3/H4) | High | 1d | 500s, bad data | **P1** |
| Error boundaries (H6) | Medium | 0.5d | Blank screens | **P1** |
| God-components (H5) | High | 1–2wk | Velocity, regressions | **P2** |
| Dedup helpers + state Context | Medium | 3–4d | Maintainability | **P2** |
| Accessibility pass | Medium | 2–3d | Compliance, reach | **P2** |
| Resolve/hide "Soon" stubs | Low | 1–2d | Trust / polish | **P3** |

---

## 30-Day Engineering Roadmap

- **Week 1 — stop the bleeding:** index migration (C1); analytics table + `track()` instrumenting all core actions (C3); `req.json()` try/catch + input bounds (H3/H4); error boundaries (H6); quick-win a11y / touch-target / dead-code.
- **Week 2 — correctness:** unify `dayKey` to local + cover streak/challenge/weekly math with tests; distributed rate limiter (H2); `comments` UPDATE policy + JSONB caps (H7).
- **Week 3 — test foundation:** add vitest; unit-test `lib/` pure logic (streak, challenges, weekly-review, fitness, nutrients); one Playwright smoke (log → dashboard → weekly).
- **Week 4 — structure:** extract `FeedCard` & `CoachMemberClient` subcomponents; auth/moderation Context; move `BottomNav` to `components/`; resolve or hide "Soon" stubs.

---

## Production-Readiness Scores

| Dimension | Score |
|-----------|-------|
| Architecture | 70 |
| Security | 80 |
| Performance | 55 |
| UX | 78 |
| Reliability | 50 |
| Scalability | 55 |
| **Overall** | **71 / 100** |

**Final recommendation: 🟡 Needs remediation.** A solid, secure MVP that is not yet scale-ready. The P0 trio — **indexes, tests, analytics** — plus the **day-key** correctness fix are the gating work, and most are quick wins with outsized impact.

---

## Appendix A — Suggested `044_add_missing_indexes.sql`

```sql
-- Core access patterns: WHERE user_id = ? [AND logged_at >= ?]
CREATE INDEX IF NOT EXISTS food_logs_user_logged_at_idx   ON food_logs(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_user_logged_at_idx ON activity_logs(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS water_logs_user_logged_at_idx  ON water_logs(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS weight_logs_user_logged_at_idx ON weight_logs(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS milestones_user_idx            ON milestones(user_id, created_at DESC);

-- Group membership joins (get_my_group_ids / get_my_group_member_ids)
CREATE INDEX IF NOT EXISTS group_members_user_id_idx      ON group_members(user_id);

-- Feed fan-out: reactions/comments per post
CREATE INDEX IF NOT EXISTS reactions_food_log_id_idx      ON reactions(food_log_id);
CREATE INDEX IF NOT EXISTS comments_food_log_id_idx       ON comments(food_log_id);

-- Notifications full history (not just unread)
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications(user_id, created_at DESC);

-- Coach surfaces
CREATE INDEX IF NOT EXISTS coach_message_drafts_member_idx ON coach_message_drafts(member_id, status);
CREATE INDEX IF NOT EXISTS group_join_requests_group_idx   ON group_join_requests(group_id, status);
```

*Validate against `EXPLAIN ANALYZE` on production-shaped data before finalizing; drop any that don't change the plan.*
