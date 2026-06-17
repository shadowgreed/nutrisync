import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { groupForCoachMember, assessMember, getDietOverride } from '@/lib/coach-server'
import { effectiveDiet, isDiet } from '@/lib/diets'
import { buildWaterWeek } from '@/lib/water'
import type { Diet } from '@/types'
import CoachMemberClient, { type CoachNote, type PendingDraft } from './CoachMemberClient'

export const dynamic = 'force-dynamic'

interface MemberProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  calorie_target: number | null
  privacy_mode: string | null
  coach_visible: boolean | null
  diet: string | null
  water_daily_target_ml: number | null
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
      .select('id, display_name, avatar_url, calorie_target, privacy_mode, coach_visible, diet, water_daily_target_ml')
      .eq('id', memberId)
      .single<MemberProfile>(),
    getDietOverride(supabase, user.id, memberId),
  ])
  if (!profile) notFound()
  if (profile.privacy_mode === 'dark' || profile.coach_visible === false) notFound()

  const memberDiet: Diet | null = isDiet(profile.diet) ? profile.diet : null
  const diet = effectiveDiet(memberDiet, dietOverride)

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [{ attention, signals, report, streak }, { data: noteRows }, { data: draftRow }, { data: waterRows }] = await Promise.all([
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
      .eq('user_id', memberId).gte('logged_at', sevenDaysAgo),
  ])

  const water = buildWaterWeek(
    (waterRows ?? []) as { logged_at: string; amount_ml: number }[],
    profile.water_daily_target_ml ?? 2500,
  )

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
      streak={streak}
      water={water}
      initialNotes={(noteRows ?? []) as CoachNote[]}
      initialDraft={(draftRow as PendingDraft | null) ?? null}
    />
  )
}
