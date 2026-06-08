import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { activity_name, duration_minutes, calories_burned } = await req.json()
  if (!activity_name || !duration_minutes) {
    return NextResponse.json({ error: 'activity_name and duration_minutes required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('activity_logs')
    .insert({ user_id: user.id, activity_name, duration_minutes, calories_burned: calories_burned ?? 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ activity: data })
}
