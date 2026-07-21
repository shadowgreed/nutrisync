import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseJson, badRequest } from '@/lib/validate'
import { FOOD_UNIT_COOKIE, isFoodUnit } from '@/lib/foodUnit'

// Persist the food serving-size unit preference (grams vs ounces). Mirrors
// /api/language exactly, and for the same reason: the device cookie is set
// SERVER-side (Safari caps JS-written cookies at 7 days; Set-Cookie headers
// are exempt) and always succeeds, while profiles.food_unit — the cross-device
// source of truth — is written only when a session exists AND migration 055
// has been applied. This is what makes the preference stick regardless of
// database state; the column is an upgrade, never a requirement.
//
// Response reports where the preference actually landed so the UI never shows
// a false "saved": { ok, account } — account=false means device-only (no
// session, or migration 055 not applied yet).
export async function POST(req: NextRequest) {
  const body = await parseJson<{ unit?: string }>(req)
  const unit = body?.unit
  if (!isFoodUnit(unit)) return badRequest('Unsupported unit')

  let account = false
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error } = await supabase
        .from('profiles').update({ food_unit: unit }).eq('id', user.id)
      // PGRST204 / column-missing → migration 055 not applied; device-only.
      account = !error
    }
  } catch { /* device-only */ }

  const res = NextResponse.json({ ok: true, account })
  res.cookies.set(FOOD_UNIT_COOKIE, unit, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    // Readable by the client for instant UI; server pages read it as fallback.
    httpOnly: false,
  })
  return res
}
