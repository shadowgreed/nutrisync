'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/analytics-client'
import { useI18n, setLocaleCookie } from '@/components/I18nProvider'
import { LOCALES, isLocale, type Locale, type Dict } from '@/lib/i18n'

const TERMS_VERSION = '2026-06-14'

// NOTE: Magic-link sign-in is temporarily hidden (Supabase's built-in email is
// rate-limited during development). Re-enable it before public sharing — the old
// signInWithOtp flow lived here and can be restored from git history.

// Turn raw Supabase auth errors into something a non-technical friend
// understands, in the user's language.
function friendlyAuthError(message: string, t: Dict): string {
  const m = message.toLowerCase()
  if (m.includes('already registered') || m.includes('already been registered')) {
    return t.auth.errAlreadyRegistered
  }
  if (m.includes('invalid login credentials')) {
    return t.auth.errInvalidCredentials
  }
  if (m.includes('rate limit') || m.includes('too many') || m.includes('for security purposes')) {
    return t.auth.errRateLimited
  }
  if (m.includes('password')) {
    return t.auth.errPasswordLength
  }
  return message
}

const LOCALE_NAMES: Record<Locale, string> = { en: 'English', es: 'Español' }

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const { t, locale } = useI18n()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Pre-auth language switch. The JS cookie flips the page instantly; the API
  // call runs in the background to replace it with a server-set cookie (immune
  // to Safari's 7-day JS-cookie cap) — no need to block the UI on it.
  function switchLocale(next: Locale) {
    if (next === locale) return
    setLocaleCookie(next)
    fetch('/api/language', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: next }),
    }).catch(() => { /* offline — the JS cookie still holds */ })
    router.refresh()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) { setError(friendlyAuthError(error.message, t)); return }
        // Record consent (timestamp + terms version) for the audit trail. Best-effort.
        try {
          await fetch('/api/consent', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: TERMS_VERSION }),
          })
        } catch { /* non-blocking */ }
        if (!data.session) {
          // No instant session means email confirmation is on — the user must
          // click the link we just emailed before they can sign in. We can't
          // track signup here (no authenticated session yet); the first login
          // after confirmation is captured below instead. The language choice
          // lives in the cookie and is synced to the profile on first login.
          setNotice(t.auth.noticeConfirmEmail)
          setMode('signin')
          return
        }
        // Instant session (email confirmation off) — the signup is complete.
        track('signup', { method: 'password' })
        // Persist the language chosen at signup to the account (best-effort).
        try {
          await fetch('/api/language', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: locale }),
          })
        } catch { /* ignore */ }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setError(friendlyAuthError(error.message, t)); return }
        track('login', { method: 'password' })
        // The account's saved language wins over this device's cookie — and if
        // the account has none yet (signed up pre-confirmation), adopt the
        // device's choice. Best-effort either way.
        if (data.user) {
          try {
            const { data: prof } = await supabase
              .from('profiles').select('language').eq('id', data.user.id).single()
            // Account preference wins; a profile without one adopts this
            // device's choice. Either way the API route sets the cookie
            // server-side and keeps profile + cookie consistent.
            const wanted = isLocale(prof?.language) ? prof.language : locale
            await fetch('/api/language', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ language: wanted }),
            })
          } catch { /* ignore */ }
        }
      }

      const next = new URLSearchParams(window.location.search).get('next') || '/dashboard'
      router.push(next)
      router.refresh()
    } catch {
      // Network failure, CORS, etc. — without this the button would spin forever.
      setError(t.common.networkError)
    } finally {
      // Always clear the spinner so the screen can never get stuck on "Please wait…".
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Language picker — usable before any account exists */}
        <div className="flex justify-center mb-6" role="group" aria-label={t.auth.languageLabel}>
          <div className="flex bg-stone-900 border border-stone-800 rounded-xl p-1">
            {LOCALES.map(l => (
              <button
                key={l}
                type="button"
                onClick={() => switchLocale(l)}
                aria-pressed={locale === l}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  locale === l ? 'bg-emerald-700 text-white' : 'text-stone-400 hover:text-white'
                }`}
              >
                {LOCALE_NAMES[l]}
              </button>
            ))}
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="text-4xl mb-3" aria-hidden="true">🌿</div>
          <h1 className="text-2xl font-bold text-white">NutriSync</h1>
          <p className="text-stone-400 text-sm mt-1">{t.auth.tagline}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder={t.auth.emailPlaceholder}
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <input
            type="password"
            placeholder={t.auth.passwordPlaceholder}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />

          {mode === 'signin' && (
            <div className="text-right -mt-1">
              <Link href="/forgot-password" className="text-stone-400 hover:text-emerald-300 text-xs">{t.auth.forgotPassword}</Link>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {notice && <p className="text-amber-300 text-sm">{notice}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? t.auth.pleaseWait : mode === 'signup' ? t.auth.createAccount : t.auth.signIn}
          </button>

          {/* Consent — required acknowledgment with clickable links (Privacy/Legal). */}
          <p className="text-center text-stone-500 text-xs leading-relaxed">
            {mode === 'signup' ? t.auth.agreeCreating : t.auth.agreeContinuing}{' '}
            <Link href="/terms" className="text-emerald-400 hover:text-emerald-300 underline">{t.auth.terms}</Link>{' '}{t.auth.and}{' '}
            <Link href="/privacy" className="text-emerald-400 hover:text-emerald-300 underline">{t.auth.privacy}</Link>.
          </p>
        </form>

        <p className="text-center text-stone-400 text-sm mt-5">
          {mode === 'signup' ? t.auth.haveAccount : t.auth.newHere}{' '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setNotice('') }}
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            {mode === 'signup' ? t.auth.signInAction : t.auth.createOneAction}
          </button>
        </p>
      </div>
    </div>
  )
}
