'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Status = 'loading' | 'requested' | 'already_member' | 'already_requested' | 'not_found' | 'error'

export default function RequestClient({ groupId }: { groupId: string }) {
  const [status, setStatus] = useState<Status>('loading')
  const [groupName, setGroupName] = useState<string>('')

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('request_group_join', { p_group_id: groupId })
      if (error) { setStatus('error'); return }
      const row = Array.isArray(data) ? data[0] : data
      setGroupName(row?.group_name ?? '')
      const s = row?.status as string
      if (s === 'requested') setStatus('requested')
      else if (s === 'already_member') setStatus('already_member')
      else if (s === 'already_requested') setStatus('already_requested')
      else setStatus('not_found')
    })()
  }, [groupId])

  const body = {
    loading: { emoji: '⏳', title: 'Sending your request…', sub: '' },
    requested: { emoji: '🙋', title: 'Request sent!', sub: `The founder of ${groupName} will review your request to join. You'll get a notification when you're approved.` },
    already_requested: { emoji: '⏳', title: 'Already requested', sub: `Your request to join ${groupName} is still waiting for the founder's approval.` },
    already_member: { emoji: '✅', title: "You're already in!", sub: `You're already a member of ${groupName}.` },
    not_found: { emoji: '🤔', title: 'Group not found', sub: 'This invite link looks invalid or the group no longer exists.' },
    error: { emoji: '⚠️', title: 'Something went wrong', sub: 'Please try the link again.' },
  }[status]

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="text-5xl">{body.emoji}</div>
        <h1 className="text-white text-xl font-bold">{body.title}</h1>
        {body.sub && <p className="text-stone-400 text-sm">{body.sub}</p>}
        <Link
          href={status === 'already_member' ? '/feed' : '/dashboard'}
          className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-3 rounded-2xl transition-colors"
        >
          {status === 'already_member' ? 'Go to feed' : 'Go to dashboard'}
        </Link>
      </div>
    </div>
  )
}
