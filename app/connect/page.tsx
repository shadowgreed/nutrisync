import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ConnectClient from './ConnectClient'

export const metadata = { title: 'Connect a device · NutriSync' }

export default async function ConnectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/connect')

  const { data: profile } = await supabase.from('profiles').select('sync_key').eq('id', user.id).single()

  return <ConnectClient initialKey={(profile?.sync_key as string) ?? null} />
}
