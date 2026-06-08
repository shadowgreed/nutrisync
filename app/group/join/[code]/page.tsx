'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function JoinByLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data, error: rpcErr } = await supabase.rpc('join_group_by_code', { p_code: code })
      const row = Array.isArray(data) ? data[0] : data
      if (rpcErr || !row) { setError('Something went wrong. Please try again.'); return }

      switch (row.status) {
        case 'joined':
        case 'already_member':
          router.replace('/feed'); router.refresh(); break
        case 'unauthenticated':
          router.replace(`/login?next=${encodeURIComponent(`/group/join/${code}`)}`); break
        case 'full':
          setError('This group is full (6 members max).'); break
        default:
          setError('That invite link didn’t match any group.')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4 text-center">
      <div className="w-full max-w-sm space-y-4">
        {error ? (
          <>
            <p className="text-4xl" aria-hidden="true">🔗</p>
            <p className="text-white font-medium">{error}</p>
            <Link href="/group/join" className="inline-block text-emerald-400 hover:text-emerald-300 text-sm font-medium">
              Enter a code manually →
            </Link>
          </>
        ) : (
          <>
            <Loader2 size={28} className="text-emerald-400 animate-spin mx-auto" aria-hidden="true" />
            <p className="text-stone-300 text-sm">Joining group…</p>
          </>
        )}
      </div>
    </div>
  )
}
