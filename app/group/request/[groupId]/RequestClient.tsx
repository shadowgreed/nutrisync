'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/components/I18nProvider'

type Status = 'loading' | 'requested' | 'already_member' | 'already_requested' | 'not_found' | 'error'

export default function RequestClient({ groupId }: { groupId: string }) {
  const { t } = useI18n()
  const g = t.groups
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
    loading: { emoji: '⏳', title: g.reqSending, sub: '' },
    requested: { emoji: '🙋', title: g.reqSentTitle, sub: g.reqSentSub(groupName) },
    already_requested: { emoji: '⏳', title: g.reqAlreadyTitle, sub: g.reqAlreadySub(groupName) },
    already_member: { emoji: '✅', title: g.reqMemberTitle, sub: g.reqMemberSub(groupName) },
    not_found: { emoji: '🤔', title: g.reqNotFoundTitle, sub: g.reqNotFoundSub },
    error: { emoji: '⚠️', title: g.reqErrorTitle, sub: g.reqErrorSub },
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
          {status === 'already_member' ? g.goFeed : g.goDashboardShort}
        </Link>
      </div>
    </div>
  )
}
