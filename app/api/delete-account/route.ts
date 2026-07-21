import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

// Permanently delete the signed-in user's account and all their data. Deleting
// the auth user cascades through profiles -> food_logs, water_logs, activity_logs,
// reactions, comments, group_members, etc. (all ON DELETE CASCADE).
//
// Two things the auth cascade does NOT reach (audit 2026-07-15, NF-AI-1/2):
//  - Storage objects: meal photos and avatars live in public buckets under a
//    `<user_id>/` prefix; auth.users deletion never touches storage.objects,
//    so without explicit removal the photos stayed world-readable forever —
//    contradicting the privacy policy's "permanently removes ... photos".
//  - app_events: user_id is ON DELETE SET NULL, so behavioral rows (including
//    weight_logged payloads) survived deletion de-linked. Health-adjacent data
//    should not outlive the account.

// Buckets that key objects under the user's id. Uploads are flat (no nested
// folders), so one list+remove sweep per bucket suffices; paginate defensively.
const USER_BUCKETS = ['meal-photos', 'avatars']

async function removeUserObjects(admin: SupabaseClient, bucket: string, userId: string) {
  for (;;) {
    const { data: files, error } = await admin.storage.from(bucket).list(userId, { limit: 1000 })
    if (error || !files || files.length === 0) return
    await admin.storage.from(bucket).remove(files.map(f => `${userId}/${f.name}`))
    if (files.length < 1000) return
  }
}

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

  // Pre-deletion cleanup runs BEFORE deleteUser so a failure there can't
  // strand data behind a dead account. (A group photo uploaded by this user
  // under their folder is removed too — erasure of what they uploaded takes
  // precedence; the group simply falls back to no photo.)
  for (const bucket of USER_BUCKETS) {
    await removeUserObjects(admin, bucket, user.id)
  }
  await admin.from('app_events').delete().eq('user_id', user.id)

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Clear the session cookie so the client lands on /login cleanly.
  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
