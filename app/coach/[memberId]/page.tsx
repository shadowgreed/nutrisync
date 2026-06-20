import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { groupForCoachMember, assessMember, getDietOverride } from '@/lib/coach-server'
import { effectiveDiet, isDiet } from '@/lib/diets'
import { buildWaterWeek } from '@/lib/water'
import { calculateMacroTargets } from '@/lib/macros'
import { buildIntel, buildDailyTrends, type IntelFood, type IntelWater, type IntelActivity, type WeightPoint } from '@/lib/coach-intel'
import { inferVoice } from '@/lib/coach-voice'
import type { Diet, NutrientTotals, Goal } from '@/types'
import CoachMemberClient, { type CoachNote, type PendingDraft, type MiniPost } from './CoachMemberClient'

export const dynamic = 'force-dynamic'

interface MemberProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  calorie_target: number | null
  weight_kg: number | null
  privacy_mode: string | null
  coach_visible: boolean | null
  diet: string | null
  water_daily_target_ml: number | null
  goal: string | null
}

export default async function CoachMemberPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const groupId = await groupForCoachMember(supabase, user.id, memberId)
  if (!groupId) notFound()

  const [{ data: profile }, dietOverride] = await Promise.all([
    supabase.from('profiles')
      .select('id, display_name, avatar_url, calorie_target, weight_kg, privacy_mode, coach_visible, diet, water_daily_target_ml, goal')
      .eq('id', memberId)
      .single<MemberProfile>(),
    getDietOverride(supabase, user.id, memberId),
  ])
  if (!profile) notFound()
  if (profile.privacy_mode === 'dark' || profile.coach_visible === false) notFound()

  const memberDiet: Diet | null = isDiet(profile.diet) ? profile.diet : null
  const diet = effectiveDiet(memberDiet, dietOverride)

  const now = Date.now()
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)
  // 30 days of food/water/activity powers the intelligence engine (week +
  // prior-week comparison, behaviour patterns, compliance trends).
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { attention, signals, report, streak, priorReport },
    { data: noteRows }, { data: draftRow }, { data: waterRows }, { data: postRows },
    { data: intelFoodRows }, { data: intelActRows }, { data: weightRows },
    { data: historyRows }, { data: settingsRow }, { data: voiceRows },
  ] = await Promise.all([
    assessMember(supabase, memberId, profile.calorie_target ?? 2000, diet),
    supabase.from('coach_client_notes')
      .select('id, body, created_at')
      .eq('coach_id', user.id).eq('member_id', memberId).eq('group_id', groupId)
      .order('created_at', { ascending: false }),
    supabase.from('coach_message_drafts')
      .select('id, kind, draft_text, status, created_at')
      .eq('coach_id', user.id).eq('member_id', memberId).eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle(),
    supabase.from('water_logs')
      .select('logged_at, amount_ml')
      .eq('user_id', memberId).gte('logged_at', thirtyDaysAgo),
    // The member's 3 most recent posts shared to the group feed (RLS lets the
    // coach, a fellow group member, read shared logs). A glance at what they're
    // actually eating, to ground the check-in.
    supabase.from('food_logs')
      .select('id, meal_type, caption, total_calories, photo_url, logged_at')
      .eq('user_id', memberId).eq('shared_to_feed', true)
      .order('logged_at', { ascending: false })
      .limit(3),
    // Full 30-day food/activity/weight for the intelligence engine.
    supabase.from('food_logs')
      .select('logged_at, total_calories, macro_totals, nutrient_totals, meal_type')
      .eq('user_id', memberId).gte('logged_at', thirtyDaysAgo),
    supabase.from('activity_logs')
      .select('logged_at, calories_burned')
      .eq('user_id', memberId).gte('logged_at', thirtyDaysAgo),
    supabase.from('weight_logs')
      .select('logged_at, weight_kg')
      .eq('user_id', memberId).gte('logged_at', thirtyDaysAgo)
      .order('logged_at', { ascending: true }),
    // Intervention history — past check-ins this coach has actually sent.
    supabase.from('coach_message_drafts')
      .select('kind, created_at')
      .eq('coach_id', user.id).eq('member_id', memberId).in('status', ['sent', 'edited_sent'])
      .order('created_at', { ascending: false })
      .limit(8),
    // When the coach last marked this client reviewed (tolerate pre-migration-040).
    supabase.from('coach_client_settings')
      .select('reviewed_at')
      .eq('coach_id', user.id).eq('member_id', memberId)
      .maybeSingle(),
    // The coach's recent sent check-ins (across all clients) → adaptive voice.
    supabase.from('coach_message_drafts')
      .select('draft_text')
      .eq('coach_id', user.id).in('status', ['sent', 'edited_sent'])
      .order('created_at', { ascending: false })
      .limit(40),
  ])

  const voice = inferVoice(((voiceRows ?? []) as { draft_text: string | null }[]).map(r => r.draft_text ?? ''))

  const allWater = (waterRows ?? []) as { logged_at: string; amount_ml: number }[]
  const waterTarget = profile.water_daily_target_ml ?? 2500
  const water = buildWaterWeek(allWater, waterTarget)
  // Prior 7-day window (days 8–14 ago): anchor `now` 7 days back so waterByDay's
  // 7-day filter lands on the previous week. null when nothing was logged then.
  const priorWaterWeek = buildWaterWeek(allWater, waterTarget, sevenDaysAgo)
  const priorWater = priorWaterWeek.daysLogged > 0 ? priorWaterWeek : null

  // ── Deterministic intelligence (compliance, behaviour, confidence, summary) ──
  const proteinTarget = calculateMacroTargets(
    profile.calorie_target ?? 2000, profile.weight_kg ?? null, (profile.goal as Goal | null) ?? null,
  ).protein_g
  const intelFoods: IntelFood[] = ((intelFoodRows ?? []) as { logged_at: string; total_calories: number | null; macro_totals: { protein_g?: number } | null; nutrient_totals: NutrientTotals | null; meal_type: string | null }[])
    .map(f => ({
      logged_at: f.logged_at,
      total_calories: f.total_calories ?? 0,
      protein_g: f.macro_totals?.protein_g ?? 0,
      nutrient_totals: f.nutrient_totals ?? ({} as NutrientTotals),
      meal_type: f.meal_type,
    }))
  const intel = buildIntel({
    name: profile.display_name ?? 'Member',
    goal: profile.goal,
    foods: intelFoods,
    water: allWater as IntelWater[],
    activities: ((intelActRows ?? []) as { logged_at: string; calories_burned: number | null }[]).map(a => ({ logged_at: a.logged_at, calories_burned: a.calories_burned ?? 0 })) as IntelActivity[],
    hasWeight: (weightRows ?? []).length > 0,
    calorieTarget: profile.calorie_target ?? 2000,
    proteinTarget,
    waterTargetMl: waterTarget,
  })

  const weights: WeightPoint[] = ((weightRows ?? []) as { logged_at: string; weight_kg: number | null }[])
    .filter(w => w.weight_kg != null)
    .map(w => ({ date: w.logged_at.slice(0, 10), kg: Number(w.weight_kg) }))
  const trends = buildDailyTrends({
    foods: intelFoods,
    water: allWater as IntelWater[],
    weights,
    calorieTarget: profile.calorie_target ?? 2000,
    proteinTarget,
    waterTargetMl: waterTarget,
    span: 30,
  })

  return (
    <CoachMemberClient
      member={{ id: profile.id, display_name: profile.display_name ?? 'Member', avatar_url: profile.avatar_url }}
      groupId={groupId}
      coachId={user.id}
      memberDiet={memberDiet}
      dietOverride={dietOverride}
      attention={attention}
      signals={signals}
      report={report}
      priorReport={priorReport}
      streak={streak}
      water={water}
      priorWater={priorWater}
      goal={profile.goal}
      intel={intel}
      trends={trends}
      history={(historyRows ?? []) as { kind: 'nudge' | 'praise' | 'weekly_checkin'; created_at: string }[]}
      reviewedAt={(settingsRow as { reviewed_at: string | null } | null)?.reviewed_at ?? null}
      voice={voice}
      posts={(postRows ?? []) as MiniPost[]}
      initialNotes={(noteRows ?? []) as CoachNote[]}
      initialDraft={(draftRow as PendingDraft | null) ?? null}
    />
  )
}
