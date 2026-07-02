import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isLocale, LOCALE_COOKIE } from '@/lib/i18n'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  // /api/cron does its own CRON_SECRET auth and is called without a user session.
  // Legal/about + Help Center pages are public so they can be shared and linked.
  const isPublic = pathname.startsWith('/login') || pathname.startsWith('/auth') || pathname.startsWith('/api/cron')
    || pathname === '/privacy' || pathname === '/terms' || pathname === '/about'
    || pathname.startsWith('/help')
    || pathname === '/forgot-password' || pathname === '/reset-password'

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Language backfill: a signed-in user on a device with no locale cookie (new
  // phone, reinstalled PWA, cleared storage) gets their saved account language
  // without having to re-pick it. One extra query only in that state — once the
  // cookie is set this branch never runs again.
  if (user && !request.cookies.get(LOCALE_COOKIE)) {
    try {
      const { data: prof } = await supabase
        .from('profiles').select('language').eq('id', user.id).single()
      if (isLocale(prof?.language)) {
        supabaseResponse.cookies.set(LOCALE_COOKIE, prof.language, {
          path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: false,
        })
      }
    } catch { /* missing column (migration 051) or transient error — skip */ }
  }

  return supabaseResponse
}

export const config = {
  // Skip auth on static assets AND the PWA files (manifest + service worker) so
  // they load without a session — browsers fetch these unauthenticated.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
