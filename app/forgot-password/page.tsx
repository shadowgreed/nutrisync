'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/components/I18nProvider'

// A-C2 (App Store 2.1 completeness): account recovery. Sends a Supabase reset
// email whose link routes through /auth/callback?next=/reset-password, where the
// user sets a new password.
export default function ForgotPasswordPage() {
  const supabase = createClient()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
      // Don't reveal whether an account exists — always show the same confirmation.
      if (error && !/rate limit|too many|for security/i.test(error.message)) {
        setError(t.common.genericError)
        return
      }
      setSent(true)
    } catch {
      setError(t.common.networkError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-2xl font-bold">{t.auth.resetTitle}</h1>
        {sent ? (
          <div className="mt-4 space-y-4">
            <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-2xl px-4 py-3">
              <p className="text-emerald-200 text-sm">
                {t.auth.resetSentPrefix} <span className="font-medium">{email.trim()}</span>{t.auth.resetSentSuffix}
              </p>
            </div>
            <Link href="/login" className="block text-center text-emerald-400 hover:text-emerald-300 text-sm">{t.auth.backToSignIn}</Link>
          </div>
        ) : (
          <>
            <p className="text-stone-400 text-sm mt-1">{t.auth.resetIntro}</p>
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder={t.auth.exampleEmail} required autoComplete="email"
                aria-label={t.auth.emailAria}
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {error && (
                <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3"><p className="text-red-400 text-sm">{error}</p></div>
              )}
              <button type="submit" disabled={loading || !email.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
                {loading ? t.auth.sending : t.auth.sendResetLink}
              </button>
            </form>
            <Link href="/login" className="block text-center text-stone-400 hover:text-stone-300 text-sm mt-4">{t.auth.backToSignIn}</Link>
          </>
        )}
      </div>
    </div>
  )
}
