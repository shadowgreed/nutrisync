import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { groupForCoachMember, assessMember } from '@/lib/coach-server'
import CoachMemberClient, { type CoachNote, type PendingDraft } from './CoachMemberClient'

export const dynamic = 'force-dynamic'

interface MemberProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  calorie_target: number | null
  privacy_mode: string | null
  coach_visible: boolean | null
}

export default async function CoachMemberPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const groupId = await groupForCoachMember(supabase, user.id, memberId)
  if (!groupId) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, calorie_target, privacy_mode, coach_visible')
    .eq('id', memberId)
    .single<MemberProfile>()
  if (!profile) notFound()
  if (profile.privacy_mode === 'dark' || profile.coach_visible === false) notFound()

  const [{ attention, signals, report, streak }, { data: noteRows }, { data: draftRow }] = await Promise.all([
    assessMember(supabase, memberId, profile.calorie_target ?? 2000),
    supabase.from('coach_client_notes')
      .select('id, body, created_at')
      .eq('coach_id', user.id).eq('member_id', memberId).eq('group_id', groupId)
      .order('created_at', { ascending: false }),
    supabase.from('coach_message_drafts')
      .select('id, kind, draft_text, status, created_at')
      .eq('coach_id', user.id).eq('member_id', memberId).eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle(),
  ])

  return (
    <CoachMemberClient
      member={{ id: profile.id, display_name: profile.display_name ?? 'Member', avatar_url: profile.avatar_url }}
      groupId={groupId}
      attention={attention}
      signals={signals}
      report={report}
      streak={streak}
      initialNotes={(noteRows ?? []) as CoachNote[]}
      initialDraft={(draftRow as PendingDraft | null) ?? null}
    />
  )
}
