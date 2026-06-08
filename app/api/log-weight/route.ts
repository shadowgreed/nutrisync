import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weight_kg } = await req.json()
  const w = Number(weight_kg)
  if (!Number.isFinite(w) || w <= 0 || w > 500) {
    return NextResponse.json({ error: 'Invalid weight' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('weight_logs')
    .insert({ user_id: user.id, weight_kg: w })
    .select()
    .single()

  if (error) {
    // Likely the weight_logs table doesn't exist yet (migration 008 not applied)
    if (error.code === '42P01' || /weight_logs/.test(error.message)) {
      return NextResponse.json({ error: 'Weight history not set up. Apply migration 008.' }, { status: 503 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Keep the profile's current weight in sync
  await supabase.from('profiles').update({ weight_kg: w }).eq('id', user.id)

  return NextResponse.json({ log: data })
}
