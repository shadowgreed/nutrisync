# Timezone Standardization (PRD Phase 8 / audit H1)

## Problem

A "day" was computed two different ways:
- **UTC** via `logged_at.slice(0,10)` / `toISOString().slice(0,10)` — `lib/weekly.ts`, `lib/water.ts`, `lib/coach-intel.ts`, `app/trends`, `app/coach`.
- **Runtime-local** via `toLocaleDateString('en-CA')` / `getFullYear()` — `app/dashboard`, `app/log`, `app/challenges`, `lib/weekly-review.ts`, `components/MiniProfileModal`.

On the server (UTC on Vercel) "runtime-local" *is* UTC, but on the client it's the device zone — so the same log can land on different days depending on where the bucketing runs. Near midnight this corrupts **streaks, weekly reports, and challenge day-buckets**.

Worse: **`profiles.reminder_timezone` was never written** (only read by cron, which defaulted everyone to `America/New_York`). There was no source of truth for "the user's timezone."

## The standard

`lib/day.ts` is the single source of truth. A day key is always the calendar date **in an explicit IANA timezone**, computed with `Intl` (identical on server and client):

```ts
userDayKey(ts, tz)        // 'YYYY-MM-DD' for `ts` in `tz`
todayKey(tz)              // today's key in `tz`
prevDayKey(key) / nextDayKey(key)  // DST-safe calendar arithmetic on a key
resolveTimeZone(tz?)      // validate a stored zone, fall back to DEFAULT_TZ
getBrowserTimeZone()      // the device zone (client)
```

Callers pass the **user's** zone (`profiles.reminder_timezone`, via `resolveTimeZone`). The correctness of `userDayKey` / `prevDayKey` / streak-across-midnight / DST is proven by `scripts/verify-day.mjs` (`node scripts/verify-day.mjs`).

## Shipped in this increment

1. **Timezone capture** — `components/TimeZoneSync` writes the device IANA zone to `profiles.reminder_timezone` on dashboard load (once per device/zone). This was the missing foundation; it **also fixes the reminder/weekly/coach-digest crons**, which previously assumed `America/New_York` for everyone.
2. **`computeStreak` is timezone-aware** (`computeStreak(ts, { timeZone })`), defaulting to the runtime zone so unconverted callers are unchanged.
3. **The user's own streak is converted end-to-end** to their zone: `app/dashboard/page.tsx`, `app/weekly/page.tsx`, `app/profile/page.tsx`, and the `app/api/log-meal` milestone check.
4. **Weekly Review buckets** (`lib/weekly-review.ts`) — food/activity/water day-buckets and best-day now use the viewer's zone (`timeZone` passed from `app/weekly/page.tsx`).
5. **Challenge buckets** (`lib/challenges.ts` `memberSuccessDays` + `app/challenges/page.tsx`) — success-days, activity/water buckets, "today", and the activity feed now use the viewer's zone. (Per-member zones for cross-tz groups are a documented refinement.)
6. **Proof** — `scripts/verify-day.mjs` (6 checks: cross-tz mapping, DST/rollover, streak-across-midnight, grace day, gap break).

No DB migration needed — `reminder_timezone` already exists (migration 013); we simply start populating it.

## Remaining surface (next increments)

Convert day-bucketing to `userDayKey(ts, tz)` with the user's zone, table by table (each is independent and low-risk once the zone is threaded in):

| Area | File(s) | Current | Action |
|---|---|---|---|
| ~~Weekly Review buckets~~ | ~~`lib/weekly-review.ts`~~ | ✅ **done** | viewer `tz` threaded from `app/weekly` |
| ~~Challenge day buckets~~ | ~~`lib/challenges.ts` + `app/challenges/page.tsx`~~ | ✅ **done** (viewer tz) | per-member tz = future refinement |
| Weekly report (coach) | `lib/weekly.ts` (`dayKey = slice(0,10)`) | UTC | thread `tz` from coach/cron callers (`buildWeeklyReport`) |
| Hydration buckets | `lib/water.ts` (`dayKey = slice(0,10)`) | UTC | thread `tz` |
| Coach intel | `lib/coach-intel.ts` | UTC | thread member `tz` |
| Trends buckets | `app/trends` (`slice(0,10)`) + `lib/trends.ts` | UTC | thread `tz` |
| Peer streaks | `components/MiniProfileModal`, `app/weekly` (peer) | device-local | acceptable (relative ranking); convert opportunistically |
| Client "today" filters | `app/dashboard/DashboardClient`, `app/log`, `app/feed`, `app/profile` | device-local (`toLocaleDateString`) | already user-correct; migrate to `userDayKey` for one source of truth |

**Guidance:** server-side bucketing needs the user's `reminder_timezone` (now populated by capture); pass it through to the relevant `lib/*` function. Client-side "today" filters are already device-local (correct for the viewer) — migrate them to `lib/day` for consistency, not correctness.

## Verification checklist (per converted surface)

- [ ] `node scripts/verify-day.mjs` green.
- [ ] Log a meal at 23:30 local in a non-UTC zone → it counts toward *today's* streak/report/challenge, not tomorrow's.
- [ ] Streak shown on dashboard == weekly == profile for the same user.
