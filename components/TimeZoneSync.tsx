'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getBrowserTimeZone } from '@/lib/day'

// Captures the device's IANA timezone into profiles.reminder_timezone (which was
// previously never written — cron + day-key math defaulted everyone to one zone).
// Runs once per device per timezone; updates only when it actually changed.
// Mounted on the dashboard (the post-login landing screen).
export default function TimeZoneSync() {
  useEffect(() => {
    const tz = getBrowserTimeZone()
    if (!tz) return
    const cacheKey = 'ns_tz_synced'
    try {
      if (localStorage.getItem(cacheKey) === tz) return
    } catch { /* private mode — proceed */ }

    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('profiles').select('reminder_timezone').eq('id', user.id).single()
        if (data?.reminder_timezone !== tz) {
          await supabase.from('profiles').update({ reminder_timezone: tz }).eq('id', user.id)
        }
        try { localStorage.setItem(cacheKey, tz) } catch { /* ignore */ }
      } catch { /* best-effort */ }
    })()
  }, [])

  return null
}
