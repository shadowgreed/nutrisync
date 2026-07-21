import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '../dashboard/DashboardClient'
import LogClient from './LogClient'

export default async function LogPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { tab } = await searchParams
  const initialTab = tab === 'activity' ? 'activity' : 'food'

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const [{ data: profile }, { data: recentActivities }] = await Promise.all([
    supabase
      .from('profiles')
      .select('weight_kg, food_unit')
      .eq('id', user.id)
      .single(),
    // Recent activity for today's progress + the "Log again" cards.
    supabase
      .from('activity_logs')
      .select('activity_name, duration_minutes, distance_km, steps, logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', since30)
      .order('logged_at', { ascending: false }),
  ])

  return (
    <div className="min-h-screen bg-stone-950 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <div className="px-4 pt-safe pb-6">
        <p className="text-stone-400 text-sm">Track your day</p>
        <h1 className="text-white text-2xl font-bold mt-0.5">Log</h1>
      </div>
      <div className="px-4">
        <LogClient
          weightKg={profile?.weight_kg ?? 70}
          foodUnit={(profile?.food_unit as 'g' | 'oz') ?? 'g'}
          initialTab={initialTab}
          recentActivities={(recentActivities ?? []) as { activity_name: string; duration_minutes: number | null; distance_km: number | null; steps: number | null; logged_at: string }[]}
        />
      </div>
      <BottomNav active="log" />
    </div>
  )
}
