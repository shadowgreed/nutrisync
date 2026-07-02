# NutriSync — Full Engineering Audit (Re-Audit)

**Date:** 2026-07-02
**Auditors (roles):** Staff Software Engineer · Mobile Architect · Security Engineer · QA Lead · Product Analyst
**Scope:** Next.js 16 / React 19 PWA, Supabase (Postgres + RLS + Storage). 49 migrations, ~21k LOC. Audited on `main` @ `ddfe52a`.
**Method:** Four parallel specialist sweeps (database/perf, tests/analytics/reliability, security/API/correctness, architecture/UI), each re-verifying the prior audit's findings against current code.
**Supersedes:** `docs/ENGINEERING-AUDIT-2026-06-27.md` (score 80/100), which superseded `docs/ENGINEERING-AUDIT.md` (2026-06-21, score 71/100).

> **Corrections to the prior audit** (found during this verification pass — do not treat as new regressions):
> - The 2026-06-27 audit's **H3 count was too low**: beyond the 5 flagged routes, **11 more unguarded `await req.json()` call sites** exist in coach/group/push-notify/log-weight routes that were never in scope. Corrected below.
> - The 2026-06-27 audit called `app/coach/page.tsx`'s `dayKey` **dead code — that was wrong.** It is live (`:100`, `:131`) and buckets the coach dashboard's "meals today" count by UTC. Reclassified as a real (minor) H1 residual.

---

## 0. What changed since the last audit

Since 2026-06-27, PRs #67 (re-audit docs), #68 (remediation), #69 (water-goal milestone + Sunday-gated weekly review, migration 049), and #70 (widget data contract) merged. Net movement on the prior findings:

| Prior finding | Severity | 06-27 | Now | Evidence |
|---|---|---|---|---|
| **C1 — indexes on core tables** | Critical | ✅ | ✅ **RESOLVED** | Intact; `CREATE INDEX` 23 → **25** (048 adds both `group_join_requests` indexes — closes N1) |
| **C2 — zero automated tests** | Critical | 🔴 | 🟡 **PARTIAL** | vitest harness + **5 files / 33 tests** over `lib/{day,streak,fitness,validate,widget}`. Still: no e2e, **no CI**, most pure libs uncovered |
| **C3 — analytics on core actions** | Critical | ✅ | ✅ **RESOLVED** | All 11 core events verified firing |
| **H1 — UTC vs local "day"** | High | 🟡 | 🟡 **PARTIAL** | Flagged residuals fixed (`TrendsClient:140,148`, `coach/[memberId]/page.tsx:152` → `userDayKey`). One true residual remains: `app/coach/page.tsx:15,100,131` (UTC "meals today" — previously mislabeled dead) |
| **H2 — in-memory rate limiting** | High | 🔴 | 🔴 **OPEN** (deferred by decision) | `lib/ratelimit.ts:8` unchanged; awaiting a backend choice (Upstash/Redis vs Supabase table) |
| **H3 — `req.json()` without try/catch** | High | 🟡 | 🟡 **PARTIAL** (scope corrected) | The 6 named routes now use `parseJson`/`badRequest` ✅. **Corrected count: 11 more unguarded sites** — `log-weight:10`, `push/notify:27`, `group/{resolve-request:11,update:13,remove-member:13}`, `coach/{review:12,send:15,draft:17,message:18,note:18,54}` |
| **H4 — unvalidated/unbounded inputs** | High | 🔴 | ✅ **RESOLVED** | log-activity numerics clamped; log-meal caption(500)/photos(≤6, URL-checked)/foods(≤50); push endpoint https + key bounds |
| **H5 — god components** | High | 🔴 | 🔴 **OPEN** | 901 / 799 / 599 / 555 — byte-identical to baseline |
| **H6 — no error boundaries** | Medium | 🔴 | ✅ **RESOLVED** | `app/error.tsx` (recovery UI: retry + dashboard) + `app/global-error.tsx` |
| **H7a — `comments` UPDATE policy** | High | 🔴 | ✅ **RESOLVED** | `048_rls_and_bounds.sql:10-12` — author-only `FOR UPDATE` |
| **H7b — SELECT `USING(true)` (comments/reactions/comment_likes)** | High | 🔴 | 🔴 **OPEN (prepared)** | Scoped policies exist in 048 but **commented out** pending staging validation — live schema unchanged |
| **QW — JSONB size bounds** | Quick win | 🔴 | 🟡 **PARTIAL** | 048 adds both CHECKs as `NOT VALID` (new writes only; never `VALIDATE`d — intentional) |
| **QW — dead code** | Quick win | 🔴 | ✅ **RESOLVED** | `computeMemberProgress` and `searchArticles`/`scoreArticle` removed |
| **QW — sub-44px touch targets** | Quick win | 🟡 | ✅ **RESOLVED** | 5 hits remain, **all decorative** (avatar/icon divs) — zero interactive controls under 44px |
| **QW — low-contrast `text-stone-600`** | Quick win | 🟡 | ✅ **RESOLVED** | 6 hits remain, all `aria-hidden` icons; breadcrumb separator fixed to `stone-400` |
| **`goal`/`goals` redundancy** | Medium | 🔴 | 🔴 **OPEN** | No sync mechanism; unchanged since 012 |
| **N3 — notifications timeline index** | Low | 🔴 | 🔴 **OPEN** | `(user_id, read, created_at)` still the only notifications index |
| **Render purity / hooks lint** | — | 🔴 | 🔴 **OPEN** | `npx eslint app components`: **30 errors** (18 purity, 7 set-state-in-effect incl. InstallPrompt/PushToggle, 3 any, 1 unused) + `useFocusTrap.ts:28` ref-write |
| **BottomNav coupling** | Medium | 🔴 | 🔴 **OPEN** | Still exported from `DashboardClient:528`, imported by 8 files |
| **`<img>` (no next/image)** | Medium | 🔴 | 🔴 **OPEN** | 22 occurrences across 12 files |

**Headline:** every item that was *actionable without a product decision* has now moved — tests exist (from zero), error boundaries exist, inputs are bounded, the DB policy/index gaps are closed, and the a11y quick wins are fully done. What remains falls into three buckets: **(a) deferred-by-decision** (H2 backend, H7b staging validation), **(b) structural refactors** (H5, BottomNav, next/image), and **(c) newly-scoped hardening** (the 11 extra `req.json()` sites, CI wiring).

---

## 1. Executive Summary

NutriSync has crossed from "remediating" to "hardening." The three original 2026-06-21 criticals are now: indexes ✅, analytics ✅, tests 🟡 (a real harness with 33 green tests, but no CI runs them and most `lib/` logic is still uncovered). The security posture improved again (input bounds, comments UPDATE policy, three new surfaces — widget endpoint, water-goal milestone, Sunday gate — all reviewed clean: authed, non-forgeable, server-side).

The two most consequential open items are process, not code:
1. **No CI.** `.github/` does not exist. The new test suite and lint provide zero regression protection because nothing runs them on push/PR. This is now the single highest-leverage gap.
2. **H3's corrected scope.** 11 unguarded `req.json()` call sites remain in coach/group routes — same one-line fix pattern as the six already done.

**Overall score: 84 / 100** (71 → 80 → 84). **Recommendation: 🟡 Nearly scale-ready.** Wire CI, sweep the remaining `req.json()` guards, then the only open items are the two explicitly deferred decisions (H2 backend, H7b enablement) and the structural refactor backlog (H5).

---

## 2. Critical Issues (scale blockers)

| # | Area | Issue | Status | Evidence |
|---|------|-------|--------|----------|
| C1 | Performance / DB | Indexes on core tables | ✅ **RESOLVED** | 25 active `CREATE INDEX` (+2 `group_join_requests` in 048); all core access patterns covered |
| C2 | Reliability | Automated tests | 🟡 **PARTIAL** | `vitest run` → 33 tests green over `lib/{day,streak,fitness,validate,widget}`. **Uncovered:** `lib/challenges`, `lib/weekly-review`, `lib/nutrients`, `lib/trends`, `lib/coach-intel`, `lib/macros`, `lib/water`, others. **No e2e. No CI** (`.github/` absent) |
| C3 | Analytics | Core-action events | ✅ **RESOLVED** | signup/login/onboarding + all log/group/challenge events verified firing |

**Remaining P0:** CI wiring (run `vitest` + `eslint` + `tsc` on every PR) — small task, outsized protection — then broaden unit coverage to `lib/challenges` and `lib/weekly-review` (the two most correctness-sensitive uncovered modules).

---

## 3. High-Priority Issues

| # | Area | Issue | Status | Fix |
|---|------|-------|--------|-----|
| H1 | Correctness | Day-key residual: `app/coach/page.tsx:15,100,131` buckets the coach dashboard's "meals today" by UTC (internally consistent, but wrong near midnight for non-UTC members). Previously mislabeled dead code. | 🟡 **PARTIAL** | Thread each member's tz (as `coach/[memberId]` already does) or accept and document the approximation |
| H2 | Security | In-memory per-instance rate limiter | 🔴 **OPEN** (deferred) | Pick a backend (Upstash/Redis or Supabase table); implementation is then ~1 day |
| H3 | Security / QA | 11 unguarded `await req.json()` sites: `log-weight`, `push/notify`, `group/resolve-request`, `group/update`, `group/remove-member`, `coach/review`, `coach/send`, `coach/draft`, `coach/message`, `coach/note` (×2) | 🟡 **PARTIAL** | Apply the existing `parseJson`/`badRequest` pattern — mechanical sweep, <½ day |
| H4 | Security / QA | Input bounds | ✅ **RESOLVED** | — |
| H5 | Architecture | God components (901/799/599/555, unchanged) | 🔴 **OPEN** | Dedicated decomposition PR (start with `FeedCard`) |
| H6 | Reliability | Error boundaries | ✅ **RESOLVED** | Consider per-route boundaries for `coach/` later; root coverage is acceptable |
| H7 | DB | a) UPDATE policy ✅ · b) scoped SELECT still `USING(true)` in live schema (prepared block commented in 048) | 🟡 **SPLIT** | Validate the commented block against feed reads in staging, then enable |

---

## 4. Quick Wins (status)

1. ~~Missing-index migration~~ ✅ (044 + 048)
2. `req.json()` guards — 🟡 6 done, **11 newly-scoped sites remain** (see H3)
3. ~~`alt`/aria~~ ✅ · 4. ~~44px touch targets~~ ✅ (remaining hits decorative) · 5. ~~dead code~~ ✅ · 7. ~~shared `dayKey` util~~ ✅ (`lib/day.ts`, incl. `isSunday`)
6. Loading/success feedback (challenge create, delete/approve toasts) — 🟡 unchanged
8. JSONB bounds — 🟡 in place (`NOT VALID`); optional follow-up: `VALIDATE CONSTRAINT` after confirming no oversized legacy rows

**New quick wins this pass:** (a) add `.github/workflows/ci.yml` running `npm test` + `tsc --noEmit` + `eslint`; (b) extract the today's-water-total summation shared by `lib/widget.ts` and `app/api/log-water` (see N10); (c) `aria-hidden` on the one bare ChevronRight in `app/settings/_ui.tsx:43`.

---

## 5–12. Dimension notes (delta only)

- **Architecture (73 → 74):** Dead code removed; `lib/validate.ts`, `lib/widget.ts`, and the `isSunday`/`dayOfWeek` helpers are clean additions. God components and `BottomNav` coupling (8 importers) unchanged. One new small dup: the water-goal block re-implements today's-water summation inline instead of sharing `lib/widget.ts`'s logic (N10).
- **Code quality:** eslint on `app`+`components` = **30 errors / 22 warnings** — 18 purity (`Date.now()` in render), 7 `set-state-in-effect` (InstallPrompt:33, PushToggle:45 among them), plus the `useFocusTrap.ts:28` ref-write-in-render. None block `next build`, but the pile is stable, not shrinking.
- **Performance (80 → 81):** `group_join_requests` indexes close N1. Water logging now costs insert + profile read + 48h scan + conditional upsert per log — served by `water_logs_user_logged_at_idx`, acceptable (N4). `<img>` everywhere still the top frontend perf/cost lever (22 uses; also the #1 infra-egress lever per the cost model).
- **Security (80 → 82):** H4 closed; H7a closed; all three new surfaces reviewed clean — `/api/widget/summary` (authed, self-scoped, `private` cache), water-goal milestone (authed client + RLS, server-computed data, non-forgeable, once-per-day), Sunday gate (server-side redirect, not bypassable). Held back by H2, the 11 unguarded parse sites, and no global body-size cap.
- **Reliability (58 → 72):** Biggest mover — a real test harness (33 green), error boundaries at root + global. Capped by no CI and no e2e.
- **Database (78 → 82):** 048/049 applied in-repo (comments UPDATE policy, gjr indexes, JSONB guards, water_goal type). Open: H7b live policies, `goal`/`goals`, N3 notifications timeline index.
- **API (72 → 76):** Six routes hardened end-to-end; still no idempotency keys (double-tap Save → duplicate meal), and the corrected H3 backlog.

---

## 13. New issues found this pass

| # | Severity | Issue | Evidence |
|---|---|---|---|
| N7 | **High** | **No CI** — `.github/` absent; tests/lint/tsc never run on push or PR. The 33-test suite protects nothing automatically. | repo root |
| N8 | Medium | H3 scope correction: 11 additional unguarded `req.json()` sites (list in H3). | `app/api/**` |
| N9 | Low | `app/coach/page.tsx` `dayKey` is live UTC bucketing (prior audit wrongly called it dead) — coach "meals today" off near midnight for non-UTC members. | `app/coach/page.tsx:100,131` |
| N10 | Low | Today's-water-total logic duplicated: tested in `lib/widget.ts`, re-implemented untested in `app/api/log-water/route.ts:43-51` — drift risk. Extract a shared helper. | both files |
| N11 | Low | The two `NOT VALID` JSONB constraints are never `VALIDATE`d — legacy oversized rows permanently unchecked (intentional, but track it). | 048 |
| N12 | Info | `/api/widget/summary` is live with no consumer until the Capacitor shell ships — planned, per `docs/WIDGET-IMPLEMENTATION.md`. | — |
| N13 | Info | 48h fetch window in the water-goal check can undercount very early "today" hours in UTC+13/+14 zones (same assumption as the dashboard). Edge-case only. | `log-water:43` |

---

## Production-Readiness Scores

| Dimension | 2026-06-21 | 2026-06-27 | **2026-07-02** | Δ (vs 06-27) |
|-----------|------|------|------|---|
| Architecture | 70 | 73 | **74** | +1 |
| Security | 80 | 80 | **82** | +2 |
| Performance | 55 | 80 | **81** | +1 |
| UX | 78 | 84 | **86** | +2 |
| Reliability | 50 | 58 | **72** | +14 |
| Scalability | 55 | 72 | **74** | +2 |
| **Overall** | **71** | **80** | **84** | **+4** |

**Final recommendation: 🟡 Nearly scale-ready.** The audit-remediate loop is converging: every previously-open item that could be fixed without a decision or a large refactor is now fixed. The gating list is short and concrete: **(1) CI wiring (N7), (2) the 11-route `req.json()` guard sweep (H3), (3) the two deferred decisions — H2 backend choice and H7b staging validation.** H5 decomposition and next/image adoption remain the structural backlog.

---

## Appendix — Verification gate (run on `main` @ ddfe52a, 2026-07-02)

```
npm test          → 5 files, 33 tests, all green
npx tsc --noEmit  → clean
npm run build     → ✓ Compiled successfully
npx eslint app components → 30 errors / 22 warnings (pre-existing classes, non-blocking)
rg -c 'CREATE INDEX' supabase/migrations/*.sql → 25
ls .github        → does not exist (N7)
```
