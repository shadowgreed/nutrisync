import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/ratelimit'

// Export everything the signed-in user has created, as a single JSON download.
// Read with the user's own session, scoped to their rows — no admin client, no
// access to anyone else's data. Each table is fetched independently so a missing
// table or empty result never fails the whole export.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Exports can be sizable — keep them modest per user.
  if (!rateLimit(`export:${user.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'You’ve exported a few times recently — try again later.' }, { status: 429 })
  }

  const rows = async (table: string, column: string) => {
    const { data, error } = await supabase.from(table).select('*').eq(column, user.id)
    return error ? [] : (data ?? [])
  }

  const [
    profileRows,
    foodLogs,
    activityLogs,
    waterLogs,
    weightLogs,
    reactions,
    comments,
    groupMemberships,
    challengesCreated,
    milestones,
  ] = await Promise.all([
    rows('profiles', 'id'),
    rows('food_logs', 'user_id'),
    rows('activity_logs', 'user_id'),
    rows('water_logs', 'user_id'),
    rows('weight_logs', 'user_id'),
    rows('reactions', 'user_id'),
    rows('comments', 'user_id'),
    rows('group_members', 'user_id'),
    rows('challenges', 'created_by'),
    rows('milestones', 'user_id'),
  ])

  const payload = {
    export_version: '1.0',
    generated_at: new Date().toISOString(),
    account: { id: user.id, email: user.email ?? null },
    profile: profileRows[0] ?? null,
    food_logs: foodLogs,
    activity_logs: activityLogs,
    water_logs: waterLogs,
    weight_logs: weightLogs,
    reactions,
    comments,
    group_memberships: groupMemberships,
    challenges_created: challengesCreated,
    milestones,
  }

  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="nutrisync-export-${date}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
