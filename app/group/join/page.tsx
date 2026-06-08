'use client'

export const dynamic = 'force-dynamic'

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: group } = await supabase
      .from('groups')
      .select('id, name')
      .eq('invite_code', code.trim().toLowerCase())
      .single()

    if (!group) { setError('Invalid invite code'); setLoading(false); return }

    // Check member count (max 6 for test)
    const { count } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group.id)

    if ((count ?? 0) >= 6) { setError('This group is full (6 members max)'); setLoading(false); return }

    const { error: joinErr } = await supabase
      .from('group_members')
      .upsert({ group_id: group.id, user_id: user.id })

    if (joinErr) { setError('Failed to join'); setLoading(false); return }

    router.push('/feed')
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
