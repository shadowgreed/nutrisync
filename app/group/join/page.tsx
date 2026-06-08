'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function JoinGroupPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // SECURITY DEFINER RPC: finds the group by code and adds the membership,
    // bypassing the RLS rule that hides groups you're not yet a member of.
    const { data, error: rpcErr } = await supabase.rpc('join_group_by_code', { p_code: code })
    const row = Array.isArray(data) ? data[0] : data
    setLoading(false)

    if (rpcErr || !row) { setError('Something went wrong. Please try again.'); return }

    switch (row.status) {
      case 'joined':
      case 'already_member':
        router.push('/feed'); router.refresh(); break
      case 'unauthenticated':
        router.push('/login'); break
      case 'full':
        setError('This group is full (6 members max).'); break
      default:
        setError('That invite code didn’t match any group.')
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <Link href="/dashboard" className="text-stone-400 text-sm hover:text-stone-300">← Back</Link>
          <h1 className="text-white text-2xl font-bold mt-4">Join a group</h1>
          <p className="text-stone-400 text-sm mt-1">Enter the 8-character invite code</p>
        </div>
        <form onSubmit={handleJoin} className="space-y-4">
          <input
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="e.g. a1b2c3d4"
            required
            maxLength={8}
            className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-white placeholder-stone-500 text-center text-lg tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || code.trim().length < 6}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Joining…' : 'Join group'}
          </button>
        </form>
      </div>
    </div>
  )
}
