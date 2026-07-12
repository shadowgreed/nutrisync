import { NextResponse } from 'next/server'

/**
 * Fail-closed auth for cron routes (audit PR-06).
 *
 * The previous pattern in all three cron routes was:
 *
 *   if (process.env.CRON_SECRET) { ...check header... }
 *
 * — no `else` branch, so an unset env var meant NO auth at all on routes that
 * run under the admin (service-role) client. A missing secret is a deploy
 * configuration error and must refuse to run, not silently open the door.
 *
 * Usage (first line of the route handler):
 *
 *   const denied = requireCronAuth(req)
 *   if (denied) return denied
 *
 * Returns the error response to send when the request is NOT authorized,
 * or null when it may proceed.
 */
export function requireCronAuth(req: { headers: { get(name: string): string | null } }): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // Deploy misconfiguration — fail closed and make it loud in the logs.
    console.error('CRON_SECRET is not set — refusing to run cron route (fail closed).')
    return NextResponse.json({ error: 'Cron auth not configured' }, { status: 500 })
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
