# NutriSync — Full Engineering Audit (Re-Audit)

**Date:** 2026-06-27
**Auditors (roles):** Staff Software Engineer · Mobile Architect · Security Engineer · QA Lead · Product Analyst
**Scope:** Next.js 16 / React 19 PWA, Supabase (Postgres + RLS + Storage). 47 migrations, ~21k LOC. Audited on `main` @ `2dc00d7`.
**Method:** Four parallel specialist sweeps (database/perf, tests/analytics/reliability, security/API/correctness, architecture/UI), each re-verifying the prior audit's findings against current code.
**Supersedes:** `docs/ENGINEERING-AUDIT.md` (2026-06-21, score 71/100).

---

## 0. What changed since the last audit

Remediation landed via the P0 Performance Sprint (migration 044), the Timezone Standardization sprint (PR #61), the Analytics Foundation (PR #60, migration 045), and the Accessibility sweep (PR #64). Net movement on the prior findings:

| Prior finding | Severity | Status now | Evidence |
|---|---|---|---|
| **C1 — No indexes on core tables** | Critical | ✅ **RESOLVED** | `044_performance_indexes.sql`; `CREATE INDEX` count 7 → **23**; all core tables covered |
| **C2 — Zero automated tests** | Critical | 🔴 **OPEN** | `package.json` has no `test` script; no vitest/jest/playwright; 0 test files |
| **C3 — No analytics on core actions** | Critical | ✅ **RESOLVED** | `lib/analytics.ts` + `/api/analytics/event`; all 11 core events fire |
| **H1 — UTC vs local "day" inconsistency** | High | 🟡 **PARTIAL** | `lib/day.ts#userDayKey` exists; backend libs use it; **4 residual `.slice(0,10)`** in Trends/coach frontends |
| **H2 — In-memory rate limiting** | High | 🔴 **OPEN** | `lib/ratelimit.ts:8` still a per-instance `Map` (intentional, documented) |
| **H3 — `req.json()` without try/catch** | High | 🟡 **PARTIAL** | New routes guarded; **5 legacy routes still unguarded** |
| **H4 — Unvalidated/unbounded inputs** | High | 🔴 **OPEN** | `log-activity` numerics, `log-meal` caption/`photo_urls`, `push/subscribe` keys all unbounded |
| **H5 — God components** | High | 🔴 **OPEN** | CoachMember 901, FeedCard 799, onboarding 599, dashboard 555 — no decomposition |
| **H6 — No `error.tsx` boundaries** | Medium | 🔴 **OPEN** | 0 `error.tsx` / `global-error.tsx` in `app/` |
| **H7 — `comments` no UPDATE policy; SELECT `USING(true)`** | High | 🔴 **OPEN** | `001_initial.sql:122-124` unchanged; `reactions` SELECT also `USING(true)` |
| **QW — Empty `alt`** | Quick win | ✅ **RESOLVED** | `alt=""` count 17 → **0** |
| **QW — 36px touch targets** | Quick win | 🟡 **PARTIAL** | 10 sub-44px targets remain (3× `w-9 h-9`, 7× `w-10 h-10`) |
| **QW — Dead code** | Quick win | 🔴 **OPEN** | `computeMemberProgress` + `searchArticles` still unused |
| **QW — Shared `dayKey`/`timeAgo` util** | Quick win | 🟡 **PARTIAL** | `lib/day.ts` created; consumers not fully migrated |
| **QW — JSONB size bounds** | Quick win | 🔴 **OPEN** | No CHECK on `food_logs.foods` / `notifications.data` |
| **Render purity (`Date.now()` in render)** | — | 🔴 **OPEN** | 15+ `react-hooks/purity` lint errors across 14 files |

**Headline:** 2 of the 3 P0 criticals are closed (**indexes, analytics**); the third (**tests**) is untouched. The day-key correctness fix is ~80% done. The accessibility, store-readiness, and observability work materially improved the product. The remaining debt is concentrated in **testing, input hardening, error boundaries, and component structure** — none of them new, all of them known.

---

## 1. Executive Summary

NutriSync remains a **well-architected MVP with a sound security base**, and it is now **materially closer to scale-ready** than at the last audit. The performance cliff (unindexed core tables) is gone, every core user action is instrumented, and a timezone-correct day-key utility exists. Accessibility moved from "failing" to "mostly compliant."

It is **still not fully scale-ready**, and the gating items are the same ones flagged before, minus the two that were fixed:
1. **Zero automated tests** (C2) — unchanged; the single largest remaining risk.
2. **Input hardening** (H3/H4) — malformed-JSON 500s and unbounded inputs persist on the legacy log routes.
3. **No error boundaries** (H6) — one failed query can still blank a route.
4. **Structure debt** (H5 god components, dead code, render-purity lint) — slows velocity, untouched.

**Overall score: 80 / 100** (was 71). **Recommendation: 🟡 Substantially remediated — close the test + validation + error-boundary gaps before scaling.** The security base is sound; the trajectory is right.

---

## 2. Critical Issues (scale blockers)

| # | Area | Issue | Status | Evidence |
|---|------|-------|--------|----------|
| C1 | Performance / DB | No indexes on core tables | ✅ **RESOLVED** | `044_performance_indexes.sql` adds 12 indexes covering food/activity/water/weight logs, group_members, reactions/comments (`food_log_id`,`activity_log_id`,`parent_id`), milestones, challenges; later migrations add notifications, coach drafts, app_events, etc. **23 `CREATE INDEX`** total. |
| C2 | Reliability | **Zero automated tests.** No vitest/jest/playwright, no `test` script, 0 test files. Pure logic (streak, challenges, weekly-review, calorie/nutrient math) still uncovered. | 🔴 **OPEN** | `package.json` |
| C3 | Analytics | Core actions untracked | ✅ **RESOLVED** | `lib/analytics.ts` `APP_EVENTS` (11) + `track()`/`logEvent()`. All fire: signup, login, onboarding_completed, meal/activity/water/weight_logged, group_created/joined, challenge_created/completed. |

**Remaining P0:** C2 only. A `vitest` setup unit-testing `lib/` pure logic plus one Playwright smoke (log → dashboard → weekly) remains the highest-leverage open item.

---

## 3. High-Priority Issues

| # | Area | Issue | Status | Fix |
|---|------|-------|--------|-----|
| H1 | Correctness | UTC vs local "day". `lib/day.ts#userDayKey(ts, tz)` now exists and `weekly.ts`, `water.ts`, `coach-intel.ts`, `trends.ts`, `weekly-review.ts` gate on `timeZone`. **But** `app/trends/TrendsClient.tsx:138,146` and `app/coach/[memberId]/page.tsx:152` still bucket by raw `.slice(0,10)` (UTC) for display. | 🟡 **PARTIAL** | Thread `timeZone` into the 4 residual frontend buckets; delete the dead `dayKey` in `app/coach/page.tsx:15`. |
| H2 | Security | Rate limiting still in-memory/per-instance (`lib/ratelimit.ts:8`). Effective limit = limit × warm instances. | 🔴 **OPEN** | Supabase/Upstash-backed limiter for `analyze-photo`, `cheer`, auth-adjacent routes. |
| H3 | Security / QA | `await req.json()` unguarded in **`log-activity`, `log-meal`, `log-water`, `cheer`, `reactions`** → malformed body = 500 not 400. (New routes consent/analytics/help correctly use `.catch(()=>({}))`.) | 🟡 **PARTIAL** | Wrap the 5 legacy routes; return 400. |
| H4 | Security / QA | Unbounded inputs persist: `log-activity` (`activity_name` length; `duration_minutes`/`distance_km`/`steps`/`calories_burned` ranges), `log-meal` (`caption` length, `photo_urls[]` count), `push/subscribe` (key format/length). | 🔴 **OPEN** | Type + bound checks; cap `photo_urls` (≤5), validate push keys. |
| H5 | Architecture | God components unchanged: `CoachMemberClient` 901, `FeedCard` 799, `onboarding` 599, `DashboardClient` 555. | 🔴 **OPEN** | Extract subcomponents / hooks. |
| H6 | Reliability | No `error.tsx` boundaries in `app/`. | 🔴 **OPEN** | Root + per-route error boundaries. |
| H7 | DB | `comments` still has no UPDATE policy (edits fail under RLS); `comments`/`reactions`/`comment_likes` SELECT remain `USING(true)`. | 🔴 **OPEN** | Add scoped UPDATE policy; tighten SELECT to group membership. |

---

## 4. Quick Wins (status)

1. **Missing-index migration (C1)** — ✅ done (`044`).
2. **Wrap `req.json()` in try/catch** (H3) — 🟡 5 routes remain.
3. **`alt` / `aria-label`** — ✅ `alt=""` eliminated (17 → 0).
4. **Bump 36px touch targets** — 🟡 10 remain (`w-9/w-10`); bump to `w-11 h-11`.
5. **Remove dead code** (`computeMemberProgress`, `searchArticles`) — 🔴 still present.
6. **Loading/success feedback** on challenge create / delete-meal / approve-request — partial (challenge create now tracks; toasts still thin).
7. **Shared `dayKey` util** — ✅ `lib/day.ts` exists; 🟡 finish migrating the 4 frontend callers.
8. **Bound JSONB** (`food_logs.foods`, `notifications.data`) — 🔴 still unbounded.

**Still cheap, still worth doing:** items 2, 4, 5, 7, 8 are all < 1 day.

---

## 5–12. Dimension notes (delta only)

- **Architecture (70 → 73):** New `lib/day.ts`, `lib/analytics*.ts`, and `lib/useFocusTrap.ts` are clean, well-factored additions. God components, `BottomNav` exported from `DashboardClient` (imported by 8 pages), and duplicate helpers persist. Render-purity lint (`Date.now()` in render) now surfaces as **15+ ESLint errors** across 14 files — non-blocking for `next build` but a real code smell.
- **Code Quality:** `computeMemberProgress` (`lib/challenges.ts:153`) and `searchArticles` (`lib/help/index.ts`) remain dead. New minor lint: `set-state-in-effect` (InstallPrompt, PushToggle), a ref write in `useFocusTrap.ts:28`, unescaped `'` in DashboardClient.
- **Performance (55 → 80):** C1 resolved — the dominant finding is gone. Feed reaction/comment fan-out is now indexed (`reactions_food_log_id_idx`, `comments_food_log_id_idx`). Remaining: god-component bundle size, `<img>` everywhere (no `next/image`) → LCP/bandwidth (also the #1 infra-cost lever per `docs/COST-MODEL`).
- **Security (80 → 80):** No regressions; new write endpoints (consent, ai-feedback, analytics) are auth-gated and rate-limited. H2/H3/H4 keep this from rising. Service-role isolation, RLS helpers, CRON_SECRET, weight-privacy invariant all intact.
- **Reliability (50 → 58):** Analytics + day-key improve observability/correctness, but **tests (C2)** and **error boundaries (H6)** are the two anchors still down.
- **Database (60 → 78):** Indexes resolved. Open: H7 policies, unbounded JSONB, `goal`/`goals` redundancy (no sync), and a **newly-noted gap — `group_join_requests` has no access-pattern index** (only a UNIQUE constraint).
- **API (68 → 72):** Consistent conventions; still no idempotency keys (double-tap Save → duplicate meal) and the H3/H4 gaps.

---

## 13. New issues found this pass

| # | Severity | Issue | Evidence |
|---|---|---|---|
| N1 | Low | `group_join_requests` queried by `group_id` and `user_id` but has no supporting index (only UNIQUE). | migrations 023/031 |
| N2 | Low | `comment_likes` SELECT policy is `USING(true)` (same over-broad read as comments/reactions). | `038_comment_likes.sql:18` |
| N3 | Low | `notifications_user_unread_idx` is `(user_id, read, created_at)` — a pure `WHERE user_id ORDER BY created_at` timeline scan isn't covered by the leading column set. | `010_notifications.sql` |
| N4 | Low | `react-hooks/purity` lint: 15+ `Date.now()`-in-render errors; `set-state-in-effect` in InstallPrompt/PushToggle; ref write in `useFocusTrap`. Non-blocking but accumulating. | eslint |

---

## Production-Readiness Scores

| Dimension | Prior (2026-06-21) | Now (2026-06-27) | Δ |
|-----------|------|------|---|
| Architecture | 70 | 73 | +3 |
| Security | 80 | 80 | 0 |
| Performance | 55 | 80 | +25 |
| UX | 78 | 84 | +6 |
| Reliability | 50 | 58 | +8 |
| Scalability | 55 | 72 | +17 |
| **Overall** | **71** | **80** | **+9** |

**Final recommendation: 🟡 Substantially remediated.** The P0 performance and analytics gaps are closed and the day-key correctness fix is nearly done. To reach 🟢 scale-ready, the remaining gating work is small and well-defined: **(1) a test foundation (C2), (2) input hardening on the 5 legacy log routes (H3/H4), (3) error boundaries (H6).** Component decomposition (H5) and the RLS tightening (H7) follow as P2.

---

## Appendix — Verification commands used

```
git log --oneline -1                                  # main @ 2dc00d7
rg -c 'CREATE INDEX' supabase/migrations/*.sql        # 23 total
rg -n 'alt=""' components app | wc -l                 # 0
rg -n 'new Map<string' lib/ratelimit.ts               # still in-memory
ls app/**/error.tsx 2>/dev/null | wc -l               # 0
rg -n "track\(|logEvent\(" app lib components         # 11 core events fire
```
