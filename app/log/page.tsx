import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '../dashboard/DashboardClient'
import LogClient from './LogClient'

export default async function LogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('weight_kg')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-stone-950 pb-24">
      <div className="px-4 pt-12 pb-6">
        <p className="text-stone-400 text-sm">Track your day</p>
        <h1 className="text-white text-2xl font-bold mt-0.5">Log</h1>
      </div>
      <div className="px-4">
        <LogClient weightKg={profile?.weight_kg ?? 70} />
      </div>
      <BottomNav active="log" />
    </div>
  )
}
