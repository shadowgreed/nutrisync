'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// Landing for the password-reset email link. /auth/callback exchanges the
// recovery code for a session, then sends the user here to choose a new password.
export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
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
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords don’t match.'); return }
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) { setError(/same.*password/i.test(error.message) ? 'Choose a password different from your old one.' : 'Couldn’t update your password. The link may have expired.'); return }
      setDone(true)
      setTimeout(() => { router.push('/dashboard'); router.refresh() }, 1400)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-white text-2xl font-bold">Choose a new password</h1>

        {!ready ? (
          <p className="text-stone-400 text-sm mt-3">Loading…</p>
        ) : done ? (
          <div className="mt-4 bg-emerald-950/40 border border-emerald-800/50 rounded-2xl px-4 py-3">
            <p className="text-emerald-200 text-sm">Password updated ✓ Taking you to your dashboard…</p>
          </div>
        ) : !hasSession ? (
          <div className="mt-4 space-y-4">
            <div className="bg-amber-950/40 border border-amber-800/50 rounded-2xl px-4 py-3">
              <p className="text-amber-200 text-sm">This reset link is invalid or has expired. Request a new one.</p>
            </div>
            <Link href="/forgot-password" className="block text-center bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-colors">Request a new link</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="New password" required autoComplete="new-password" aria-label="New password"
              className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Confirm new password" required autoComplete="new-password" aria-label="Confirm new password"
              className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3"><p className="text-red-400 text-sm">{error}</p></div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
