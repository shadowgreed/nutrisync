# NutriSync — Production Readiness Master Audit (2026-07-15)

**Auditor:** Automated multi-agent sweep (10 parallel specialists) + manual verification of every P0/P1 claim.
**Baseline:** `docs/PRODUCTION-READINESS-MASTER-AUDIT-2026-07-06.md` (89 findings, "PR-NN").
**Tree:** `main` @ `26b66a7`. All file:line references verified against this commit.

> This is a **delta audit**. It re-verifies every prior finding (Fixed / Still-Open / Partial), then adds newly-discovered issues ("NF-NN") — with special scrutiny on the code merged since 07-06 (migration 053 security fixes, the Quick Log feature, the segmented-control unification, and the service-worker notification fix).

---

## 1. Executive Summary

The 07-06 **P0 security block is cleared**: the two critical RLS holes (PR-01 self-join, PR-02 global social read), the cron fail-open (PR-06), and the `search_path` gap (PR-10) are all fixed and verified in migration 053 + `lib/cron-auth.ts`. Several UX/DB items also closed (PR-59, PR-61, PR-63, PR-78). That is real, measurable progress.

**However, three of this session's own recent fixes introduced regressions**, and they are the headline of this audit because they are both new and self-inflicted:

1. **`NF-SEC-1` (P1) — the PR-01 fix opened a narrower re-join hole.** Migration 053's group-join policy trusts a lingering `group_join_requests.status='approved'` row. `remove-member` never clears that row, so an expelled or self-departed member can raw-`INSERT` themselves back into the group (and bypass the member cap). *Introduced by the migration applied this session.*
2. **`NF-PWA-1` (P1) — the PR-85 service-worker fix regressed notification deep-links on iOS.** Replacing `navigate()` with an exact-URL `openWindow()` means `/feed?post=X` never matches an already-open PWA window, so iOS standalone PWAs now open Safari / a second instance instead of navigating in-app. This is the *same "tap a notification, comment isn't there" symptom* reported earlier this session — the fix over-corrected.
3. **`NF-A11Y-1` (P1) — the PR-29/PR-63 segmented-control unification added `role="tablist"` with no keyboard support.** A screen reader now announces a tab widget that doesn't respond to arrow keys, applied to ~8 controls that aren't even tabs. Per the ARIA APG this is worse than the plain buttons it replaced.

Add to that a cluster of **new P0 process gaps in testing** (the arithmetic backbone that computes every calorie/macro/nutrient number remains untested; still zero authenticated e2e coverage in CI, so none of the above regressions would have been caught), and several **new P1/P2 correctness and privacy issues** (goal/goals divergence PR-07 still live; account-deletion doesn't remove storage photos despite the privacy policy promising it does; coach-digest can silently skip coaches and double-send).

**Net:** the launch-blocking *security* posture is much improved, but the app is now shipping regressions faster than the test net can catch them — the single most important theme of this audit is **closing the verification gap (P0 testing) so fixes stop regressing each other.**

## 2. Verdict

### **CONDITIONAL GO — unchanged from 07-06, but the blocker set has shifted from "known vulnerabilities" to "no safety net + self-inflicted regressions."**

Before further user growth, close: the 3 regressions above (all small), the goal/goals + delete-storage correctness/legal issues, and at minimum the arithmetic-backbone unit tests + authenticated e2e in CI (P0 testing). The security fixes from the last sprint are sound; the risk now is that nothing stops the *next* fix from breaking a shipped feature.

## 3. Scorecard (Δ vs 07-06)

| Dimension | 07-06 | 07-15 | Δ | Note |
|---|---|---|---|---|
| Security (RLS/authz) | 40 | 68 | ▲▲ | P0 holes fixed; NF-SEC-1 rejoin + write-IDOR remain |
| API correctness | 62 | 64 | ▲ | cron fixed; error.message leak + log-meal gaps found |
| Client correctness | 65 | 63 | ▼ | new deep-link/optimistic-state bugs; PR-07 still open |
| Database/schema | 70 | 74 | ▲ | PR-78 verified fixed; CHECK/index gaps remain |
| Performance | 58 | 58 | = | no perf work landed; no new regressions |
| Accessibility | 55 | 52 | ▼ | segmented ARIA is *wrong*, not just missing |
| PWA/Reliability | 45 | 47 | ▲/▼ | navigate race fixed but regressed deep-links |
| Testing/CI | 35 | 42 | ▲ | CI now runs vitest+tsc+build; coverage still P0 |
| AI/Analytics | 48 | 49 | ▲ | quick_log event added; cost telemetry still absent |
| Privacy/Compliance | 52 | 50 | ▼ | delete-account storage + app_events retention gaps |

## 4. Delta since 2026-07-06

**Fixed & verified (10):** PR-01, PR-02, PR-06, PR-10, PR-11 (the P0 security sprint), PR-59 (chart hue redundancy), PR-61 (Sunday redirect now once/week), PR-63 (selected-token unified), PR-78 (activity FK+CASCADE confirmed), PR-85 (navigate race removed — *but see NF-PWA-1*).

**Partially fixed:** PR-27 (rate-limit added, scan still unbounded), PR-34 (per-coach timestamp improved, loop still fragile), PR-44 (2 routes now cached, 2 still not), PR-29 (ARIA added but incorrect — NF-A11Y-1/2/3).

**Regressions introduced this session:** NF-SEC-1 (from PR-01 fix), NF-PWA-1 (from PR-85 fix), NF-A11Y-1..4 (from PR-29/PR-63 fix).

**Still open (unchanged):** PR-03, 04, 05, 07, 08, 09, 12, 13, 14, 15, 16, 17, 18, 19, 20, 24, 25, 28, 30, 31, 35, 36, 37, 38, 39, 40, 41, 42, 43, 45, 46, 47, 48, 50, 52, 53, 54, 55, 56, 57, 58, 60, 62, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 80, 83, 84.

---

## 5. Top Issues Ranked by Severity

### P0 — Block further scale-up

| ID | Cat | File(s) | Issue | Fix effort |
|---|---|---|---|---|
| **NF-TEST-1** | Testing | `lib/nutrients.ts`, `lib/macros.ts`, `lib/trends.ts` | The arithmetic that computes every meal's calories/macros/nutrient totals + the entire Trends screen has **zero** dedicated tests. A units bug silently mis-reports health data; `tsc`/build pass. | 0.5d |
| **NF-TEST-2** | Testing | `lib/coach-intel.ts` (32KB), `lib/copilot.ts` | The two largest logic modules driving coach output have zero tests — no safety net for refactor. | 1d |
| **NF-TEST-3** | Testing/CI | `.github/workflows/ci.yml:44-49`, `e2e/authed.spec.ts:11` | CI still self-skips its only authenticated e2e spec (no secrets). **None** of this session's regressions (segmented, sw deep-link, comments) would have been caught. | 1-2d |

### P1 — High (fix before growth)

| ID | Cat | File(s) | Issue | Effort |
|---|---|---|---|---|
| **NF-SEC-1** ⚠️regression | Security | `053_p0_security_fixes.sql:33-38`, `app/api/group/remove-member/route.ts:32-36` | Removed/departed member can re-`INSERT` into `group_members` via a lingering `approved` join-request row; bypasses removal + member cap. The approved-request policy branch is dead code for legit flows (RPCs are SECURITY DEFINER). **Fix: drop that branch.** | 15min |
| **NF-PWA-1** ⚠️regression | PWA | `public/sw.js:43-52` | `client.url === urlToOpen` exact match never matches `/feed?post=X`; iOS standalone PWA opens Safari/2nd instance instead of navigating. **Fix: focus existing same-origin client, `navigate()` it, await; `openWindow` fallback only if none.** | 15min |
| **NF-A11Y-1** ⚠️regression | A11y | `components/Segmented.tsx`, +8 sites | `role="tablist"` with no arrow-key nav / roving tabindex. Announces a tab widget that doesn't work. **Fix: add a `radiogroup` mode (default) + keyboard, reserve `tablist` for true view-switchers.** | 1d |
| **PR-07** | Client/DB | `app/profile/edit/EditProfileClient.tsx:99-110` | `goal` updated, `goals[]` never synced. Weekly Review + MiniProfileModal read `goals[0]` → group sees a stale goal forever. **Fix: `goals: [goal]` in baseUpdate.** | 5min |
| **NF-AI-1** | Privacy/Legal | `app/api/delete-account/route.ts:23` | Account deletion calls only `deleteUser` — **does not remove Storage objects**. Meal/avatar photos persist at public URLs. Privacy policy (`privacy:128`) explicitly promises photos are removed → false statement + GDPR Art.17 failure. | 1h |
| **NF-PWA-2 / API-F4** | Reliability | `app/api/cron/coach-digest/route.ts:75,144,178` | Hour-gated + stamp-at-end: a run exceeding 60s skips remaining coaches (who then miss the day, hour≠8 next tick); a retry re-processes in-flight coaches → duplicate drafts + push. **Fix: claim-at-start + budget guard + date-based gate.** | 3h |
| **NF-API-1** | Security/API | ~15 routes | `error.message` passthrough leaks Postgres/RLS internals (constraint & policy names) to the client. **Fix: generic 500 + server-side log.** | 2-3h |
| **NF-API-2** | API | `app/api/log-meal/route.ts:87,197-204` | The highest-frequency write route has no rate limit and fans out unbounded group push on every insert — spam/cost vector. | 1h |
| **NF-TEST-4** | CI | `ci.yml:28-30` | Lint is `continue-on-error:true` with no baseline; the react-hooks backlog is invisible and grows freely (6 inline suppressions remain). | 2-4h |
| **NF-TEST-5** | DevOps | (no `.env.example`) | Env inventory undocumented; `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` **silently** fall back to a placeholder → a misconfigured deploy renders but every query fails with no startup error. VAPID keys silently no-op push. | 2-3h |

### P2 — Medium (28)

| ID | Cat | File(s) | Issue |
|---|---|---|---|
| NF-SEC-2 (=PR-45) | Security | `app/auth/callback/route.ts:7,12` | Open redirect: `next` unvalidated (`?next=.evil.com` / `@evil.com` go off-site). Fix: require single leading `/`. |
| NF-SEC-3 (=PR-47) | Security | `001_initial.sql:108,123` | reactions/comments INSERT checks only `user_id`, not target visibility → write-IDOR notification-spoof to a stranger via a leaked `food_log_id`. |
| NF-API-3 | API | `log-meal:127-140` | Idempotency is a 15s read-then-write heuristic: concurrent double-tap dupes; two distinct same-calorie meals within 15s silently collapse (data loss). Fix: client idempotency key + unique onConflict. |
| NF-API-4 | API | `push/notify:40-46` | reply path trusts client `targetUserId`; group-gated but spoofable "X replied to you" spam; no rate limit. |
| NF-API-5 | API | `export-data:24-65` | 10 parallel unbounded `select('*')` + full pretty-printed `JSON.stringify` → OOM/timeout vector (PR-27 amplified). |
| NF-CLIENT-1 | Client | `app/feed/FeedClient.tsx:134-142` | Deep-link scroll effect deps `[targetPost, entries, activityList]` + `targetPost` never cleared → **re-scrolls & re-flashes to the deep-linked post on every like/comment**. Feed unusable after a deep-link until reload. |
| NF-CLIENT-2 | Client | `FeedClient.tsx:68-83` | Optimistic comment-like has no rollback + unhandled rejection on failure → like count permanently wrong vs server. |
| NF-CLIENT-3 (=NF-A11Y regr.) | Client/UX | `components/Segmented.tsx:39,50`, `FeedCard.tsx:433` | `fill` variant lacks `min-w-0`/`truncate`; the meal-tag editor (was `grid-cols-4`) overflows at 320px with Spanish labels (Desayuno/Almuerzo). |
| NF-A11Y-2 | A11y | migrated sites | `role="tab"` with no `aria-controls`/`tabpanel` relationship. |
| NF-A11Y-3 | A11y | unit toggles, privacy, tone chips, intensity, challenge-length, meal-tag | Tab semantics on value-pickers (should be `radiogroup`); tone chips are a wrapping cloud mislabeled `tablist`. |
| NF-A11Y-4 | A11y | `Segmented.tsx:42` | Buttons omit `type="button"` → default `submit` inside any `<form>` (latent submit bug + WCAG 3.2.2). Fix: 5min. |
| NF-A11Y-5 | A11y | `FeedCard.tsx:72-83` | `autoOpenComments` deep-link expands the thread with no focus move/scroll/announcement — SR users can't find it. |
| PR-25 | UX | `ChallengesClient.tsx:396`, `CoachMemberClient.tsx:904` | Challenge-delete & coach-note-delete fire with no confirm (pattern exists elsewhere — mechanical). |
| PR-57 | UX | `MealLogger.tsx:241` | Save always `router.push('/trends')`; logging 3 snacks bounces you off `/log` each time. |
| PR-58 | i18n | `DashboardClient.tsx:223,373,381` | Hardcoded English ("Tap to fill…" with EN pluralization; "+1 bottle"/"+½ bottle"). |
| NF-I18N-1 | i18n | `FeedCard.tsx:380,446` | "Founder tools" / "Caption" hardcoded (Spanish users see English). |
| NF-I18N-2 | i18n | Dashboard hero numbers, times, +12 sites | `toLocaleString`/`toLocaleTimeString` omit the active locale → separators/formats mismatch UI language. |
| NF-UX-1 | UX | `LogClient.tsx:115-144` | `logActivity` has no try/catch → CTA stuck on "Guardando…" forever on network error. |
| NF-UX-2 (=PR-62) | UX | `FoodSearchBar.tsx:44-53,98` | No catch on search fetch + no empty state → "no results" indistinguishable from "broken/offline". |
| PR-60 | UX | `DashboardClient.tsx:532` | Challenges/Coach absent from bottom nav; `active="challenges"` highlights nothing. |
| NF-DB-1 (F2 caveat) | DB/Perf | `053:48-58` | 053 SELECT policies are correct & acceptably fast (STABLE fn → InitPlan), but `get_my_group_member_ids()` re-runs ~10×/feed load; optional `(SELECT auth.uid())` micro-opt. |
| NF-PWA-3 | Reliability | `lib/push.ts:36,64` | Send failures swallowed; 404/410 dead subscriptions never pruned → accumulate & bloat every fan-out. |
| NF-PWA-4 | Reliability | `MealLogger.tsx:194-249` | Photos uploaded before POST; failed/deduped save orphans storage objects; retry re-uploads under a new path. |
| NF-PWA-5 | Reliability | `FeedClient.tsx:88-111` | Realtime `.subscribe()` has no status callback / no `visibilitychange` refresh → stale feed & missed inserts on iOS resume. |
| NF-PWA-6 | Reliability | `FeedClient.tsx` handlers | Async click handlers (`handleReact`, `handleDelete`, `toggleCommentLike`…) lack try/catch → silent failures + unhandled rejections (no global reporter — PR-05). |
| NF-AI-2 | Privacy | `045_app_events.sql:10` | `app_events.user_id ON DELETE SET NULL` → weight/meal health data retained post-deletion (FK nulled, rows kept). |
| NF-AI-3 (=PR-09) | AI | `lib/anthropic.ts:6` | No client `timeout`/`maxRetries` → a Claude hang blocks the serverless fn up to ~30min. |
| NF-AI-4 | AI/UX | `analyze-photo:67-70`, `search-food:45-47` | 429/529/refusal all collapse into one opaque 500; user retries into the rate limit. |
| NF-AI-5 | AI/UX | `anthropic.ts:48` | `max_tokens:2048` truncates a large plate → JSON parse fails → misleading "No food detected". Check `stop_reason`. |
| NF-AI-6 (=PR-22/73) | AI/Cost | `analyze-photo`, `coach/draft` | Zero analytics/`usage` token logging on the two costliest AI actions (~$0.015–0.038/photo). |
| NF-AI-7 (=PR-76) | Privacy | onboarding, `privacy/page.tsx` | No explicit Art.9 special-category consent for health data (sex/weight/meals). |
| PR-38 | DB | logs tables | Missing numeric CHECK constraints (negative/absurd values accepted, corrupt aggregates). |
| PR-77 | DB | `groups.created_by ON DELETE SET NULL` | Deleted founder → ownerless group, no one can ever approve/edit. |
| PR-40 | DB/DevOps | migrations | Manual apply + `028` gap + 8 migrations re-add `notifications_type_check` with hardcoded enum lists → out-of-order apply can reject `'reply'`/`'coach_*'` at runtime. |

### P3 — Low (selected; full list carried from 07-06)

NF-API-6 (cron slot: no catch-up window + overlap double-send), NF-API-7 (`push/test`+`language` no RL), NF-CLIENT-4/5/6 (reaction DELETE no `res.ok`; comment insert `as any` missing like fields; index keys on filtered photo carousel), NF-DB-2 (unindexed `notifications.{activity_log_id,food_log_id,challenge_id}` FKs → cascade-delete seq scans), NF-DB-3 (no "exactly one target" CHECK on comments/reactions), NF-PWA-7 (reminder `tag` reused without `renotify` → silent no re-alert), NF-UX-3 (Log tabs lost emerald/orange identity + intensity control never migrated to `Segmented`), NF-UX-4 (QuickLog load flicker/layout shift, no skeleton), NF-PERF-3/4, plus carried PR-24, 30, 39, 41, 46, 48, 53, 54, 64, 66, 67, 68, 69, 70, 71, 72, 73, 80, 83, 84.

**Verified PASS (record, do not re-flag):** segmented-control **contrast** (all states ≥6:1) and **touch targets** (compact ~28px ≥ 24px min) — the a11y agent's own hypotheses, disproved. Migration 053 SELECT-policy **performance** (STABLE fn → single InitPlan, ~100–200 PK lookups/feed, low-ms; supporting indexes exist). `app_events` **RLS** (no SELECT policy, INSERT gated to `auth.uid()`). BarcodeScanner **lazy-loaded** (@zxing code-split). Quick Log route **clean** (scoped, rate-limited, no injection surface).

---

## 6. Positives (do not regress)
Cron auth is now genuinely fail-closed. Founder/coach write routes re-verify ownership with the admin client. The i18n dictionary keeps compile-time EN/ES parity (verified: all new `quickLog`/aria keys present in both). `app → lib` layering stays one-directional. The 07-06 P0 security sprint landed correctly and is the reason the security score jumped 28 points.

---

## 7. Sprint Backlog

### Immediate (regressions + P1 quick-wins, ~1 day total)
1. **NF-SEC-1** — drop the approved-request branch from the 053 group-join policy (new migration 054). *15min.*
2. **NF-PWA-1** — sw.js focus-then-navigate-then-await hybrid. *15min + iOS device test.*
3. **NF-A11Y-4** — `type="button"` on `Segmented`. *5min.*
4. **NF-CLIENT-3** — `min-w-0`+`truncate` on `Segmented` fill labels. *15min.*
5. **PR-07** — sync `goals: [goal]` in EditProfile. *5min.*
6. **NF-AI-1** — remove storage objects in delete-account. *1h.*
7. **NF-CLIENT-1** — clear `targetPost` after first scroll; drop `entries`/`activityList` deps. *15min.*

### Sprint 1 — close the verification gap (P0 testing) + P1s
NF-TEST-1/2 (unit-test nutrients/macros/trends/coach-intel/copilot), NF-TEST-3 (seeded authed e2e in CI), NF-TEST-4 (lint baseline), NF-TEST-5 (`.env.example` + fail-loud), NF-API-1 (error.message sweep), NF-API-2 (log-meal RL), NF-PWA-2 (coach-digest robustness), NF-A11Y-1 (radiogroup mode + keyboard).

### Sprint 2 — P2 correctness/security/privacy
NF-SEC-2/3, NF-API-3/4/5, NF-CLIENT-2, NF-A11Y-2/3/5, PR-25/57/58, NF-I18N-1/2, NF-UX-1/2, NF-PWA-3/4/5/6, NF-AI-2..7, PR-38/40/77.

### Backlog — carried P2/P3 from 07-06
PR-03 (static rendering), PR-14/50/52 (images/windowing), PR-41 (coach rollup), PR-05/15/16 (telemetry/offline), and the remaining P3 register.

---

## 8. Methodology
Ten specialist agents audited in parallel (security/RLS, API, client React, performance, accessibility, i18n/UX, database, PWA/reliability, testing/CI, AI/analytics/privacy). Each re-verified its domain's 07-06 findings and hunted new issues with file:line evidence. Every P0/P1 finding in this report was then **manually re-verified against source** before inclusion (NF-SEC-1 rejoin chain, NF-PWA-1 sw.js, NF-AI-1 delete-account, PR-07, NF-CLIENT-1/3, NF-A11Y-1/4 all confirmed by direct file read). One environmental caveat: the agents' sandboxes lacked `node_modules`, so live `tsc`/`eslint`/`build` counts could not be re-measured by them; those were cross-checked against this session's own earlier clean builds on the same tree.
