// Standalone correctness proof for the Phase 8 day-key + streak logic.
// Run: node scripts/verify-day.mjs   (no deps; Node 18+)
// Mirrors lib/day.ts / lib/streak.ts exactly — keep in sync if those change.

import assert from 'node:assert/strict'

const userDayKey = (ts, tz) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts))
const prevDayKey = (key) => { const d = new Date(key + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10) }

function computeStreak(timestamps, { timeZone, now }) {
  if (!timestamps.length) return 0
  const days = new Set(timestamps.map(ts => userDayKey(ts, timeZone)))
  let cursor = userDayKey(now, timeZone)
  if (!days.has(cursor)) { cursor = prevDayKey(cursor); if (!days.has(cursor)) return 0 }
  let n = 0
  while (days.has(cursor)) { n++; cursor = prevDayKey(cursor) }
  return n
}

let passed = 0
const ok = (desc, fn) => { fn(); passed++; console.log('  ✓', desc) }

console.log('day-key / timezone:')
// 2026-06-23 06:30 UTC is still June 22 (evening) in Los Angeles (UTC-7).
ok('UTC timestamp maps to the user\'s local calendar day', () => {
  const ts = '2026-06-23T06:30:00Z'
  assert.equal(userDayKey(ts, 'America/Los_Angeles'), '2026-06-22')
  assert.equal(userDayKey(ts, 'UTC'), '2026-06-23')
  assert.equal(userDayKey(ts, 'Asia/Tokyo'), '2026-06-23') // +9 → already the 23rd, 15:30
})
ok('prevDayKey rolls months/years and is DST-safe', () => {
  assert.equal(prevDayKey('2026-03-01'), '2026-02-28')
  assert.equal(prevDayKey('2026-01-01'), '2025-12-31')
  assert.equal(prevDayKey('2026-03-09'), '2026-03-08') // around US DST change
})

console.log('streak across midnight:')
// User in LA logged on their local 21st and 22nd. It's now 06:30 UTC on the 23rd
// (= 23:30 local on the 22nd). Streak should be 2 (today=22 logged, +21), NOT
// broken/0 as a UTC bucketing would compute (UTC "today"=23, unlogged → grace to
// 22... still works here, but the buckets themselves differ).
ok('local bucketing keeps the streak intact late at night', () => {
  const logs = ['2026-06-21T20:00:00Z', '2026-06-22T20:00:00Z'] // 1pm LA each day
  const now = new Date('2026-06-23T06:30:00Z') // 23:30 LA on the 22nd
  assert.equal(computeStreak(logs, { timeZone: 'America/Los_Angeles', now }), 2)
})
ok('UTC vs local can disagree by a day (the bug Phase 8 fixes)', () => {
  // A single log at 02:00 UTC on the 23rd = 22nd 21:00 in LA.
  const logs = ['2026-06-23T02:00:00Z']
  const now = new Date('2026-06-23T03:00:00Z')
  assert.equal(userDayKey(logs[0], 'UTC'), '2026-06-23')
  assert.equal(userDayKey(logs[0], 'America/Los_Angeles'), '2026-06-22')
  // Both still yield streak 1 here, but they attribute the log to different days,
  // which is what corrupts weekly/challenge day buckets.
  assert.equal(computeStreak(logs, { timeZone: 'America/Los_Angeles', now }), 1)
})
ok('grace day: today unlogged but yesterday logged → streak alive', () => {
  const logs = ['2026-06-22T15:00:00Z']
  const now = new Date('2026-06-23T15:00:00Z')
  assert.equal(computeStreak(logs, { timeZone: 'UTC', now }), 1)
})
ok('two-day gap breaks the streak', () => {
  const logs = ['2026-06-20T15:00:00Z']
  const now = new Date('2026-06-23T15:00:00Z')
  assert.equal(computeStreak(logs, { timeZone: 'UTC', now }), 0)
})

console.log(`\nAll ${passed} checks passed.`)
