import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseJson, badRequest } from '@/lib/validate'
import { isLocale, LOCALE_COOKIE } from '@/lib/i18n'

// Persist the language preference. Sets the device cookie SERVER-side (Safari
// caps JS-written cookies at 7 days; Set-Cookie headers are exempt) and, when a
// session exists, writes profiles.language — the cross-device source of truth.
// Anonymous calls are allowed: the login-page picker runs before any account
// exists and only needs the cookie.
//
// Response reports where the preference actually landed so the UI never shows
// a false "saved": { ok, account } — account=false means device-only (no
// session, or migration 051 not applied yet).
export async function POST(req: NextRequest) {
  const body = await parseJson<{ language?: string }>(req)
  const language = body?.language
  if (!isLocale(language)) return badRequest('Unsupported language')

  let account = false
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error } = await supabase
        .from('profiles').update({ language }).eq('id', user.id)
      // PGRST204 / column-missing → migration 051 not applied; device-only.
      account = !error
    }
  } catch { /* device-only */ }

  const res = NextResponse.json({ ok: true, account })
  res.cookies.set(LOCALE_COOKIE, language, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    // Readable by the client for instant UI; the layout reads it server-side.
    httpOnly: false,
  })
  return res
}
