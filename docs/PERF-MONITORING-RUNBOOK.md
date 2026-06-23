# Performance Validation & Monitoring Runbook

Operational companion to `docs/P0-PERFORMANCE-SPRINT.md`. Covers PRD **Phase 4 (validation)**, **Phase 5 (pg_stat_statements)**, and **Phase 6 (dashboard)**. These run against the **live Supabase database** (SQL Editor) — they are not app code. Migrations `044` (indexes) and `045` (analytics) are deployed separately.

---

## Phase 4 — Index validation (before / after with `EXPLAIN ANALYZE`)

Run each query **before** applying `044`, then **after**, and record the numbers. Replace `:uid` / `:gid` with real IDs and set a realistic `logged_at` window.

> Use `EXPLAIN (ANALYZE, BUFFERS)`. Look for **`Seq Scan` → `Index Scan` / `Bitmap Index Scan`** and a drop in `Execution Time`. RLS runs as the table owner in the SQL editor, so to measure the *real* policy cost, test as an end user via PostgREST or with `SET ROLE authenticated; SET request.jwt.claims …` (Supabase) — otherwise RLS predicates are skipped.

```sql
-- 1. Dashboard / streak: a user's recent food logs
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM food_logs
WHERE user_id = ':uid' AND logged_at >= now() - interval '60 days'
ORDER BY logged_at DESC;

-- 2. Feed: members' shared meals (the LIMIT 100 newest-first scan)
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM food_logs
WHERE user_id = ANY(ARRAY[:uid1, :uid2, :uid3]::uuid[])
  AND shared_to_feed AND logged_at >= now() - interval '7 days'
ORDER BY logged_at DESC LIMIT 100;

-- 3. Feed: reactions / comments for a page of logs
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM reactions  WHERE food_log_id = ANY(ARRAY[:logid1, :logid2]::uuid[]);
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM comments   WHERE food_log_id = ANY(ARRAY[:logid1, :logid2]::uuid[]);

-- 4. RLS keystone: the group-member helper
EXPLAIN (ANALYZE, BUFFERS)
SELECT group_id FROM group_members WHERE user_id = ':uid';

-- 5. Trends: weight 90d / activity 30d / water 30d (same shape — pick one)
EXPLAIN (ANALYZE, BUFFERS)
SELECT weight_kg, logged_at FROM weight_logs
WHERE user_id = ':uid' AND logged_at >= now() - interval '90 days'
ORDER BY logged_at;

-- 6. Challenges list
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM challenges WHERE group_id = ':gid' ORDER BY created_at DESC;
```

**Results template (deliverable for Phase 4):**

| Query | Plan before | Plan after | Exec before (ms) | Exec after (ms) | Improvement % |
|---|---|---|---|---|---|
| 1 Dashboard food_logs | Seq Scan | Index Scan | | | |
| 2 Feed food_logs | Seq Scan | Index/Bitmap | | | |
| 3 reactions/comments | Seq Scan | Index Scan | | | |
| 4 group_members helper | Seq Scan | Index Scan | | | |
| 5 trends weight/activity/water | Seq Scan | Index Scan | | | |
| 6 challenges | Seq Scan | Index Scan | | | |

**Acceptance:** no `Seq Scan` on any primary user-facing query at representative data volume.

**Index usage / bloat check (run weekly):**
```sql
SELECT relname AS table, indexrelname AS index, idx_scan AS scans,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;   -- scans = 0 after a week → candidate to drop (bloat)
```

---

## Phase 5 — `pg_stat_statements` + weekly engineering report

**Enable (one-time):**
```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;  -- Supabase: also enable in Dashboard → Database → Extensions
-- shared_preload_libraries is already set on Supabase; the extension just needs creating.
```

**Top-20 weekly report queries** (durations are in ms):
```sql
-- Slowest by total time (where you should spend optimization effort)
SELECT
  left(query, 120)                       AS query,
  calls,
  round(total_exec_time::numeric, 1)     AS total_ms,
  round(mean_exec_time::numeric, 2)      AS avg_ms,
  round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 1) AS pct_total
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- Most frequent (hot paths)
SELECT left(query, 120) AS query, calls, round(mean_exec_time::numeric, 2) AS avg_ms
FROM pg_stat_statements ORDER BY calls DESC LIMIT 20;
```

> **P95 / P99:** `pg_stat_statements` exposes `mean`, `min`, `max`, and `stddev` per statement (not true percentiles). For real P95/P99 latency, use **Supabase Logs/Reports** (built-in query latency) or **Sentry/PostHog** request tracing (Phase 6). Document mean + max from `pg_stat_statements` in the weekly report and percentiles from the APM tool.

**Reset the window** before each weekly snapshot: `SELECT pg_stat_statements_reset();`

---

## Phase 6 — Performance dashboard

**Metrics to chart (targets from the PRD):**

| Metric | Source | Target |
|---|---|---|
| Feed DB time | `pg_stat_statements` (feed queries) / APM span | < 200 ms |
| Dashboard DB time | same | < 100 ms |
| Trends response | same | < 250 ms |
| Challenge query | same | < 200 ms |
| Weekly report generation | app span around `app/weekly/page.tsx` build | 30% faster vs baseline |

**Platform options (pick one — all integrate cleanly):**
- **Supabase Reports/Advisors** — zero-setup query latency + the built-in index/performance advisor. Start here.
- **Sentry Performance** — wrap server pages/routes in spans for true P95/P99 per route; alerts on regression.
- **PostHog** — pairs request timing with the product funnel now that `app_events` (migration 045) exists, so you can correlate latency with activation/retention.

**Regression guardrail (Phase 1 risk: schema drift):** add a CI/PR checklist item — *"new high-frequency query? add/confirm a supporting index and paste `EXPLAIN ANALYZE`."* Re-run the §4 index-usage query weekly to catch unused indexes (bloat) and missing ones (new seq scans).

---

## Cross-reference

- **Indexes:** `supabase/migrations/044_performance_indexes.sql` (deployed).
- **Analytics events:** `supabase/migrations/045_app_events.sql` + `lib/analytics.ts` / `lib/analytics-client.ts` — feed PostHog/Amplitude or query directly:
  ```sql
  SELECT event, count(*) FROM app_events
  WHERE created_at >= now() - interval '7 days' GROUP BY event ORDER BY 2 DESC;
  ```
- **Timezone standardization (PRD Phase 8):** tracked separately — it's a behavior-changing refactor of day-key logic (audit finding H1), not part of this indexing/observability sprint.
