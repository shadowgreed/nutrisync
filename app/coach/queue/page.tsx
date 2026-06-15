import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import QueueClient, { type QueueItem } from './QueueClient'

export const dynamic = 'force-dynamic'

export default async function CoachQueuePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: drafts } = await supabase
    .from('coach_message_drafts')
    .select('id, kind, draft_text, member_id, created_at')
    .eq('coach_id', user.id).eq('status', 'pending')
    .order('created_at', { ascending: true })

  const rows = (drafts ?? []) as { id: string; kind: QueueItem['kind']; draft_text: string; member_id: string }[]
  const memberIds = [...new Set(rows.map(r => r.member_id))]

  const profileById = new Map<string, { display_name: string | null; avatar_url: string | null }>()
  if (memberIds.length) {
    const { data: profs } = await supabase
      .from('profiles').select('id, display_name, avatar_url').in('id', memberIds)
    for (const p of (profs ?? []) as { id: string; display_name: string | null; avatar_url: string | null }[]) {
      profileById.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url })
    }
  }

  const items: QueueItem[] = rows.map(r => ({
    id: r.id, kind: r.kind, draft_text: r.draft_text, member_id: r.member_id,
    display_name: profileById.get(r.member_id)?.display_name ?? 'Member',
    avatar_url: profileById.get(r.member_id)?.avatar_url ?? null,
  }))

  return <QueueClient initialItems={items} />
}
