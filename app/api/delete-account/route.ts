import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Permanently delete the signed-in user's account and all their data. Deleting
// the auth user cascades through profiles -> food_logs, water_logs, activity_logs,
// reactions, comments, group_members, etc. (all ON DELETE CASCADE).
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json(
      { error: 'Account deletion is not configured on the server (missing service role key).' },
      { status: 500 },
    )
  }

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Clear the session cookie so the client lands on /login cleanly.
  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
