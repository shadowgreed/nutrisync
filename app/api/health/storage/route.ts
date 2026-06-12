import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const EXPECTED = ['meal-photos', 'avatars', 'group-photos']

// Quick self-diagnosis for photo problems: confirms each bucket exists and is
// public. If a bucket shows public:false or exists:false here, run migration
// 026_storage_repair.sql. Auth-required; reports config only, never file contents.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let admin
  try { admin = createAdminClient() }
  catch { return NextResponse.json({ error: 'Server not configured' }, { status: 500 }) }

  const { data: buckets, error } = await admin.storage.listBuckets()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const report = EXPECTED.map(id => {
    const b = buckets?.find(x => x.id === id)
    return { bucket: id, exists: !!b, public: b?.public ?? false }
  })
  const healthy = report.every(r => r.exists && r.public)

  return NextResponse.json({
    healthy,
    buckets: report,
    fix: healthy ? null : 'Run supabase/migrations/026_storage_repair.sql in the SQL editor',
  })
}
