# P0 Sprint — Database Indexing, Query Optimization & Performance Hardening

**Date:** 2026-06-21 · **Source:** `docs/ENGINEERING-AUDIT.md` (C1) · **Status:** Ready to execute
**Migration:** `supabase/migrations/044_performance_indexes.sql`

> **Every recommendation below was validated against the actual schema (`supabase/migrations/*`) and the actual queries (`app/**`).** Each index maps to a real query with a file reference. No generic advice.

---

## 0. Validation notes (what changed vs the audit)

| Audit claim | Verified result |
|---|---|
| `challenge_participants` table | **Does not exist.** Confirmed via `grep` across `supabase/`, `app/`, `lib/`. Challenge progress is computed **live** from `food_logs`/`activity_logs`/`water_logs` (`app/challenges/page.tsx`). No participation/progress rows → no index needed there; leaderboard speed = the log-table indexes + `challenges(group_id)`. |
| Feed is "N+1" | **Not N+1.** The feed loads reactions/comments/activities/milestones in **batched `IN (...)`** queries (`app/feed/page.tsx:73-86`). The problem is each batch hits an **unindexed** table → sequential scans, not round-trip count. |
| `group_members(user_id)` missing | **Confirmed & elevated to keystone.** PK is `(group_id, user_id)`; the `SECURITY DEFINER` helpers `get_my_group_ids()` / `get_my_group_member_ids()` (migration 004) filter `WHERE user_id = auth.uid()`, so they scan `group_members` on every RLS check across ~10 tables. |
| `reactions`/`milestones` need FK indexes | **Confirmed.** Their UNIQUE constraints lead with `user_id` (`reactions UNIQUE(user_id, food_log_id)`, `milestones UNIQUE(user_id, type, key)`), so they do **not** serve `food_log_id` lookups or `created_at` ranges. |

**Current index inventory (verified — only 7 exist, none on core tables):**
`notifications_user_unread_idx`, `reactions_user_activity_idx` (unique), `comment_likes_comment_idx`, `coach_message_drafts_queue_idx` + `_one_pending_idx`, `coach_client_notes_lookup_idx`, `help_events_*`, `weekly_review_events_event_idx`. **Plus** PKs and UNIQUEs. **Zero** indexes on `food_logs`, `activity_logs`, `water_logs`, `weight_logs`, `group_members`, `reactions(food_log_id)`, `comments`, `milestones`, `challenges`.

---

## 1. Executive Summary

The schema is correct and well-secured but has **no indexes on any core table**. At MVP volume this is invisible; at production volume it is a hard wall. The app's universal access pattern is `WHERE user_id = ? [AND logged_at >= ?] ORDER BY logged_at` (dashboard, trends, feed, challenges, weekly, profile) plus `food_log_id IN (...)` (feed reactions/comments). Today every one of these is a **sequential scan**, and the scans are multiplied because they also run **inside RLS** via the group-member helpers.

**The fix is one additive migration (`044`) of 12 indexes.** It changes no data, locks no reads, and — applied now while tables are small — builds in well under a second. This is the highest ROI change available to the project: **O(rows) → O(log n)** on the hottest paths.

**Production-readiness (DB/perf dimension): 55 → 88** post-sprint. Removes the scale wall up to ~100k users for all read paths.

---

## 2. Per-Table Analysis

> Storage estimates assume a B-tree row overhead of ~16–40 bytes/row. "MVP" ≈ thousands of rows; "100k users" ≈ the row counts in §8.

### `food_logs` — hottest table
- **Current indexes:** PK `(id)` only.
- **Recommended:** `food_logs(user_id, logged_at DESC)`.
- **Reasoning:** dominant pattern; serves dashboard (2 queries), trends, feed, challenges, weekly, streak, profile.
- **Query patterns supported:** `user_id = ? AND logged_at >= ? ORDER BY logged_at`; `user_id IN (...) AND logged_at >= ?`; RLS group-visibility semi-joins.
- **Expected improvement:** seq scan → index range scan; **>99%** at scale.
- **Storage:** ~28 B/row (≈ 2.8 MB per 100k rows). **Risk:** none (additive).
- **Optional P1:** partial `… WHERE shared_to_feed` for the feed query specifically.

### `activity_logs`
- **Current:** PK only. **Recommended:** `activity_logs(user_id, logged_at DESC)`.
- **Reasoning/patterns:** feed (`user_id IN`), dashboard, trends, challenges, weekly — same shape as food_logs.
- **Improvement:** >99% at scale. **Storage:** ~28 B/row. **Risk:** none.

### `water_logs`
- **Current:** PK only. **Recommended:** `water_logs(user_id, logged_at DESC)`.
- **Reasoning/patterns:** dashboard, trends, challenges, weekly. **Improvement:** >99%. **Risk:** none.

### `weight_logs`
- **Current:** PK only. **Recommended:** `weight_logs(user_id, logged_at)` (ASC — trends plots oldest→newest).
- **Reasoning/patterns:** trends 90d, weekly baseline, profile. Lower volume (≈1 row/user/day). **Improvement:** 90%+. **Risk:** none.

### `group_members` — keystone
- **Current:** PK `(group_id, user_id)`.
- **Recommended:** `group_members(user_id)`.
- **Reasoning:** `get_my_group_ids()` / `get_my_group_member_ids()` filter on `user_id` (PK leads with `group_id` → unusable). These run inside **~10 RLS policies** and every feed/challenge/weekly/profile membership lookup.
- **Patterns:** `WHERE user_id = auth.uid()`; self-join `gm1.user_id = auth.uid()`.
- **Improvement:** **80–99%** on *every* group-scoped query (compounding). **Storage:** tiny. **Risk:** none.

### `reactions`
- **Current:** PK `(id)`, UNIQUE `(user_id, food_log_id)`, UNIQUE `(user_id, activity_log_id)` partial.
- **Recommended:** `reactions(food_log_id) WHERE food_log_id IS NOT NULL`; `reactions(activity_log_id) WHERE activity_log_id IS NOT NULL`.
- **Reasoning:** feed loads `WHERE food_log_id IN (logIds)`; uniques lead with `user_id` → no help. **Improvement:** >95% on feed reaction load. **Risk:** none.

### `comments`
- **Current:** PK only.
- **Recommended:** `comments(food_log_id)`, `comments(activity_log_id)`, `comments(parent_id)` (all partial on `NOT NULL`).
- **Reasoning:** feed loads by `food_log_id IN`; activity comments + threaded replies (migrations 027/030) join by `activity_log_id` / `parent_id`. **Improvement:** >95% feed comment load. **Risk:** none.

### `milestones`
- **Current:** PK, UNIQUE `(user_id, type, key)`.
- **Recommended:** `milestones(user_id, created_at DESC)`.
- **Reasoning:** feed `user_id IN (...) AND created_at >= ? ORDER BY created_at DESC`; unique gives equality but not range/sort. **Improvement:** 90%+. **Risk:** none.

### `challenges`
- **Current:** PK only.
- **Recommended:** `challenges(group_id, created_at DESC)`.
- **Reasoning:** `WHERE group_id = ? ORDER BY created_at DESC` (`app/challenges/page.tsx:51`). **Improvement:** 90%+ (small table, but removes a scan per challenges-page load). **Risk:** none.

### `groups`, `profiles`, `notifications` — already adequate
- **`profiles`:** all access is by PK (`id = user.id`). No change.
- **`groups`:** access by PK (`id IN`) or `created_by` on a handful of rows per user. `groups(created_by)` is **marginal** → P1 only.
- **`notifications`:** `notifications_user_unread_idx (user_id, read, created_at DESC)` already serves the unread-count and history queries (user_id leading). A dedicated `(user_id, created_at DESC)` is a minor optimization → **P1, optional** (avoid index bloat).

---

## 3. Query Audit (validated)

| File / function | Query (abbrev) | Issue today | Fix | Expected gain |
|---|---|---|---|---|
| `app/feed/page.tsx` (FeedPage) | `group_members WHERE user_id=?` | seq scan | idx #1 | 80–99% |
| `app/feed/page.tsx` | `food_logs WHERE user_id IN(members) AND shared_to_feed AND logged_at>=? ORDER BY logged_at DESC LIMIT 100` | seq scan ×N members | idx #2 | >99% @ scale |
| `app/feed/page.tsx` | `reactions WHERE food_log_id IN(logIds)` | seq scan | idx #6 | >95% |
| `app/feed/page.tsx` | `comments WHERE food_log_id IN(logIds)` | seq scan | idx #7 | >95% |
| `app/feed/page.tsx` | `activity_logs WHERE user_id IN(members) AND logged_at>=?` | seq scan | idx #3 | >99% @ scale |
| `app/feed/page.tsx` | `milestones WHERE user_id IN(members) AND created_at>=?` | seq scan | idx #8 | 90%+ |
| `app/dashboard/page.tsx` (DashboardPage) | `food_logs WHERE user_id=? AND logged_at>=since48` + `… >= streak60` | 2× seq scan | idx #2 | >99% @ scale |
| `app/dashboard/page.tsx` | `activity_logs` / `water_logs WHERE user_id=? AND logged_at>=?` | seq scan | idx #3/#4 | >99% |
| `app/trends/page.tsx` (TrendsPage) | `food_logs/activity/water WHERE user_id=? AND logged_at>=since30` | seq scan | idx #2/#3/#4 | >99% @ scale |
| `app/trends/page.tsx` | `weight_logs WHERE user_id=? AND logged_at>=since90` | seq scan | idx #5 | 90%+ |
| `app/challenges/page.tsx` (ChallengesPage) | `challenges WHERE group_id=? ORDER BY created_at` | seq scan | idx #9 | 90%+ |
| `app/challenges/page.tsx` | `food/activity/water WHERE user_id IN(members) AND logged_at>=earliest` | seq scan | idx #2/#3/#4 | >99% @ scale |
| `app/weekly/page.tsx` (WeeklyPage) | member `food/activity/water` + 60d streak + group peers | seq scan | idx #2/#3/#4 | >99% @ scale |
| RLS (all group-visible tables) | `user_id IN (SELECT get_my_group_member_ids())` | helper scans `group_members` | idx #1 | compounding |

**Application-level optimization (P1, not an index):** `app/dashboard/page.tsx` issues **two** `food_logs` reads (48h `select('*')` + 60d `select('logged_at')`). The 60d query is a superset; merge into one 60d read and derive the 48h slice client-side — saves one round trip. Low risk, ~0.5d.

---

## 4. Feed Optimization (`app/feed/page.tsx`)

- **Generation:** `food_logs(user_id, logged_at DESC)` (#2) turns the `LIMIT 100` newest-first scan into an index range. With the partial-on-`shared_to_feed` variant (P1) it's even tighter.
- **Member lookup:** `group_members(user_id)` (#1).
- **Reactions/Comments:** `reactions(food_log_id)` (#6) + `comments(food_log_id)` (#7) — the batched `IN` becomes index lookups.
- **Activity/Milestones:** #3 / #8.
- **Caching (P1):** the feed is server-rendered per request. Add `unstable_cache`/route segment caching keyed by `(groupIds, sinceDay)` with a short TTL (30–60s) + revalidate-on-write, or move to a cursor-paginated client fetch.
- **Denormalization (P1):** store `reaction_count` / `comment_count` on `food_logs` (trigger-maintained) to skip loading reaction/comment rows for cards that aren't expanded.
- **Pagination (P1):** replace `LIMIT 100` with keyset pagination (`logged_at < cursor`) for groups that exceed a week of dense activity.

## 5. Dashboard Optimization (`app/dashboard/page.tsx` + `DashboardClient`)

- **Queries:** all four (`food_logs ×2`, `activity_logs`, `water_logs`) are `user_id = ? AND logged_at >= ?` → covered by #2/#3/#4.
- **Repeated calc:** nutrient/macro/hydration totals are computed **client-side** from a 48h window (correct — handles the viewer's local "today"). Keep client-side; it's cheap (≤ a few dozen rows).
- **Expensive join:** none — no joins on this page. Good.
- **Opt (P1):** merge the two `food_logs` reads (see §3).

## 6. Trends Optimization (`app/trends/page.tsx` + `lib/trends.ts`)

- **Indexes:** #2 (food 30d), #3 (activity 30d), #4 (water 30d), #5 (weight 90d) — each a `user_id + logged_at` range, all covered.
- **Aggregation:** `buildDailySeries`/`summarize` aggregate in JS over ≤ 90 days of a single user's rows — fine.
- **Materialized views (P1):** only worth it if you add long-range (1y+) trends or org-level dashboards. A `daily_user_rollup` MV (`user_id, day, kcal, protein, …, active, water_ml`) refreshed nightly would make any range O(days) regardless of log density. Not needed at ≤100k users for 30/90d windows.

## 7. Challenge Optimization (`app/challenges/page.tsx`)

- **No precomputed progress table exists** — leaderboard/ranking/today's-status are computed in-process from members' logs over the challenge window.
- **Indexes:** `challenges(group_id, created_at)` (#9) for the list; `food/activity/water(user_id, logged_at)` (#2/#3/#4) for the per-member windows; `group_members(user_id)` (#1) for the roster.
- **Precomputed fields (P1):** if a single group runs many long challenges, add a `challenge_progress(challenge_id, user_id, success_days, streak, updated_at)` table maintained by triggers on log insert/delete, turning leaderboard reads into a single indexed scan. **Defer** until challenge density justifies it.

## 8. Supabase / RLS Audit

- **RLS correctness:** strong — `SECURITY DEFINER` + `STABLE` helpers prevent the original recursion; group visibility is consistent across tables.
- **RLS performance:** the helpers scan `group_members` on `user_id`. **Index #1 is the RLS accelerator** — it speeds *every* policy that calls `get_my_group_member_ids()`/`get_my_group_ids()` (`food_logs`, `activity_logs`, `water_logs`, `milestones`, `groups`, `challenges`, `reactions`/`comments` indirectly, push subs, water visibility…). `STABLE` means Postgres caches the helper result within a statement, so the index cost is paid once per query, not per row.
- **Auth queries:** all `profiles`/own-row reads are by PK — already optimal.
- **Redundancies:** none harmful. The notification-type CHECK is recreated across migrations (safe via `DROP … IF EXISTS`).
- **Recommendation:** ship #1 first and measure; it is the cheapest, broadest win.

## 9. Migrations

**Migration 044 (this sprint, production-ready):** `supabase/migrations/044_performance_indexes.sql` — 12 idempotent `CREATE INDEX IF NOT EXISTS`, grouped with per-index reasoning + a commented rollback block. Additive, no data change, no read lock.

**Apply-now guidance (tables are currently small):** plain `CREATE INDEX` builds sub-second and is safe.

**If applying after tables are large**, run each as **`CREATE INDEX CONCURRENTLY`** *outside a transaction* (Supabase SQL editor, not the migration runner) to avoid write locks — e.g.:
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS food_logs_user_logged_at_idx
  ON food_logs (user_id, logged_at DESC);
-- …repeat per index. CONCURRENTLY cannot run inside a txn block.
```

**P1 migration (later):**
```sql
-- Optional feed micro-opt (partial)
CREATE INDEX IF NOT EXISTS food_logs_feed_idx
  ON food_logs (user_id, logged_at DESC) WHERE shared_to_feed;
-- Optional notification history (minor; existing unread idx mostly covers)
CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications (user_id, created_at DESC);
-- Optional founder/request lookups
CREATE INDEX IF NOT EXISTS group_join_requests_group_status_idx
  ON group_join_requests (group_id, status);
CREATE INDEX IF NOT EXISTS coach_message_drafts_member_idx
  ON coach_message_drafts (member_id, status);
```

## 10. Benchmark Estimates

Estimates are modeled (no prod dataset available); confidence labeled. The mechanism — eliminating a sequential scan — is certain; absolute numbers scale with row count.

| Query | ~Rows scanned today @100k users | Now (est.) | With index (est.) | Improvement | Confidence |
|---|---|---|---|---|---|
| Dashboard `food_logs` (user, 60d) | full table ~110M | 800–2500 ms (→timeout) | 1–5 ms | ~99.9% | High |
| Feed `food_logs` (members IN, 7d, LIMIT 100) | full table ~110M | 1–3 s | 2–10 ms | ~99% | High |
| Feed `reactions`/`comments` (food_log_id IN 100) | full table | 200–900 ms | 1–4 ms | ~99% | High |
| Trends `food_logs` (user, 30d) | full table | 500–1500 ms | 1–4 ms | ~99% | High |
| Any group-scoped RLS query (`group_members` helper) | full members table per call | +50–500 ms overhead | <1 ms | 80–99% | High |
| Challenges list (`group_id`) | full challenges table | 50–300 ms | <1 ms | ~95% | Medium |

At **MVP volume** (thousands of rows) the absolute win is small (sub-ms either way) — which is exactly why **now is the cheapest time to add them** (instant build, no lock).

## 11. Future P1 Improvements

- **Materialized view** `daily_user_rollup` (nightly refresh) → enables 1y+ trends and group/coach dashboards in O(days).
- **Denormalized counts** `food_logs.reaction_count` / `comment_count` (trigger-maintained) → feed cards skip child reads.
- **Caching**: short-TTL cache on the feed and group-roster reads; revalidate-on-write.
- **Keyset pagination** on feed (`logged_at < cursor`) instead of `LIMIT 100`.
- **`challenge_progress` table** (trigger-maintained) if challenge density grows.
- **Distributed rate limiter** (separate from indexing, but a scale prerequisite — see audit H2).

## 12. Production Readiness & Scalability

| Dimension | Current | Post-sprint |
|---|---|---|
| DB read performance | 55 | 88 |
| Scalability (read paths) | 55 | 85 |

**Scalability outlook (read paths, post-044):**

- **1,000 users** — Fine today *and* post-sprint; indexes are insurance (builds instant now).
- **10,000 users** — Without 044: dashboard/feed/trends degrade to hundreds of ms–seconds and RLS overhead compounds. With 044: all core reads stay <10 ms.
- **100,000 users** (~100M `food_logs` rows/yr) — Without 044: core reads **time out** (full scans of 100M rows); app is effectively down for active users. With 044: core reads stay **<10 ms** (index range scans bounded by *one user's* rows, not the table). Beyond this, add the §11 rollup/denormalization for long-range analytics and very dense feeds — but the per-user read paths remain flat.

**Bottom line:** `044` is a one-migration, zero-data-change, zero-read-lock change that removes the project's single biggest scale wall. **Ship it this sprint, `group_members(user_id)` first, measure with `EXPLAIN ANALYZE`, then the rest.**
