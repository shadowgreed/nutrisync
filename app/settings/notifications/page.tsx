import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PushToggle from '@/components/PushToggle'
import ReminderSettings from '@/components/ReminderSettings'
import { SettingsShell } from '../_ui'

// Single home for every notification control (PRD Screen 3): push enable + test,
// and the water/meal reminder schedule. Both auto-save.
export default async function NotificationsSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <SettingsShell title="Notifications & Reminders">
      <div className="px-4 space-y-3">
        <p className="text-stone-400 text-xs uppercase tracking-wider px-1">Push notifications</p>
        <PushToggle />
      </div>
      <div className="px-4 mt-5">
        <ReminderSettings />
      </div>
      <p className="px-5 mt-4 text-stone-400 text-[11px]">Changes save automatically.</p>
    </SettingsShell>
  )
}
