'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function CreateGroupPage() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({ name: name.trim(), created_by: user.id })
      .select()
      .single()

    if (groupError || !group) {
      setError(groupError?.message ?? 'Failed to create group. Make sure you are logged in.')
      setLoading(false)
      return
    }

    // Creator joins their own group
    await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id })
    setInviteCode(group.invite_code)
    setLoading(false)
  }

  const inviteUrl = inviteCode ? `${window.location.origin}/group/join/${inviteCode}` : ''

  if (inviteCode) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-white text-xl font-bold">Group created!</h2>
            <p className="text-stone-400 text-sm mt-1">Share this link with up to 5 people</p>
          </div>
          <div className="bg-stone-900 border border-stone-700 rounded-2xl p-4 space-y-3">
            <p className="text-stone-400 text-xs uppercase tracking-wider">Invite link</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-emerald-400 text-sm break-all">{inviteUrl}</code>
              <button
                onClick={() => navigator.clipboard.writeText(inviteUrl)}
                className="shrink-0 bg-stone-800 hover:bg-stone-700 text-white text-xs px-3 py-2 rounded-xl transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
          <Link href="/dashboard" className="block text-center bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-colors">
            Go to dashboard →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <Link href="/dashboard" className="text-stone-400 text-sm hover:text-stone-300">← Back</Link>
          <h1 className="text-white text-2xl font-bold mt-4">Create a group</h1>
          <p className="text-stone-400 text-sm mt-1">You'll get an invite link to share with your 5 users</p>
        </div>
        <form onSubmit={handleCreate} className="space-y-4">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Group name (e.g. NutriCrew)"
            required
            className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Creating…' : 'Create group & get invite link'}
          </button>
        </form>
        <p className="text-center text-stone-400 text-xs">
          Already have a code?{' '}
          <Link href="/group/join" className="text-emerald-500 hover:text-emerald-400">Join a group</Link>
        </p>
      </div>
    </div>
  )
}
