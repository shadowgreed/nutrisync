import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RequestClient from './RequestClient'

export default async function GroupRequestPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/group/request/${groupId}`)

  return <RequestClient groupId={groupId} />
}
