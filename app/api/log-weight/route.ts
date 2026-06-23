import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/analytics'

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

  // Goal-weight milestone — celebrate crossing a 25% increment toward the goal.
  try {
    const { data: profile } = await supabase
      .from('profiles').select('target_weight_kg').eq('id', user.id).single()
    const targetKg = profile?.target_weight_kg as number | null
    const { data: firstRow } = await supabase
      .from('weight_logs').select('weight_kg').eq('user_id', user.id)
      .order('logged_at', { ascending: true }).limit(1).maybeSingle()
    const startKg = firstRow?.weight_kg as number | undefined
    if (targetKg != null && startKg != null && Math.abs(startKg - targetKg) > 0.05) {
      const total = Math.abs(startKg - targetKg)
      const progressed = startKg > targetKg ? startKg - w : w - startKg
      const pct = Math.max(0, Math.min(100, Math.round((progressed / total) * 100)))
      const milestone = Math.floor(pct / 25) * 25 // 0,25,50,75,100
      if (milestone >= 25) {
        await supabase.from('milestones').upsert(
          { user_id: user.id, type: 'goal_weight', key: `goal-${milestone}`, data: { pct: milestone } },
          { onConflict: 'user_id,type,key', ignoreDuplicates: true },
        )
      }
    }
  } catch (e) {
    console.warn('goal milestone check failed (non-fatal):', e)
  }

  await logEvent(supabase, user.id, 'weight_logged', { weight_kg: w })
  return NextResponse.json({ log: data })
}
