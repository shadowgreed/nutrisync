import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitDurable } from '@/lib/ratelimit'
import { groupForCoachMember, assessMember, getDietOverride } from '@/lib/coach-server'
import { chooseKind, draftCheckin } from '@/lib/copilot-ai'
import { isDraftTone } from '@/lib/copilot-tones'
import { inferVoice } from '@/lib/coach-voice'
import { effectiveDiet, isDiet } from '@/lib/diets'
import { parseJson, badRequest } from '@/lib/validate'
import { getDict } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n/server'
import type { CopilotStrings } from '@/lib/copilot'
import type { NutrientKey } from '@/types'

// Generate (or regenerate) a Copilot check-in draft for one member. The draft is
// stored as 'pending' — it does NOT reach the member until the coach sends it.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await parseJson<{ memberId?: string; tone?: string }>(req)
  if (!body) return badRequest()
  const { memberId } = body
  if (!memberId) return NextResponse.json({ error: 'Missing memberId' }, { status: 400 })
  const tone = isDraftTone(body.tone) ? body.tone : 'auto'

  // Drafting calls the LLM — keep it bounded per coach and per member.
  if (!(await rateLimitDurable(supabase, `coach-draft:${user.id}`, 60, 60 * 60 * 1000))) {
    return NextResponse.json({ error: 'Too many drafts this hour — try again soon.' }, { status: 429 })
  }
  if (!(await rateLimitDurable(supabase, `coach-draft:${user.id}:${memberId}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: 'Plenty of drafts for this member already — give it a minute.' }, { status: 429 })
  }

  const groupId = await groupForCoachMember(supabase, user.id, memberId)
  if (!groupId) return NextResponse.json({ error: 'Not your client' }, { status: 403 })

  const { data: member } = await supabase
    .from('profiles')
    .select('display_name, calorie_target, privacy_mode, coach_visible, diet')
    .eq('id', memberId)
    .single<{ display_name: string | null; calorie_target: number | null; privacy_mode: string | null; coach_visible: boolean | null; diet: string | null }>()
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (member.privacy_mode === 'dark' || member.coach_visible === false) {
    return NextResponse.json({ error: 'This member has opted out of coach view' }, { status: 403 })
  }

  const override = await getDietOverride(supabase, user.id, memberId)
  const diet = effectiveDiet(isDiet(member.diet) ? member.diet : null, override)

  // Signals are phrased in the coach's own language — both for the dashboard
  // chip display and as the "flags" fed into the Copilot draft prompt below, so
  // a Spanish-locale coach gets a Spanish-aware (and typically Spanish-drafted)
  // check-in instead of English flags mismatched against their own UI.
  const t = getDict(await getLocale())
  const copilotStrings: CopilotStrings = {
    ...t.coach.signals,
    nutrientLabel: (key: NutrientKey) => t.nutrients[key],
    dietLabel: (d) => d ? t.diets[d] : t.editProfile.noDiet,
  }
  const { signals, report } = await assessMember(supabase, memberId, member.calorie_target ?? 2000, diet, undefined, copilotStrings)
  const kind = chooseKind(signals)

  const [{ data: coach }, { data: sentRows }] = await Promise.all([
    supabase.from('profiles').select('display_name, coach_style').eq('id', user.id).single<{ display_name: string | null; coach_style: string | null }>(),
    // The coach's recent sent check-ins → learned voice (only when tone is 'auto').
    // Templated sends (Recommended actions) are excluded so they don't skew it.
    supabase.from('coach_message_drafts')
      .select('draft_text')
      .eq('coach_id', user.id).in('status', ['sent', 'edited_sent'])
      // Null-safe: keep authored drafts (no source) and drop only templated sends.
      .or('basis->>source.is.null,basis->>source.neq.recommended_action')
      .order('created_at', { ascending: false }).limit(40),
  ])

  // Build a voice hint once there's enough signal (≥3 sent messages); below that
  // we don't impose a guess and just fall back to the coach's saved style.
  const voice = inferVoice(((sentRows ?? []) as { draft_text: string | null }[]).map(r => r.draft_text ?? ''))
  const voiceHint = voice.sampleSize >= 3
    ? [voice.profile, ...voice.traits].join(', ').toLowerCase()
    : null

  const { text } = await draftCheckin({
    coachName: coach?.display_name ?? 'Coach',
    coachStyle: coach?.coach_style,
    memberFirstName: (member.display_name ?? 'there').trim().split(/\s+/)[0],
    kind, signals, report, diet, tone, voiceHint,
  })

  // One live draft per coach↔member: clear any existing pending one first.
  await supabase.from('coach_message_drafts')
    .delete().eq('coach_id', user.id).eq('member_id', memberId).eq('status', 'pending')

  const { data: draft, error } = await supabase
    .from('coach_message_drafts')
    .insert({
      group_id: groupId, coach_id: user.id, member_id: memberId, kind,
      draft_text: text,
      basis: { attention: signals.length ? 'flagged' : 'routine', signals: signals.map(s => s.label) },
    })
    .select('id, kind, draft_text, status, created_at')
    .single()

  if (error || !draft) return NextResponse.json({ error: error?.message ?? 'Could not create draft' }, { status: 500 })
  return NextResponse.json({ draft })
}
