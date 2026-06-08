'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * Bell icon with a live unread-count badge. Fetches the initial count and then
 * subscribes to Supabase realtime so the badge updates the moment a new
 * notification row is inserted for the current user.
 */
export default function NotificationBell() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let active = true

    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return

      const { count: c } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
      if (active) setCount(c ?? 0)

      channel = supabase
        .channel(`notif-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => setCount(prev => prev + 1),
        )
        .subscribe()
    })()

    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  return (
    <Link
      href="/notifications"
      aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
      className="relative flex items-center justify-center w-11 h-11 -m-1 text-stone-300 hover:text-white transition-colors"
    >
      <Bell size={20} aria-hidden="true" />
      {count > 0 && (
        <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full tabular-nums">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
