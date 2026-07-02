'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/components/I18nProvider'

// Landing for the password-reset email link. /auth/callback exchanges the
// recovery code for a session, then sends the user here to choose a new password.
export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useI18n()
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setHasSession(!!user)
      setReady(true)
    })()
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError(t.auth.errPasswordLength); return }
    if (password !== confirm) { setError(t.auth.errPasswordsDontMatch); return }
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) { setError(/same.*password/i.test(error.message) ? t.auth.errSamePassword : t.auth.errUpdateFailed); return }
      setDone(true)
      setTimeout(() => { router.push('/dashboard'); router.refresh() }, 1400)
    } catch {
      setError(t.common.genericError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-2xl font-bold">{t.auth.choosePasswordTitle}</h1>

        {!ready ? (
          <p className="text-stone-400 text-sm mt-3">{t.common.loading}</p>
        ) : done ? (
          <div className="mt-4 bg-emerald-950/40 border border-emerald-800/50 rounded-2xl px-4 py-3">
            <p className="text-emerald-200 text-sm">{t.auth.passwordUpdated}</p>
          </div>
        ) : !hasSession ? (
          <div className="mt-4 space-y-4">
            <div className="bg-amber-950/40 border border-amber-800/50 rounded-2xl px-4 py-3">
              <p className="text-amber-200 text-sm">{t.auth.linkExpired}</p>
            </div>
            <Link href="/forgot-password" className="block text-center bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-colors">{t.auth.requestNewLink}</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={t.auth.newPasswordPlaceholder} required autoComplete="new-password" aria-label={t.auth.newPasswordPlaceholder}
              className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder={t.auth.confirmPasswordPlaceholder} required autoComplete="new-password" aria-label={t.auth.confirmPasswordPlaceholder}
              className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3"><p className="text-red-400 text-sm">{error}</p></div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
              {loading ? t.auth.updating : t.auth.updatePassword}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
