'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// NOTE: Magic-link sign-in is temporarily hidden (Supabase's built-in email is
// rate-limited during development). Re-enable it before public sharing — the old
// signInWithOtp flow lived here and can be restored from git history.

// Turn raw Supabase auth errors into something a non-technical friend understands.
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'That email already has an account — try signing in instead.'
  }
  if (m.includes('invalid login credentials')) {
    return 'Email or password is incorrect.'
  }
  if (m.includes('rate limit') || m.includes('too many') || m.includes('for security purposes')) {
    return 'Too many attempts right now — please wait a minute and try again.'
  }
  if (m.includes('password')) {
    return 'Password must be at least 6 characters.'
  }
  return message
}

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) { setError(friendlyAuthError(error.message)); return }
        if (!data.session) {
          // No instant session means email confirmation is on — the user must
          // click the link we just emailed before they can sign in.
          setNotice('Account created! Check your email for a confirmation link, then come back and sign in.')
          setMode('signin')
          return
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setError(friendlyAuthError(error.message)); return }
      }

      const next = new URLSearchParams(window.location.search).get('next') || '/dashboard'
      router.push(next)
      router.refresh()
    } catch {
      // Network failure, CORS, etc. — without this the button would spin forever.
      setError('Something went wrong. Check your connection and try again.')
    } finally {
      // Always clear the spinner so the screen can never get stuck on "Please wait…".
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3" aria-hidden="true">🌿</div>
          <h1 className="text-2xl font-bold text-white">NutriSync</h1>
          <p className="text-stone-400 text-sm mt-1">Track every nutrient. See what your crew eats.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {notice && <p className="text-amber-300 text-sm">{notice}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-stone-400 text-sm mt-5">
          {mode === 'signup' ? 'Already have an account?' : 'New here?'}{' '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setNotice('') }}
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            {mode === 'signup' ? 'Sign in' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  )
}
