import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getFoodUnit } from '@/lib/foodUnit-server'
import EditProfileClient from './EditProfileClient'

export default async function EditProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  // Account column when present, else the device cookie set by /api/food-unit —
  // the toggle must show the user's real preference even on a database where
  // migration 055 (profiles.food_unit) hasn't been applied yet.
  const initialFoodUnit = await getFoodUnit(profile.food_unit)

  return <EditProfileClient profile={profile} initialFoodUnit={initialFoodUnit} />
}
