import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isLocale } from '@/lib/i18n'
import LanguageClient from './LanguageClient'

// Language preference (Settings → Preferences → Language). The saved value
// lives on the profile (migration 051) and is mirrored to the device cookie.
export default async function LanguagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('language').eq('id', user.id).single()

  return <LanguageClient saved={isLocale(profile?.language) ? profile.language : null} />
}
