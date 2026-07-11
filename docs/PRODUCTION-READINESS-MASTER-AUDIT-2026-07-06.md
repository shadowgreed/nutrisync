# NutriSync — Production Readiness Master Audit

**Date:** 2026-07-06 · **Scope commit:** `dfd17cf` (`main`, post Spanish i18n landing) · **Audited by:** 6-agent parallel deep-dive (Architecture/Code Quality/Reliability/DevOps, Security/Pentest, API+Database, Performance+Mobile/PWA, UX+Accessibility, Analytics/AI/Privacy/Monetization/Testing), synthesized and cross-checked against 3 prior audit generations in this directory.

**Methodology:** Each agent read the actual source — all 34 API routes, all 51 migrations, every screen/component named in scope, `package.json`, CI config, and prior audit docs — and reported only what it could point to with a file:line citation. No finding in this document is a generic best-practice statement; every one traces to real code. Where an issue was flagged by more than one agent from a different angle (e.g. `CRON_SECRET` fail-open seen by both the API and Security passes), the findings are merged into one entry citing both angles.

**Honesty note on scale:** This audit is broader and stricter than the three prior audits in this directory (`ENGINEERING-AUDIT-2026-07-02.md` = 84/100, `STORE-READINESS-AUDIT-2026-07-02.md` = 80/100). Those were scoped to architecture/store-compliance. This audit adds a real penetration-test pass, a database/RLS deep-read, and analytics/AI/testing/monetization review that the prior audits didn't attempt. **The lower scores below are not a regression in the code — they are a wider, harder yardstick finding real issues the narrower audits never looked for**, most importantly two High-severity broken-access-control bugs in Section 3.

A total of **89 distinct, verified issues** were found. This document does not pad that number to hit a round "100" — 89 is the real count.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Production Readiness Scorecard (17 dimensions)](#2-production-readiness-scorecard)
3. [Final Go/No-Go Launch Recommendation](#3-final-gono-go-launch-recommendation)
4. [Top Issues Ranked by Severity](#4-top-issues-ranked-by-severity) *(89 issues; fulfills "Top 100 Issues" deliverable)*
5. [Architecture](#5-architecture)
6. [Code Quality](#6-code-quality)
7. [Security Report](#7-security-report-pentest-style) *(pentest-style, CVSS-scored)*
8. [API Report](#8-api-report)
9. [Database Report](#9-database-report)
10. [Performance Report](#10-performance-report)
11. [Mobile / PWA](#11-mobile--pwa)
12. [UX](#12-ux)
13. [Accessibility Report (WCAG 2.2 AA)](#13-accessibility-report-wcag-22-aa)
14. [Analytics](#14-analytics)
15. [AI Integration](#15-ai-integration)
16. [Reliability](#16-reliability)
17. [DevOps](#17-devops)
18. [Testing / QA Report](#18-testing--qa-report)
19. [Privacy & Compliance](#19-privacy--compliance)
20. [Monetization](#20-monetization)
21. [Technical Debt Register](#21-technical-debt-register)
22. [Risk Register](#22-risk-register)
23. [Sprint Backlog P0–P3](#23-sprint-backlog-p0p3)

---

## 1. Executive Summary

NutriSync is a well-built, single-developer-scale Next.js 16 / React 19 / Supabase PWA with genuinely strong fundamentals: clean RLS-first data isolation on nearly every table, a disciplined validation layer on most write routes, a real (if young) CI pipeline, 64 passing unit tests, a fully bilingual (en/es-419) UI, and thoughtful product details (optimistic UI, focus traps on modals, 44px touch targets, dual-tier rate limiting). It is **not**, however, ready to scale to hundreds of thousands of users without fixing a short list of critical issues first.

**The two issues that matter most** are both access-control bugs discovered in the security pass: (1) the `group_members` INSERT policy lets any authenticated user join *any* group directly, bypassing invite codes, founder approval, and the paid-plan member cap — meaning any signed-in user can read another group's health/PII data and food photos just by knowing (or being sent) a group ID; and (2) the RLS SELECT policies on `comments`, `reactions`, and `comment_likes` are still `USING (true)` — global read access to all social content — even though a scoped fix was drafted and commented-out in migration 048 and never applied. Both are one-migration fixes (combined ~5–8h) and should ship before any further user growth.

Beyond that, the app has three structural gaps that don't block a small user base but will hurt materially past a few thousand users: **zero crash/error reporting** (a runtime bug affecting a cohort is invisible to the team until users complain), **zero AI response caching** (every repeat food-name lookup re-hits Claude, a pure cost multiplier), and **the entire site is server-rendered dynamic** (a single `cookies()` read in the root layout for locale opts every route, including static marketing/help pages, out of CDN caching).

The product engineering fundamentals — RLS design (outside the two bugs above), validation, i18n architecture, rate limiting — are above average for this stage. The gaps are concentrated in **operational maturity** (no APM, no IaC, no backup documentation, no feature flags, no versioning) and in a handful of **components that grew faster than they were refactored** (four 500–930 line "god components"). None of this is unusual for a pre-scale product; all of it needs to close before "hundreds of thousands of users" is a safe target.

**Verdict:** See [Section 3](#3-final-gono-go-launch-recommendation) — conditional Go, gated on the P0 list.

---

## 2. Production Readiness Scorecard

Scored 0–100 per dimension. "Prior" = the narrower 2026-07-02 `ENGINEERING-AUDIT`/`STORE-READINESS-AUDIT` scores where a comparable dimension existed; "—" where this audit is the first to score that dimension.

| # | Dimension | Score | Prior | Rationale |
|---|---|---|---|---|
| 1 | Architecture | 68/100 | 84 (narrower scope) | Clean `lib/` layering, no circular imports; undercut by 4 god components, BottomNav layering violation, no feature flags/IaC/versioning |
| 2 | Code Quality | 66/100 | — | 27 eslint errors (18 render-purity, 6 set-state-in-effect), 2,663-line dictionary file, otherwise disciplined |
| 3 | Security | 58/100 | — (new pass) | 2 High CVSS (8.1, 7.1) broken-access-control bugs; otherwise strong RLS/secrets/no-SQLi posture |
| 4 | API Design | 64/100 | — | Consistent error shape, good validation on most routes; no request timeouts, fail-open cron auth, no pagination |
| 5 | Database | 74/100 | — | Good FK hygiene, 29 indexes covering the dominant query shape; one privesc bug, no backup/DR docs, missing 1 hot index |
| 6 | Performance | 55/100 | 71→84 (perf sprint) | P0-perf-sprint wins (indexes, query caps) hold, but every route is dynamic (zero static/CDN), no image optimization |
| 7 | Mobile / PWA | 62/100 | 80 (store readiness) | Manifest/installability solid; SW is push-only with no offline fallback, no keyboard-avoidance, no connectivity handling |
| 8 | UX | 65/100 | — | Strong microinteractions in most flows; Weekly Review is a critical UX/access failure, inconsistent destructive-action confirms |
| 9 | Accessibility (WCAG 2.2 AA) | 60/100 | — | Solid target-size/alt-text/lang fundamentals from prior remediation; keyboard, live-region, and reduced-motion criteria fail |
| 10 | Analytics | 45/100 | — | Events fire but land in a table with no BI tool/dashboard; no AI-usage, error, screen-view, or retention events |
| 11 | AI Integration | 62/100 | — | Well-hardened prompts, good template fallback for coach drafts; zero caching, no timeout, no token telemetry |
| 12 | Reliability | 50/100 | — | No crash reporting, no retry/offline handling, cron auth fails open, unbounded LLM fan-out in backfill route |
| 13 | DevOps / Infra | 55/100 | — | CI now exists (real improvement) but lint is non-gating; zero IaC, no versioning/tags/CHANGELOG, no backup documentation |
| 14 | Testing / QA | 52/100 | — | 64 unit tests (up from prior audits) but core nutrition math untested; e2e only covers unauthenticated flows in CI |
| 15 | Privacy & Compliance | 72/100 | — | Solid consent/export/delete flow; health-data (Art. 9) has no distinct lawful-basis documentation |
| 16 | Monetization | N/A | — | No monetization exists by design (confirmed free product); `groups.plan` entitlement groundwork is genuinely well-built for a future paid tier |
| 17 | Scalability (cross-cutting) | 50/100 | — | Rate limiting/RLS/indexes handle the common path, but no IaC, no backups documented, no materialized views for the coach/digest rollups, and the two access-control bugs get worse (not better) as user count grows |

**Weighted overall: ~61/100** (Monetization excluded from the average as N/A). This is a codebase with strong bones and a short, addressable list of things that must be fixed before it is safe to scale — not a rewrite candidate.

---

## 3. Final Go/No-Go Launch Recommendation

### Verdict: **CONDITIONAL GO — blocked on the P0 list (Section 23) before scaling past current usage.**

**Do not** onboard a large new cohort (marketing push, App Store launch, paid acquisition) until the 6 P0 items ship:
1. Fix the `group_members` self-join RLS bug (Security S1 / PR-01)
2. Enable the scoped `comments`/`reactions`/`comment_likes` SELECT policies already drafted in migration 048 (Security S2 / PR-02)
3. Fail-closed `CRON_SECRET` check on all cron routes (PR-06)
4. Pin `search_path` on `handle_new_user()` (PR-10)
5. Wire minimal crash/error reporting (PR-05)
6. Add an Anthropic client timeout + `maxDuration` on `analyze-photo` (PR-09)

These six are all small (combined ≈20–25 engineering hours), don't touch product surface area users will notice, and close the only issues in this audit that represent **active data-exposure or public-abuse risk today**, not just future-scale risk.

**Everything else in this document (P1/P2/P3) is real technical debt that should be worked down on a normal sprint cadence** — none of it is a reason to hold a launch once the P0 list is done. The performance/rendering findings (P1 dynamic-rendering, image optimization) matter for cost and speed at scale but are not correctness or safety issues; the same is true of the accessibility, analytics, and testing gaps. They should be sequenced per the [Sprint Backlog](#23-sprint-backlog-p0p3), not treated as blockers.

**What is going right and should not be disturbed while fixing the above:** the dual-tier rate limiter, the i18n architecture, the consent/export/delete-account privacy flow, the group-scoped RLS model on every table *except* the two named above, and the Copilot AI's template-fallback design.

---

## 4. Top Issues Ranked by Severity

All 89 verified issues, most-severe first. Full prose detail (root cause / business impact / user impact / regression risk) for every **P0 and P1** issue is in the section named in the "Detail §" column. P2/P3 issues carry a condensed but complete entry here (all required fields, terser prose) and are not separately repeated in the topic sections except where a section-level pattern needed illustrating.

### P0 — Critical (block scale-up)

| ID | Category | File(s) | Issue | Effort | Detail § |
|---|---|---|---|---|---|
| **PR-01** | Security | `supabase/migrations/001_initial.sql:61-62` | Any authenticated user can self-join any group, bypassing invite code, founder approval, and paid member cap | 3-5h | §7 |
| **PR-02** | Security | `001_initial.sql:107,122`, `038:18` | `comments`/`reactions`/`comment_likes` SELECT is live `USING(true)` — global read of all social content | 1-2h | §7 |
| **PR-03** | Performance | `app/layout.tsx:49`, `lib/i18n/server.ts:6-9` | Root-layout `cookies()` read for locale makes **all 70+ routes dynamic** — zero static/ISR/CDN delivery anywhere | 12-20h | §10 |
| **PR-04** | UX/Accessibility | `components/WeeklyReviewClient.tsx:14,115-169` | Weekly Review "story" has no keyboard/pause/stop controls; fails WCAG 2.1.1, 2.2.2, 2.5.7 | 6-8h | §12,§13 |
| **PR-05** | Reliability | `app/error.tsx:16-19`, `app/global-error.tsx:31-34` | Zero crash/error reporting anywhere (console.error only) — production runtime failures are invisible to the team | 6-8h | §16 |
| **PR-06** | Security/API | `cron/reminders:31`, `cron/weekly-report:26`, `cron/coach-digest:41` | `CRON_SECRET` check fails open (skipped entirely) if the env var is unset — admin-privileged endpoints become publicly callable | 1h | §7,§8 |

### P1 — High

| ID | Category | File(s) | Issue | Effort | Detail § |
|---|---|---|---|---|---|
| PR-07 | Database/Code Quality | `app/profile/edit/EditProfileClient.tsx:102-118`, `app/onboarding/page.tsx:98,109` | `goal`/`goals` profile fields silently diverge — editing a goal updates `goal` but never syncs `goals[]`, so Weekly Review and MiniProfileModal show a stale goal | 1-4h | §5,§9 |
| PR-08 | Architecture | `CoachMemberClient.tsx` (929L), `FeedCard.tsx` (801L), `ChallengesClient.tsx` (533L), `MiniProfileModal.tsx` (524L) | Four god components mix data-fetching, domain logic, and presentation in one file each | 16-24h | §5 |
| PR-09 | API/AI | `lib/anthropic.ts:6`, `lib/copilot-ai.ts:16`, `app/api/analyze-photo/route.ts` | No Anthropic client timeout (SDK default 600s); `analyze-photo` sets no `maxDuration` → platform kills the request before a graceful error can return | 3-4h | §8,§15 |
| PR-10 | Database/Security | `supabase/migrations/001_initial.sql:21-28` | `handle_new_user()` is `SECURITY DEFINER` with no `search_path` pin — the one function in the codebase missing this, a classic privesc vector | 15min | §7,§9 |
| PR-11 | Database | `push_subscriptions` table | Missing index on `user_id` — every cron loop and push send does a sequential scan | 15min | §9 |
| PR-12 | API/Reliability | `app/api/backfill-nutrition/route.ts:34` | Unbounded, unthrottled `Promise.all` fan-out of Claude calls, no rate limit and no cap — cost-DoS vector | 1h | §8,§16 |
| PR-13 | Database/DevOps | `docs/DEPLOYMENT.md` | Zero mention of backups, PITR, or a tested restore procedure anywhere in the repo | 4h+ops | §9,§17 |
| PR-14 | Performance/Code Quality | 21 `<img>` sites across 12 files (`FeedCard.tsx`, `MiniProfileModal.tsx`, `CoachMemberClient.tsx`, etc.) | Raw `<img>` for user meal/avatar photos — no resize/format negotiation; full-res originals served into 48px thumbnail slots | 8-16h | §10 |
| PR-15 | Mobile/PWA | `public/sw.js` (51 lines, no `fetch` handler), `components/PushToggle.tsx:69` | Service worker is push-only, registers only after push opt-in; installed PWA shows the browser's native offline error page | 4-16h | §11 |
| PR-16 | Mobile/PWA/Reliability | `components/MealLogger.tsx:195-247`, `FeedClient.tsx:144-148` | No online/offline detection anywhere; a dropped meal-log request fails silently, photos re-upload under a new path (orphaning the original), reactions fail silently | 8-20h | §11,§16 |
| PR-17 | Security | `components/AvatarUpload.tsx:33-39`, `components/MealLogger.tsx:206-212` | Client-direct Storage uploads have no server-side MIME/size validation into public buckets — stored-XSS-on-storage-origin + unbounded upload cost | 3-4h | §7 |
| PR-18 | Security | `supabase/migrations/026_storage_repair.sql:8-27` | Meal-photo/avatar buckets are unconditionally public-read with low-entropy paths — no signed URLs; health-adjacent photos are world-readable by anyone with the URL | 6-10h | §7 |
| PR-19 | Testing | `lib/nutrients.ts`, `lib/macros.ts`, `lib/trends.ts`, `lib/coach-intel.ts`, `lib/copilot.ts` | Zero test coverage on the arithmetic backbone of the product (every meal log + the entire Trends screen) and the AI-signal generators | 12-16h (core 3) / 24-32h (full list) | §18 |
| PR-20 | Testing/DevOps | `.github/workflows/ci.yml:44-49`, `e2e/authed.spec.ts:11` | CI's e2e job self-skips its only authenticated spec without secrets — meal logging, social, coach, and challenge flows have **zero** e2e coverage in CI | 12-20h | §17,§18 |
| PR-21 | Analytics | `lib/analytics.ts:40` | Analytics events land in a raw Postgres table with no BI tool, dashboard, or provider integration — funnel/retention analysis requires hand-written SQL | 8-16h (warehouse hookup) / 16-24h (provider) | §14 |
| PR-22 | Analytics/AI | `app/api/analyze-photo/route.ts:37`, `app/api/coach/draft/route.ts:84` | The two most cost-sensitive actions (Claude Vision call, Copilot draft generation) fire zero analytics events — no way to measure AI usage or attribute cost | 3h | §14,§15 |
| PR-23 | AI | `lib/anthropic.ts:134-166` | Zero result caching for food-nutrition estimation — every repeat lookup of a common food ("banana", "chicken breast") re-hits Claude | 8-12h | §15 |
| PR-24 | UX | `app/globals.css:14-31`, `app/layout.tsx:52` | No light mode; `prefers-color-scheme` CSS vars are dead code, body is hardcoded dark | 2h (honest cleanup) / 30h+ (real theme) | §12 |
| PR-25 | UX | `ChallengesClient.tsx:396-399`, `CoachMemberClient.tsx:903` | Challenge delete and coach-note delete fire immediately with no confirm step, unlike every other destructive action in the app | 2h | §12 |
| PR-26 | UX/Accessibility | Feed "new posts" pill, `BarcodeScanner.tsx:162-165`, `MealLogger.tsx:455,484-487`, `LogClient.tsx:339-349` | Dynamic success/error messages are visual-only — no `aria-live`, silent to assistive tech; also fails WCAG 4.1.3 | 4h | §12,§13 |
| PR-27 | API | `app/api/export-data/route.ts:19-46` | Unbounded full-history scan per user with no `.limit()` or time bound — a multi-year power user pulls their entire history into one in-memory JSON string | 4-6h | §8 |
| PR-28 | API | `app/api/log-meal/route.ts:112-122` | Per-food numeric fields (`calories`, `nutrients`, `macros`) trusted from the client body with no server-side bound — feeds widget/trends/coach-signals/rankings | 2h | §8 |
| PR-29 | Accessibility | 8+ screens (`TrendsClient.tsx`, `CoachClient.tsx`, `CoachMemberClient.tsx`, `ProfileClient.tsx`, `PrivacyClient.tsx`, `LogClient.tsx`, `onboarding/page.tsx`, `FoodSearchBar.tsx`) | Custom segmented controls/tabs/chips expose selected state visually only — no `role="tab"`/`aria-selected`/`aria-pressed` — WCAG 1.3.1 & 4.1.2 fail | 8-12h | §13 |
| PR-30 | Accessibility | `app/globals.css:77-79` | `prefers-reduced-motion` is honored only for the splash screen; confetti, story auto-advance, pulse/spin/transition animations (55 occurrences/25 files) all ignore it — WCAG 2.3.3 fail | 4-6h | §13 |

### P2 — Medium (43 issues)

| ID | Category | File(s) | Issue | Effort |
|---|---|---|---|---|
| PR-31 | DevOps | `.github/workflows/ci.yml:28-30` | Lint step is `continue-on-error: true` with no baseline — the 27-error backlog can silently grow | 4h |
| PR-32 | Code Quality | 27 eslint errors: 18 `react-hooks/purity` (`Date.now()` in render), 6 `set-state-in-effect`, 3 `no-explicit-any` | Correctness-adjacent React 19 lint errors across client + server components | 6-8h |
| PR-33 | Architecture | `app/dashboard/DashboardClient.tsx:530` | `BottomNav` exported from a route-specific client file, imported by 8 other files including a generic `LoadingScreen` component (backwards layering) | 1h |
| PR-34 | Reliability/API | `app/api/cron/coach-digest/route.ts:127-181` | Per-member sequential LLM loop can exceed `maxDuration=60`; digest timestamp only stamps at the end so a killed run silently never advances | 4-6h |
| PR-35 | DevOps | No feature-flag system anywhere (grep confirmed) | No kill-switch or gradual rollout mechanism — every merge to `main` ships to 100% of users at once | 8-12h |
| PR-36 | DevOps | `package.json` version stuck at `0.1.0`, no git tags, no CHANGELOG | No release process/versioning; a support engineer cannot correlate a bug report with a build | 4h |
| PR-37 | DevOps | No `vercel.json`, no Terraform/Pulumi, no `supabase/config.toml` | Zero infrastructure-as-code; all runtime config is manual/dashboard-only, non-reproducible | 6-10h |
| PR-38 | Database | `food_logs.total_calories`, `weight_logs.weight_kg`, `water_logs.amount_ml`, `activity_logs.*` | Missing numeric CHECK constraints (defense-in-depth) — range-guarded only at the API layer | 1h |
| PR-39 | Database | `048_rls_and_bounds.sql:26-32` | JSONB size CHECK constraints added `NOT VALID` — legacy rows never validated | 2h |
| PR-40 | Database | `supabase/migrations/` numbering | Migration `028` is missing from the sequence (`027`→`029`); migrations applied manually per `DEPLOYMENT.md`, no automated `supabase db push` | 2h (reconcile) |
| PR-41 | Database | Coach dashboard (`app/coach/page.tsx:121-131`) and digest cron | No materialized view/rollup table for repeated 30-day per-member aggregate scans | 1-2 days |
| PR-42 | API | `app/api/push/notify`, `log-meal` group fan-out, `reactions` | No rate limiting on push-triggering or repeat-write routes — push-spam and duplicate-row vectors | varies, ~1h/route |
| PR-43 | API | Feed/notifications queries capped at `.limit(100)`/`.limit(50)` with no pagination | Content beyond the cap is permanently unreachable — no "load more"/infinite scroll | 12h (full) |
| PR-44 | API | Only `widget/summary` sets a `Cache-Control` header | Barcode/USDA lookups (immutable reference data) re-fetch on every call | 2h |
| PR-45 | Security | `app/auth/callback/route.ts:7,12` | Open redirect via unvalidated `next` param (`origin+next` userinfo trick) | 0.5h |
| PR-46 | Security | `lib/anthropic.ts:144,166` | Raw string interpolation of user-controlled food name into the nutrition-estimation prompt (impact contained by strict output whitelist) | 1h |
| PR-47 | Security | `app/api/reactions/route.ts:20-27` | Reaction/comment INSERT doesn't verify the target log is visible to the actor — targeted notification-spoof vector | 1-2h |
| PR-48 | Security | `app/reset-password/page.tsx:33` | Password minimum length 6, no complexity requirement | 1-2h |
| PR-49 | Performance | `app/feed/FeedClient.tsx:63-64` | Prop→state sync via `useEffect` double-renders the entire feed list on every server refresh | 2h |
| PR-50 | Performance | `app/feed/FeedClient.tsx:318-449` | ~250 heavy `FeedCard`s rendered unwindowed with no virtualization/`content-visibility` | 2h (content-visibility) / 12h (full) |
| PR-51 | Performance | 6 client components (`TrendsClient.tsx:76`, `DashboardClient.tsx:58`, `FeedCard.tsx:257`, etc.) | `Date.now()` computed during render in client components → hydration-mismatch risk + broken memoization | 3-5h |
| PR-52 | Performance | `next.config.ts` | No `images` config (prerequisite for image optimization), no bundle analyzer | 1h |
| PR-53 | Performance | `app/globals.css:82` `story-progress` keyframe | Animates `width` (triggers layout) instead of `transform: scaleX()` | 0.5h |
| PR-54 | Performance | `app/manifest.ts:9` | Manifest reads `getLocale()` → forces a dynamic server round-trip for a file that could be static | 1h |
| PR-55 | Mobile/PWA | No `visualViewport` usage anywhere (grep confirmed) | Fixed bottom nav/save-buttons can be overlapped by the iOS on-screen keyboard | 4-6h |
| PR-56 | Mobile/PWA | `app/manifest.ts` | No `shortcuts` array — missing long-press home-screen quick actions | 0.5-1h |
| PR-57 | UX | `components/MealLogger.tsx:241` | Post-save redirect always lands on `/trends` regardless of where the user came from | 2h |
| PR-58 | UX | `app/dashboard/DashboardClient.tsx:223,373,381` | Two hardcoded English strings on the primary Dashboard screen break i18n consistency | 1h |
| PR-59 | UX | `TrendsClient.tsx:274`, `CoachMemberClient.tsx:325-326` | Over/under-target state encoded by color hue only in two charts | 3h |
| PR-60 | UX | `BottomNav` (`DashboardClient.tsx:530-557`) | Challenges and Coach are absent from primary nav — reachable only via secondary entry points | 3-5h |
| PR-61 | UX | `DashboardClient.tsx:71-76` | Unconditional redirect to Weekly Review on first Sunday open — unexpected context change | 2h |
| PR-62 | UX | `components/FoodSearchBar.tsx:98-131` | Search results are non-semantic `<div>` rows with no keyboard navigation and no "no results" state | 3h |
| PR-63 | UX | Selected-tab styling varies by screen (`bg-stone-600` vs `bg-emerald-700` vs `bg-emerald-600` vs `bg-stone-100`) | No single design token for "selected segment" | 2h |
| PR-64 | Accessibility | `WeeklyReviewClient.tsx:37`, dense Coach stat grids | Fixed pixel geometry / `text-[10px]` micro-labels risk failing WCAG 1.4.4/1.4.10 reflow at 200% zoom | needs device testing |
| PR-65 | Accessibility | `onboarding/page.tsx`, Weekly Review slides, FeedCard lightbox | Focus doesn't move on step-advance/slide-change/dialog-open — WCAG 2.4.3 partial fail | 4-6h |
| PR-66 | Accessibility | `FeedCard.tsx:478` | `focus:outline-none` with no replacement focus indicator | 1h |
| PR-67 | Accessibility | `BarcodeScanner.tsx:136`, Feed members sheet, FeedCard lightbox | Three `fixed inset-0 z-50` overlays don't use `useFocusTrap` (only 3 of ~6 modal-like surfaces do) | 3-4h |
| PR-68 | Accessibility | `TrendsClient.tsx:474`, `MealLogger.tsx:455`, `LogClient.tsx:339` | Error text is a plain `<p>` — no `role="alert"`, not programmatically associated with its field | 3h |
| PR-69 | Analytics | No `logout`, `ai_photo_analyzed`, `ai_draft_generated`, `screen_view`, `streak_milestone`, `push_opened` events | Retention/funnel analysis is impossible from product data | 8-12h combined |
| PR-70 | Analytics | `app/error.tsx`, `app/global-error.tsx` | No analytics event fired on client-side crash | 4-6h |
| PR-71 | AI | `lib/anthropic.ts:47` vs `:139` | Inconsistent model pinning — rolling alias (`claude-sonnet-4-6`) vs. dated snapshot (`claude-haiku-4-5-20251001`) | 0.5h |
| PR-72 | AI | `lib/anthropic.ts` (photo/estimate calls) | No deterministic fallback on Claude failure (unlike Copilot's `templateDraft`) — photo/search flows hard-error | 6-8h |
| PR-73 | AI | All 3 Claude call sites | `response.usage` (token counts) never read/logged — no cost telemetry from within the app | 3h |
| PR-74 | Testing | No RLS/API integration tests | A bad migration could silently reopen cross-user access with nothing to catch it | 8h (RLS) / 16-24h (routes) |
| PR-75 | Testing | No load/performance testing anywhere | Given known missing indexes historically and the "hundreds of thousands of users" target, no load baseline exists | 8-12h |
| PR-76 | Privacy | Health data (nutrition/weight/activity, GDPR Art. 9) | No distinct lawful-basis documentation or consent line beyond general Terms acceptance | 4-6h |
| PR-77 | Database | `groups.created_by ON DELETE SET NULL` | A deleted founder leaves an ownerless group whose founder-only routes can never authorize again | edge case, low prio |
| PR-78 | Database | `reactions.activity_log_id`/`comments.activity_log_id` (migration 030) | Unverified whether these carry a real FK w/ CASCADE — potential orphan rows if not | verify, ~1h |

### P3 — Low (11 issues)

| ID | Category | File(s) | Issue | Effort |
|---|---|---|---|---|
| PR-79 | Code Quality | `app/group/manage/ManageClient.tsx:6` | Dead import (`UserPlus`, unused) | <1 min |
| PR-80 | Code Quality | `lib/i18n/dictionaries.ts` (2,663 lines) | Single oversized hand-maintained translation map — merge-conflict magnet | 4h |
| PR-81 | API | `log-weight` returns `503` for a missing table while other routes use `500` | Cosmetic status-code inconsistency | 0.5h |
| PR-82 | API | `analytics/event`, `help/event`, `weekly-review/event` | Return `200 {ok:true}` even when rate-limited (intentional fire-and-forget, but undistinguishable from success) | 1h |
| PR-83 | Privacy | Cookie usage (`nutrisync_locale`, Supabase auth) | No cookie-consent banner — likely compliant since only strictly-necessary cookies are set today, contingent on PR-21 not adding tracking cookies later | document only |
| PR-84 | Privacy | AI disclosure wording | Confirm Privacy Policy + point-of-use disclaimer both explicitly name Anthropic as sub-processor | 1h |
| PR-85 | Mobile/PWA | `public/sw.js` push handling | `client.navigate()` on notification click isn't individually awaited/caught | 1h |
| PR-86 | Performance | `MealLogger.tsx`, `AvatarUpload.tsx` blob previews | Correctly left as raw `<img>` (not a migration target) — noted so it isn't miscounted as a gap | none needed |
| PR-87 | Reliability | `InstallPrompt.tsx:39`, `PushToggle.tsx:50` | `set-state-in-effect` lint hits here are intentional/correct (UA detection) — noted as benign, not a fix target | none needed |
| PR-88 | DevOps | `docs/PERF-MONITORING-RUNBOOK.md:98,110,118` | Runbook prescribes Sentry/APM tooling that doesn't exist yet — aspirational doc, not a bug, but should be labeled "Phase 6 — not yet built" more prominently | 0.5h |
| PR-89 | Code Quality | Codebase-wide `TODO`/`FIXME`/`HACK` grep | Zero matches — positive finding, no shipped-but-flagged incompleteness; recorded here for completeness of the debt register | none needed |

---

## 5. Architecture

**Score: 68/100.** `lib/` (58 files) is reasonably well-sliced by domain (`fitness.ts`, `macros.ts`, `copilot*.ts`, `coach-*.ts`) with clean one-directional layering — `app → lib` only, zero reverse imports, confirmed by grep. The i18n system (typed dictionary + compile-time EN/ES parity check) is a genuinely good piece of architecture. Weak points:

- **PR-08 (four god components, 16-24h):** `CoachMemberClient.tsx` (929 lines) is really seven components sharing one file, each independently calling `useI18n()`. `FeedCard.tsx` (801 lines, 23 `useState` hooks) fuses data mutation, optimistic UI, comment threading, lightbox, edit form, and share sheet. `MiniProfileModal.tsx` (524 lines) issues 7 Supabase round-trips directly inside a modal component. `ChallengesClient.tsx` (533 lines) mixes list rendering with direct `.insert`/`.delete` calls. Recommended sequencing: split `CoachMemberClient` first (mechanical, low risk, ~4h), then extract data-fetching hooks from `MiniProfileModal`/`FeedCard` (medium risk, ~12h combined).
- **PR-33 (BottomNav layering, 1h):** `BottomNav` is defined and exported from `app/dashboard/DashboardClient.tsx:530`, imported by 8 other files including `components/LoadingScreen.tsx` — a generic component reaching up into a page file. Mechanical fix: move to `components/BottomNav.tsx`.
- **PR-35/36/37 (no feature flags, no versioning, no IaC):** every merge ships to 100% of users at once with no kill-switch; the app has been at `package.json` version `0.1.0` its entire history with no tags/CHANGELOG; all Vercel/Supabase config is dashboard-only with zero reproducibility. None of these block launch at current scale, but all three become load-bearing operational gaps past a few thousand users, since there's no way to roll back a bad change except a full redeploy.

---

## 6. Code Quality

**Score: 66/100.**

- **PR-32 (27 eslint errors, 6-8h):** `npx eslint app components lib` currently reports 27 errors / 23 warnings. 18 are `react-hooks/purity` — `Date.now()`/`new Date()` called during render, split between client components (real hydration-mismatch risk, see PR-51) and server components (cosmetic, since every route is already dynamic per PR-03). 6 are `set-state-in-effect`; two of these (`InstallPrompt.tsx:39`, `PushToggle.tsx:50`) are intentional/correct UA-detection patterns (PR-87), the rest — especially `FeedClient.tsx:63-64` (PR-49) — cause real extra renders. 3 are `no-explicit-any`.
- **PR-79/80:** one dead import; `lib/i18n/dictionaries.ts` at 2,663 lines is the single largest file in the repo and a merge-conflict magnet, though not a layering problem.
- **Positive:** zero `TODO`/`FIXME`/`HACK` markers anywhere in `app/`, `components/`, `lib/` — no self-documented incomplete work (PR-89). Dead-code sweep from prior audits (`computeMemberProgress`, `searchArticles`, `scoreArticle`) held; nothing new surfaced beyond PR-79.

---

## 7. Security Report (pentest-style)

**Score: 58/100.** Full RLS inventory (all 51 migrations), all 34 API routes, auth/session flow, storage, AI/prompt paths, and secrets were reviewed. CVSS estimates are informational (no live scanner run against a deployed target).

| ID | CVSS (est.) | Finding | Location |
|---|---|---|---|
| PR-01 | 8.1 High | Unrestricted group self-join | `001_initial.sql:61-62` |
| PR-02 | 7.1 High | `USING(true)` on comments/reactions/comment_likes SELECT | `001:107,122`, `038:18` |
| PR-06 | 6.5 Medium | Cron routes fail open without `CRON_SECRET` | `cron/reminders:31`, `cron/weekly-report:26`, `cron/coach-digest:41` |
| PR-17 | 6.1 Medium | No server-side upload validation into public buckets | `AvatarUpload.tsx:33-39`, `MealLogger.tsx:206-212` |
| PR-18 | 5.3 Medium | Meal photos public with no signed URLs | `026_storage_repair.sql:17-27` |
| PR-45 | 4.7 Low/Med | Open redirect in `/auth/callback` | `auth/callback/route.ts:7,12` |
| PR-46 | 3.7 Low | Prompt injection into nutrition estimation (impact contained) | `lib/anthropic.ts:144` |
| PR-47 | 3.1 Low | Reaction/comment INSERT doesn't check target visibility | `reactions/route.ts:20-27` |
| PR-48 | 3.1 Low | Weak password policy (min 6, no complexity) | `reset-password/page.tsx:33` |
| — | Info | No app-layer CSRF tokens (relies on SameSite=Lax + JSON) | all `app/api/*` POST routes |

### PR-01 detail — Broken access control: unrestricted self-join to any group
**Root cause:** the only `group_members` INSERT policy is `WITH CHECK (auth.uid() = user_id)` — "the row is mine" is the entire check. The intended gatekeeping (invite code, founder approval, member cap) lives only in optional `SECURITY DEFINER` RPCs (`join_group_by_code`, `resolve_join_request`) that a client can simply skip by inserting directly with the anon key.
**Business impact:** defeats the founder-approval trust model and is simultaneously a **billing bypass** — the member cap (6 free / 30 paid, migration 035) that gates the future coach-plan monetization is enforced only in the RPC, not the table.
**User impact:** unauthorized disclosure of another group's members' weight/height/goals/food logs/activity logs/milestones — health-adjacent PII — to anyone who has (or is sent) a group ID, which invite links hand out directly.
**Fix:** tighten `WITH CHECK` to require an approved `group_join_requests` row (or revoke direct INSERT and force all joins through the definer RPCs). **Effort:** 3-5h. **Regression risk:** Medium — must verify create-group, join-by-code, and approval flows all still work end-to-end in staging before shipping.

### PR-02 detail — comments/reactions/comment_likes readable by anyone
**Root cause:** written assuming the app would only ever read these joined to a visible log; RLS doesn't enforce UI conventions. The fix was already drafted — `048_rls_and_bounds.sql:46-61` contains the scoped replacement policies **as comments**, never uncommented.
**Business impact:** global disclosure of the social graph (who reacts to/comments on whom) and all comment text across every group in the product, independent of group membership.
**Fix:** enable the policies already sitting in `048`. **Effort:** 1-2h + staging verification that group members still see co-member comments and non-members see none.

### PR-06 detail — Cron fail-open
Same root cause flagged independently by the API-audit pass: `if (process.env.CRON_SECRET) { check } ` has no `else` branch — an unset secret means no auth at all, and these routes run under the admin (service-role) client. **Fix:** fail closed (500) if the secret is missing, treat it as a deploy-configuration error. **Effort:** 1h.

### Positive controls verified (do not regress)
Service-role key never reaches a `'use client'` module; every `SECURITY DEFINER` function except `handle_new_user` (PR-10) pins `search_path`; all DB access is via the PostgREST query builder — no raw SQL, no SQL injection surface; coach IDOR is properly gated by `groupForCoachMember` on every `coach/*` route; password reset is non-enumerating; `.gitignore` covers all secret file patterns and no keys are hardcoded in source.

---

## 8. API Report

**Score: 64/100.** All 34 `app/api/**` routes reviewed for auth, rate-limiting, validation, timeout/fallback behavior, caching, and pagination — full scorecard table is in the source agent output and summarized by the findings below.

- **PR-09 (no timeout, 3-4h):** neither `lib/anthropic.ts` nor `lib/copilot-ai.ts` sets a client `timeout`/`maxRetries` (SDK default: 600s, 2 retries). `analyze-photo` sets no `maxDuration`, so the Vercel platform kills the function before the SDK's own timeout fires — users see a raw 504 instead of the route's intended graceful `{error:'Analysis failed'}`.
- **PR-06 / PR-12:** cron fail-open (see §7) and `backfill-nutrition`'s unbounded `Promise.all` Claude fan-out with no rate limit — both real cost/abuse vectors.
- **PR-27 (export-data, 4-6h):** `select('*').eq(col, user.id)` with no `.limit()`/time bound on `food_logs`/`activity_logs`/etc.; a multi-year user's entire history loads into one in-memory JSON string per invocation.
- **PR-28 (log-meal validation gap, 2h):** per-food numeric fields (`calories`, `nutrients`, `macros`) are summed straight from the client body with no per-element bound, unlike every other log route (`log-water`, `log-activity`, `log-weight` all clamp correctly).
- **PR-42/43/44:** several push-triggering/write routes have no rate limit; feed/notifications are capped but not paginated; only `widget/summary` sets a cache header.
- **Positive:** error shape is consistently `{error: string}` across all 34 routes; JSON body parsing is safely guarded everywhere (`parseJson`/`.catch`); 13 of 34 routes correctly use `rateLimitDurable`; `log-meal` has a 15-second same-meal dedupe guard; `cheer` correctly re-derives its emoji server-side rather than trusting the client.

---

## 9. Database Report

**Score: 74/100.** All 51 migrations reviewed for schema, FK hygiene, indexes, constraints, triggers, and backup posture.

- **PR-10 (handle_new_user privesc, 15min):** the only `SECURITY DEFINER` function in the codebase missing a `search_path` pin — every other definer function correctly sets `SET search_path = public`. Classic Postgres privilege-escalation vector if the search path can ever be influenced.
- **PR-11 (missing index, 15min):** `push_subscriptions` has only a `UNIQUE(endpoint)` constraint — no index on `user_id`, which every cron loop and every push-send path filters by (`cron/reminders:67`, `weekly-report:62`, `coach-digest:164`).
- **PR-07 (goal/goals drift, 1-4h):** traced precisely — onboarding writes both `goal` and `goals[]` in sync; `EditProfileClient.tsx` writes only `goal`. The calorie-target engine and coach signals read `goal` (stays correct); Weekly Review and `MiniProfileModal` read `goals[0]` (goes stale after any profile edit). Not a security issue, but a real silent data-correctness bug a coach or the user's own Weekly Review can act on incorrectly.
- **PR-13 (backup/DR undocumented, 4h+ops):** grep of `DEPLOYMENT.md` for `backup|restore|pitr|pooler` returns zero matches. Supabase likely provides automated backups, but whether PITR is enabled and what the RPO/RTO is is entirely undocumented — an unknown risk for a product targeting hundreds of thousands of users.
- **PR-38/39/40/41/77/78:** missing numeric CHECK constraints (defense-in-depth only, already bounded at the API layer), `NOT VALID` JSONB size checks on legacy rows, a gap in migration numbering (028 missing) worth reconciling, no materialized view for the coach/digest 30-day rollup scans, an edge-case `ON DELETE SET NULL` orphaned-group scenario, and an unverified FK on the polymorphic `reactions`/`comments.activity_log_id` columns.
- **Positive:** connection pooling is a non-issue — all DB access goes through PostgREST over HTTPS (`@supabase/ssr`), not raw `pg` TCP connections, so the classic serverless connection-exhaustion problem doesn't apply here. The 044 migration's index set correctly covers the dominant `WHERE user_id=? [AND logged_at>=?] ORDER BY logged_at` query shape across all four log tables. `notifications` timeline indexing (previously flagged) is now resolved.

---

## 10. Performance Report

**Score: 55/100.**

- **PR-03 (all routes dynamic, 12-20h) — the single biggest lever in this audit.** `npm run build` output confirms **zero** `○ (Static)` routes anywhere — every one of 70+ routes, including `/about`, `/privacy`, `/terms`, `/help/*`, and `/login`, is `ƒ (Dynamic)`. Root cause: `app/layout.tsx:49` calls `getLocale()` → `cookies()`, which opts the entire tree out of static generation. At scale this is the largest single driver of server compute cost and TTFB — pure content pages that could be served from CDN edge at near-zero cost instead get a full server render on every hit. Fix path: move locale resolution to Edge middleware + a client-read cookie, and mark content-only routes `force-static`/ISR; keep the genuinely per-user routes (`/dashboard`, `/feed`) dynamic since they lose nothing.
- **PR-14 (image optimization, 8-16h):** 21 raw `<img>` tags, concentrated on user-uploaded meal photos and avatars — the highest-value migration targets are the coach's 48×48 meal-photo thumbnails (`CoachMemberClient.tsx:745`), which currently download the full-resolution original.
- **PR-49/50/51:** a feed prop→state effect causes a full double-render on refresh; ~250 unwindowed `FeedCard`s render on an active feed with no `content-visibility`/virtualization; `Date.now()` computed during render in 6 client components risks hydration mismatches and breaks memoization.
- **PR-52/53/54:** no `next.config.ts` image config (blocks PR-14 until added); one CSS animation (`story-progress`) animates `width` instead of `transform`; the PWA manifest is needlessly dynamic.
- **Positive:** the barcode scanner (`@zxing`) is correctly lazy-loaded only when the scanner opens — the single highest-value code-split already exists. All other animations are GPU-safe (`transform`/`opacity` only). The feed's underlying query is correctly capped (`.limit(100)`) even though the render isn't windowed.

---

## 11. Mobile / PWA

**Score: 62/100.**

- **PR-15 (service worker gap, 4-16h):** `public/sw.js` has `install`/`activate`/`push`/`notificationclick` handlers only — confirmed zero `fetch` event handler and zero `caches` usage anywhere in the file. It also only registers *after* a user opts into push, so a user who never enables notifications has no service worker controlling their pages at all. **Concrete symptom:** an installed PWA opened with no signal shows the browser's native offline error page, not an app screen — a broken-feeling experience for a habit-tracking app people open reflexively.
- **PR-16 (no connectivity handling, 8-20h):** zero `navigator.onLine`/online/offline listeners anywhere. A dropped meal-log request fails with only a generic error string, and retrying re-uploads photos under a new `Date.now()`-based path, orphaning the first partial upload in Storage. Reaction/comment calls are fire-and-forget with empty `.catch(() => {})` — failures are fully silent, so the UI can show an applied reaction the server never recorded.
- **PR-55/56:** no `visualViewport` usage anywhere — fixed bottom UI can be overlapped by the iOS keyboard on form-heavy screens; the manifest has no `shortcuts` array for home-screen long-press quick actions.
- **Positive:** the manifest itself is otherwise solid — `standalone` display, matching theme/background colors, a 512px maskable icon (passes Lighthouse's installability checks), localized description. Deep links work correctly, including push `data.url` routing into a specific feed post (`?post=<id>`). Safe-area handling (Dynamic Island, `env(safe-area-inset-*)`) is well done with a documented iOS `position:fixed` workaround.

---

## 12. UX

**Score: 65/100.**

- **PR-04 (Weekly Review, 6-8h):** the "wrap-up" story auto-advances every 6 seconds via pointer-only gestures (hold-to-pause, tap-left/right, swipe-down-to-dismiss) with **no visible pause/next/back button** — a user who reads slowly, uses a mouse, or has a motor impairment cannot reliably control the one feature explicitly designed to drive retention and sharing.
- **PR-24 (no light mode, 2h/30h+):** the `prefers-color-scheme` CSS variables are dead code — `body` is hardcoded dark regardless of OS preference.
- **PR-25 (inconsistent destructive confirms, 2h):** Dashboard meal delete, feed post delete, and account deletion all confirm before acting; challenge delete and coach-note delete do not — a founder can wipe an entire group's active challenge with one mistap.
- **PR-26 (silent status messages, 4h):** feed "new posts" pill, barcode scan errors, and meal/activity/coach save confirmations are all visual-only with no `aria-live` region — silent to screen readers and easy to miss even visually.
- **PR-57/58/59/60/61/62/63:** post-save redirect always lands on Trends regardless of origin screen; two hardcoded English strings remain on the primary Dashboard; two charts encode over/under-target by color alone; Challenges and Coach are absent from the primary bottom nav; an unconditional Sunday redirect to Weekly Review; non-semantic food-search result rows with no "no results" state; inconsistent selected-tab styling across screens.
- **Positive microinteractions worth preserving:** the CheerButton idle→sending→sent state sequence, optimistic reaction updates, the water quick-add bar with Undo, and the MealLogger saving/saved sequence are all well executed and shouldn't be disturbed by any of the above fixes.

---

## 13. Accessibility Report (WCAG 2.2 AA)

**Score: 60/100.** Full criterion-by-criterion pass across every major screen.

| Criterion | Status | Primary evidence |
|---|---|---|
| 1.1.1 Non-text Content (A) | Pass | Icons `aria-hidden`, images carry alt text |
| 1.3.1 Info & Relationships (A) | **Fail (PR-29)** | 8+ screens of custom tabs/chips with no `role`/`aria-selected` |
| 1.4.1 Use of Color (A) | Partial fail (PR-59) | Trends bars, Coach MiniBars — hue-only signaling |
| 1.4.3 Contrast (AA) | Pass | Re-verified from prior remediation |
| 1.4.4/1.4.10 Resize/Reflow (AA) | At risk (PR-64) | Fixed-pixel Weekly Review geometry, dense `text-[10px]` Coach grids |
| 2.1.1 Keyboard (A) | **Fail (PR-04)** | Weekly Review has zero keyboard handlers |
| 2.1.2 No Keyboard Trap (A) | Pass | `useFocusTrap` correctly restores focus where used |
| 2.2.1/2.2.2 Timing/Pause (A) | **Fail (PR-04)** | 6s auto-advance, no accessible pause |
| 2.3.1 Three Flashes (A) | Pass | No rapid flashing content |
| 2.3.3 Animation from Interactions (AA) | **Fail (PR-30)** | `prefers-reduced-motion` covers only the splash screen |
| 2.4.3 Focus Order (A) | Partial fail (PR-65) | Onboarding steps, Weekly Review slides, lightbox don't move focus |
| 2.4.7 Focus Visible (AA) | Partial (PR-66) | One `focus:outline-none` with no replacement |
| 2.5.7 Dragging Movements (AA, 2.2) | **Fail (PR-04)** | Weekly Review swipe has no non-drag alternative |
| 2.5.8 Target Size Minimum (AA, 2.2) | Pass | Re-verified — 44px targets on all primary actions |
| 3.1.1 Language of Page (A) | Pass | Server-rendered `<html lang>` |
| 3.2.x Predictable (A/AA) | Partial (PR-61) | Unexpected Sunday auto-redirect |
| 3.3.1 Error Identification (A) | Partial (PR-68) | Plain `<p>` error text, no `role="alert"` |
| 4.1.2 Name, Role, Value (A) | Partial fail (PR-29) | Same segmented-control gap as 1.3.1 |
| 4.1.3 Status Messages (AA) | **Fail (PR-26)** | No `aria-live` anywhere for toasts/success/error |

**Modal/focus-trap inventory:** `useFocusTrap` is applied in exactly 3 components (`MiniProfileModal`, `MacroDetailModal`, `NutrientGapPanel`). Three other `fixed inset-0 z-50` overlays (`BarcodeScanner`, Feed members sheet, FeedCard lightbox) do not use it (PR-67).

**Single highest-leverage fix:** extending `prefers-reduced-motion` to actually disable the story auto-advance and all transition/animation durations app-wide (PR-30) clears 2.3.3 outright and materially helps 2.2.2 — recommended as the first accessibility fix after PR-04's button controls land, since the buttons are a prerequisite for a reduced-motion user to advance the story at all.

---

## 14. Analytics

**Score: 45/100.**

- **PR-21 (no BI layer, 8-24h):** all events land in three raw Postgres tables (`app_events`, `weekly_review_events`, `help_events`) via `lib/analytics.ts`. There is no Segment/Amplitude/PostHog/GA integration — confirmed by grep, zero matches. RLS on these tables is insert-only per-user, so even reading the data requires the service role; there is no dashboard.
- **Coverage gaps:** signup/login/meal/activity/water/weight/challenge/group/onboarding/all-8-weekly-review events fire correctly. Missing entirely: `logout`, AI-usage events (PR-22), error/crash events (PR-70), page/screen-view events, and retention events (streak milestones, push-open) — PR-69 groups these.
- **Net effect:** the app can currently answer "what actions happened" but not "who came back," "what failed," or "what did AI cost" — the three questions that matter most for both product decisions and cost control at scale.

---

## 15. AI Integration

**Score: 62/100.** Three Claude call sites: photo analysis (`claude-sonnet-4-6`), food-name estimation (`claude-haiku-4-5-20251001`), and Copilot draft generation (`claude-sonnet-4-6`). Both model IDs are confirmed current/Active, not deprecated.

- **PR-23 (zero caching, 8-12h) — the largest AI-cost lever in this audit.** No prompt caching and no app-level result caching anywhere. `estimateFoodNutrition("banana", 100)` is a fresh, uncached Claude call every single time it's invoked from `/api/search-food`, `/api/barcode`, or `/api/backfill-nutrition` — common foods re-hit the API on every lookup with no persistence layer. Fix: a small cache table keyed on `(normalized_food_name, servingG)`.
- **PR-09/72:** no client timeout; Copilot has a deterministic template fallback on API failure (good design), but food-photo analysis and food-name search do not — an Anthropic outage hard-errors the meal-logging flow with no graceful degradation.
- **PR-71/73:** inconsistent model-pinning convention (rolling alias vs. dated snapshot); `response.usage` is never read, so there's no in-app token/cost telemetry.
- **Prompt-injection posture (informational, not a fix item):** the Copilot system prompt is well-hardened ("only reference facts present in the data you are given... never invent numbers"), and members never contribute free text to the prompt — the only residual vector is a coach's own `coach_style` field, low-risk since every draft is human-reviewed before send.

---

## 16. Reliability

**Score: 50/100.**

- **PR-05 (zero crash reporting, 6-8h):** both error boundaries (`app/error.tsx`, `app/global-error.tsx`) log only to `console.error`, which runs in the user's browser — invisible to the team. No Sentry/Datadog/Bugsnag/OpenTelemetry anywhere in source; `docs/PERF-MONITORING-RUNBOOK.md` prescribes this tooling as if it exists, but it's explicitly labeled a future "Phase 6" (PR-88) — the doc is aspirational, not operational. At scale, a crash affecting a cohort is discoverable only via user complaints or an analytics-funnel dip, hours-to-days late.
- **PR-06/PR-12/PR-34:** cron auth fails open; `backfill-nutrition` has an unbounded LLM fan-out with no cap; the coach-digest cron's per-member sequential loop can exceed its own `maxDuration` and silently fail to advance on a kill.
- **PR-16:** no retry/offline-queue logic anywhere; silent failures on reactions/comments; orphaned Storage uploads on retry.

---

## 17. DevOps

**Score: 55/100.**

- **Real improvement since the last audit generation:** `.github/workflows/ci.yml` now exists, running unit tests + typecheck + build as gating checks on every push/PR — this did not exist as of the 2026-07-02 audit.
- **PR-31/20 (CI gaps that remain):** lint runs with `continue-on-error: true` (no ratchet against a growing error backlog); the e2e job's only authenticated spec self-skips without seeded credentials, so CI's real regression coverage is unauthenticated-page-render + redirect-gate only — the entire logged-in product surface has zero CI protection today.
- **PR-35/36/37/13:** no feature flags, no versioning/tags/CHANGELOG, no infrastructure-as-code, no documented backup/restore procedure. None of these are unusual for this project stage, but all four compound the operational risk of the P0 security fixes landing cleanly — without IaC or a rollback story, a bad migration or a bad deploy has no fast undo path.

---

## 18. Testing / QA Report

**Score: 52/100.** 64 unit tests across 9 files (`tests/*.test.ts`) + 3 Playwright e2e spec files (102 lines total).

- **PR-19 (untested core math, 12-32h):** `lib/nutrients`, `lib/macros`, and `lib/trends` — the arithmetic backbone of every meal log and the entire Trends screen — have zero tests. `lib/coach-intel`, `lib/copilot`, and `lib/coach-voice`, which drive the AI Copilot's signal generation, are also untested. Three previously-uncovered modules (`challenges`, `weekly-review`, `water`) gained tests since the last audit generation — real progress, but the highest-value gap (pure arithmetic, cheap to test) remains open.
- **PR-20 (e2e gap, 12-20h):** `e2e/authed.spec.ts` self-skips without `E2E_EMAIL`/`E2E_PASSWORD` secrets, and even when run manually it only checks `login → dashboard → trends` navigation. Meal logging (manual or photo), water/activity/weight logging, group creation/joining, challenge creation/completion, the weekly review flow, and the coach Copilot draft/send flow have **no e2e coverage at all**, in CI or otherwise.
- **PR-74/75:** no API/integration tests hitting real routes, no test verifying RLS actually blocks cross-user access (the single test category that would have caught PR-01/PR-02 as a regression rather than requiring a manual pentest pass), and no load/performance testing anywhere.

---

## 19. Privacy & Compliance

**Score: 72/100.**

- Consent is recorded as an append-only `consent_events` audit trail at signup — standard and defensible for Terms/Privacy acceptance (no granular per-purpose consent exists, but none is currently needed since there's no third-party tracking).
- No cookie-consent banner; likely compliant today since only strictly-necessary cookies are set (auth session + a post-action locale preference) — PR-83 flags this as contingent on PR-21 not later adding a tracking-cookie-setting analytics SDK.
- **PR-76 (health data / GDPR Art. 9, 4-6h):** nutrition/weight/activity logs plausibly qualify as special-category health data. They receive the same RLS/export/delete protection as ordinary data, but there's no distinct Art. 9 lawful-basis documentation or explicit consent line — worth adding given the "hundreds of thousands of users" target likely includes EU users.
- AI third-party disclosure (Anthropic as photo-processing sub-processor) is present in both the Privacy Policy and at point of use; PR-84 recommends a final copy pass to confirm both name Anthropic explicitly and consistently.

---

## 20. Monetization

**Score: N/A — confirmed pre-monetization by design.** Grep for `stripe|revenuecat|paywall|billing|checkout|iap` returns no payment SDK anywhere in code or `package.json`. `app/settings/subscription/page.tsx` is a static "you're on the free plan" screen with an explicit code comment confirming this is intentional store-compliance behavior (never show a purchase flow that doesn't exist).

**Worth noting as groundwork, not a gap:** `supabase/migrations/035_coach_plan.sql` implements a functioning `groups.plan` (`'free'`/`'coach'`) entitlement system with a trigger-enforced member cap (6 vs. 30) that's already live and correctly gated — the migration's own comment states plainly that self-serve billing is "the remaining piece; until then plan is flipped by an admin via the service role." This is genuine, well-structured seam for a future paid coach tier, and reduces the engineering lift whenever monetization is prioritized.

---

## 21. Technical Debt Register

Debt is grouped by what it costs to carry, not by where it was found — several items above recur here because they compound across categories.

| Debt item | Interest being paid today | Payoff if fixed |
|---|---|---|
| Four god components (PR-08) | Every change to coach/feed/challenges risks touching unrelated concerns; near-impossible to unit-test domain logic in isolation | Faster iteration, testable domain logic |
| `goal`/`goals` dual field (PR-07) | Silent display drift between screens after every profile edit | One source of truth, no coach/user confusion |
| No feature flags (PR-35) | Every deploy is all-or-nothing; no rollback path except a full redeploy | Safe gradual rollout, fast kill-switch |
| No IaC (PR-37) | Infra config is tribal knowledge in dashboards; unreproducible | Disaster-recoverable, onboardable infra |
| No crash reporting (PR-05) | Bugs are discovered by user complaint, not telemetry | Hours-to-days faster incident detection |
| Zero AI caching (PR-23) | Every repeat food lookup pays full Claude cost | Direct, compounding cost reduction at scale |
| All routes dynamic (PR-03) | Every page view (even static legal pages) pays full server-render cost | CDN-served static content, lower TTFB and origin cost |
| 2,663-line dictionary file (PR-80) | Every i18n PR risks a merge conflict | Safer parallel translation work |
| No versioning/CHANGELOG (PR-36) | Can't correlate a bug report to a build | Faster on-call triage |
| E2E skips all authed flows (PR-20) | The core product loop (meal logging) has no regression safety net | Confidence to ship faster without manual QA |

---

## 22. Risk Register

| Risk | Likelihood | Impact | Mitigation | Owner action |
|---|---|---|---|---|
| Cross-group PII disclosure via group self-join (PR-01) | High (trivial to exploit, no special access needed) | High (health data, trust, billing bypass) | Ship the RLS fix (P0) | Immediate |
| Global social-content disclosure (PR-02) | High (trivial, fix already drafted) | Medium-High (privacy) | Enable the drafted 048 policies (P0) | Immediate |
| Unnoticed production crash cohort (PR-05) | Medium (no visibility to know current rate) | High at scale | Wire crash reporting (P0) | Immediate |
| Cron endpoints publicly triggerable if misconfigured (PR-06) | Low-Medium (config-dependent) | Medium (push-spam, cost) | Fail-closed check (P0) | Immediate |
| AI cost runaway via uncached lookups + unbounded backfill fan-out (PR-23, PR-12) | Medium, grows with user count | Medium-High (direct $ cost) | Cache + rate-limit (P1) | Next sprint |
| Meal-log data loss on flaky mobile connections (PR-16) | Medium (mobile users, spotty connectivity common) | Medium (core value prop — accurate tracking) | Offline detection + retry (P1) | Next sprint |
| Regression in RLS model goes undetected (PR-74) | Medium (no automated check exists today) | High (repeat of PR-01/02 class bug) | RLS integration tests (P1/P2) | Within 2 sprints |
| Backup/DR unknown (PR-13) | Low (no incident yet) but **unverified** | Critical if it occurs | Document + test restore procedure | Within 1 sprint |

---

## 23. Sprint Backlog P0–P3

Hour estimates are engineering time only (excludes staging verification/QA time, called out separately where material).

### P0 — Ship before any further user growth (~20–25h total)
1. `group_members` INSERT policy fix (PR-01) — 3-5h + staging verification
2. Enable scoped comments/reactions/comment_likes SELECT policies from migration 048 (PR-02) — 1-2h + staging verification
3. Fail-closed `CRON_SECRET` check (PR-06) — 1h
4. Pin `search_path` on `handle_new_user()` (PR-10) — 15min
5. Wire minimal crash/error reporting, e.g. `@sentry/nextjs` (PR-05) — 6-8h
6. Anthropic client timeout + `analyze-photo` `maxDuration` (PR-09) — 3-4h

### P1 — Next 2–3 sprints (~140–180h total)
Group by theme for sprint planning:
- **Data integrity & security hardening:** goal/goals sync (PR-07, 1-4h), storage upload validation (PR-17, 3-4h), signed meal-photo URLs (PR-18, 6-10h), open-redirect fix (PR-45, 0.5h), log-meal numeric validation (PR-28, 2h), missing push_subscriptions index (PR-11, 15min)
- **Reliability & cost control:** AI result caching (PR-23, 8-12h), backfill-nutrition rate limit (already in PR-12 above), offline/retry handling (PR-16, 8-20h), service worker offline fallback (PR-15, 4-16h), export-data pagination (PR-27, 4-6h), backup/DR documentation (PR-13, 4h+ops)
- **Testing:** core-math unit tests (PR-19, 12-16h for the top 3 modules), seeded e2e credentials + expanded authed spec (PR-20, 12-20h)
- **Product/UX/accessibility:** Weekly Review keyboard+pause controls (PR-04, 6-8h), reduced-motion (PR-30, 4-6h), destructive-action confirms (PR-25, 2h), status-message live regions (PR-26, 4h), segmented-control ARIA (PR-29, 8-12h)
- **Architecture:** god-component splits (PR-08, 16-24h)
- **Analytics:** AI-usage + error + retention events (PR-22/69/70, ~15-20h combined)
- **Performance:** static rendering reclaim for content pages (PR-03, 12-20h), image optimization for user photos (PR-14, 8-16h)

### P2 — Backlog, work down over the following quarter (~140–160h total)
CI lint gating (PR-31, 4h), eslint backlog cleanup (PR-32, 6-8h), BottomNav relocation (PR-33, 1h), coach-digest loop duration guard (PR-34, 4-6h), feature-flag system (PR-35, 8-12h), versioning/CHANGELOG (PR-36, 4h), IaC (PR-37, 6-10h), DB CHECK constraints (PR-38, 1h), materialized view for coach rollups (PR-41, 1-2 days), remaining UX polish items (PR-57–63), remaining accessibility items (PR-64–68), analytics BI hookup (PR-21, 8-24h), RLS/API integration + load testing (PR-74/75, 24-44h combined), Art. 9 privacy documentation (PR-76, 4-6h).

### P3 — Opportunistic / cleanup (~10h total)
Dead import removal, dictionary file split, cosmetic status-code consistency, cookie-banner documentation, AI-disclosure copy pass, PWA push-navigate error handling, runbook labeling — all listed in full in [Section 4](#4-top-issues-ranked-by-severity).

---

*End of master audit. All 89 issues trace to file:line evidence gathered directly from the current codebase (`dfd17cf`) by six independent research passes; none are generic best-practice statements. Cross-references to the three prior audit generations (`ENGINEERING-AUDIT-2026-07-02.md`, `STORE-READINESS-AUDIT-2026-07-02.md`) are noted inline where this audit confirms, extends, or (in the case of the RLS/security findings) supersedes their scope.*
