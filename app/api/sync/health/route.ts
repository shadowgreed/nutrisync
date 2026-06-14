import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

// Ingest endpoint for wearable data (Apple Watch via an iOS Shortcuts automation,
// or anything that can POST JSON). Authenticated by the user's sync key, NOT a
// session — the Shortcut runs with no cookies.
//
// Body (all fields optional; send what you have):
// {
//   "date": "2026-06-14",        // local day these aggregates belong to
//   "steps": 8423,
//   "activeCalories": 540,        // Active Energy (kcal) for the day
//   "exerciseMinutes": 42,
//   "distanceKm": 6.1,
//   "workouts": [                 // optional individual sessions
//     { "id": "abc", "type": "Running", "start": "2026-06-14T07:00:00Z",
//       "durationMin": 32, "calories": 280, "distanceKm": 5.1 }
//   ]
// }
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const key = auth.startsWith('Bearer ') ? auth.slice(7).trim() : (req.nextUrl.searchParams.get('key') || '').trim()
  if (!key || key.length < 16) return NextResponse.json({ error: 'Missing or invalid sync key' }, { status: 401 })

  let admin
  try { admin = createAdminClient() }
  catch { return NextResponse.json({ error: 'Server not configured' }, { status: 500 }) }

  const { data: profile } = await admin.from('profiles').select('id').eq('sync_key', key).single()
  if (!profile) return NextResponse.json({ error: 'Unknown sync key' }, { status: 401 })
  const userId = profile.id as string

  if (!rateLimit(`sync:${userId}`, 60, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many syncs this hour' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
  const today = new Date().toISOString().slice(0, 10)
  const date = (typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) ? body.date : today

  const rows: Record<string, unknown>[] = []

  // Daily aggregate (steps / active energy / exercise minutes) — one row per day.
  const steps = num(body.steps)
  const activeCalories = num(body.activeCalories)
  const exerciseMinutes = num(body.exerciseMinutes)
  const distanceKm = num(body.distanceKm)
  if (steps != null || activeCalories != null || exerciseMinutes != null) {
    rows.push({
      user_id: userId,
      source: 'apple_health',
      external_id: `daily-${date}`,
      activity_name: 'Apple Watch',
      steps: steps != null ? Math.round(steps) : null,
      duration_minutes: exerciseMinutes != null ? Math.round(exerciseMinutes) : null,
      distance_km: distanceKm ?? null,
      calories_burned: activeCalories != null ? Math.round(activeCalories) : 0,
      logged_at: `${date}T12:00:00Z`,
    })
  }

  // Optional individual workouts.
  const workouts = Array.isArray(body.workouts) ? body.workouts : []
  for (const w of workouts.slice(0, 50)) {
    if (!w || typeof w !== 'object') continue
    const wk = w as Record<string, unknown>
    const id = typeof wk.id === 'string' ? wk.id : `${wk.type ?? 'workout'}-${wk.start ?? ''}`
    rows.push({
      user_id: userId,
      source: 'apple_health',
      external_id: `w-${id}`,
      activity_name: typeof wk.type === 'string' && wk.type ? wk.type : 'Workout',
      steps: num(wk.steps) != null ? Math.round(num(wk.steps)!) : null,
      duration_minutes: num(wk.durationMin) != null ? Math.round(num(wk.durationMin)!) : null,
      distance_km: num(wk.distanceKm) ?? null,
      calories_burned: num(wk.calories) != null ? Math.round(num(wk.calories)!) : 0,
      logged_at: typeof wk.start === 'string' ? wk.start : `${date}T12:00:00Z`,
    })
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Nothing to import — send steps, activeCalories, exerciseMinutes, or workouts' }, { status: 400 })
  }

  const { error } = await admin.from('activity_logs').upsert(rows, { onConflict: 'user_id,source,external_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, imported: rows.length })
}
