// Compute the current logging streak: consecutive days (ending today, with a
// one-day grace if today isn't logged yet) that have at least one food log.
//
// Days are bucketed in the USER's timezone (Phase 8). Pass `timeZone` so the
// streak matches what the user sees as "today"; when omitted it defaults to the
// runtime's zone (UTC on the server) — preserving the pre-Phase-8 behavior for
// any caller not yet converted.

import { userDayKey, prevDayKey } from './day'

function runtimeTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/**
 * @param loggedAtTimestamps ISO timestamps of the user's food logs (any order)
 * @param opts.timeZone IANA zone to bucket days in (the user's). Defaults to the
 *        runtime zone for backward compatibility.
 * @param opts.now override "now" (for testing).
 * @returns number of consecutive logged days ending today (today not yet logged
 *          still counts the streak as alive via yesterday).
 */
export function computeStreak(
  loggedAtTimestamps: string[],
  opts: { timeZone?: string; now?: Date } = {},
): number {
  if (!loggedAtTimestamps.length) return 0

  const tz = opts.timeZone ?? runtimeTimeZone()
  const now = opts.now ?? new Date()

  const days = new Set(loggedAtTimestamps.map(ts => userDayKey(ts, tz)))

  let cursor = userDayKey(now, tz)

  // Grace: if today hasn't been logged yet, start counting from yesterday so the
  // streak doesn't read as broken mid-day before the user logs.
  if (!days.has(cursor)) {
    cursor = prevDayKey(cursor)
    if (!days.has(cursor)) return 0
  }

  let streak = 0
  while (days.has(cursor)) {
    streak++
    cursor = prevDayKey(cursor)
  }
  return streak
}
