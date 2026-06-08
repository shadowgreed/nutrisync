// Compute the current logging streak: consecutive days (ending today, with a
// one-day grace if today isn't logged yet) that have at least one food log.

function dayKey(d: Date): string {
  // Local-date key YYYY-MM-DD, consistent with the dashboard's local "today" math
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * @param loggedAtTimestamps ISO timestamps of the user's food logs (any order)
 * @returns number of consecutive logged days ending today (today not yet logged
 *          still counts the streak as alive via yesterday)
 */
export function computeStreak(loggedAtTimestamps: string[]): number {
  if (!loggedAtTimestamps.length) return 0

  const days = new Set(loggedAtTimestamps.map(ts => dayKey(new Date(ts))))

  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  // Grace: if today hasn't been logged yet, start counting from yesterday so the
  // streak doesn't read as broken mid-day before the user logs.
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!days.has(dayKey(cursor))) return 0
  }

  let streak = 0
  while (days.has(dayKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
