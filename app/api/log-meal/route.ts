import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logEvent } from '@/lib/analytics'
import { createAdminClient } from '@/lib/supabase/admin'
import { founderSharesGroupWith } from '@/lib/moderation'
import { sendPushToUser } from '@/lib/push'
import { sumTotals, emptyTotals } from '@/lib/nutrients'
import { sumMacros, emptyMacros } from '@/lib/macros'
import { computeStreak } from '@/lib/streak'
import { resolveTimeZone } from '@/lib/day'
import { parseJson, badRequest, boundedString, boundedUrlList } from '@/lib/validate'
import type { FoodEntry } from '@/types'

const MAX_FOODS = 50
const MAX_PHOTOS = 6
const MAX_CAPTION = 500

const STREAK_MILESTONES = [3, 7, 14, 30, 50, 75, 100, 150, 200, 365]

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Delete own post — RLS ("Users can delete own logs") enforces ownership; the
  // user_id filter is belt-and-suspenders. We check rowCount to tell apart
  // "deleted" from "not yours" so we can fall back to founder moderation.
  const { error, count } = await supabase
    .from('food_logs')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (count && count > 0) return NextResponse.json({ ok: true })

  // Not the author's own post — allow a group founder to remove a member's post.
  let admin
  try { admin = createAdminClient() }
  catch { return NextResponse.json({ error: 'Not found' }, { status: 404 }) }

  const { data: log } = await admin.from('food_logs').select('user_id').eq('id', id).single()
  if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!(await founderSharesGroupWith(admin, user.id, log.user_id as string))) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  const { error: delErr } = await admin.from('food_logs').delete().eq('id', id)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
  return NextResponse.json({ ok: true, moderated: true })
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

// Edit a post's caption and/or meal tag (own logs only).
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await parseJson(req)
  if (!body) return badRequest()
  const id = boundedString(body.id, 64)
  const { caption, meal_type } = body as { caption?: string; meal_type?: string }
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const update: { caption?: string | null; meal_type?: string } = {}
  if (typeof caption === 'string') update.caption = boundedString(caption, MAX_CAPTION)
  if (typeof meal_type === 'string' && MEAL_TYPES.includes(meal_type)) update.meal_type = meal_type
  if (!Object.keys(update).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { data, error } = await supabase
    .from('food_logs')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await parseJson(req)
  if (!body) return badRequest()
  const { meal_type, foods, photo_url, privacy_override, caption, shared_to_feed } = body as {
    meal_type: string
    foods: FoodEntry[]
    photo_url?: string
    privacy_override?: string
    caption?: string
    shared_to_feed?: boolean
  }

  if (!meal_type || !Array.isArray(foods) || !foods.length) {
    return NextResponse.json({ error: 'meal_type and foods are required' }, { status: 400 })
  }
  if (foods.length > MAX_FOODS) {
    return NextResponse.json({ error: `Too many foods (max ${MAX_FOODS})` }, { status: 400 })
  }
  // Cap the photo set and keep only valid https URLs; bound the caption length.
  const photo_urls = boundedUrlList(body.photo_urls, MAX_PHOTOS)

  const nutrient_totals = foods.reduce(
    (acc: ReturnType<typeof emptyTotals>, f: FoodEntry) => sumTotals(acc, f.nutrients),
    emptyTotals(),
  )

  const macro_totals = foods.reduce(
    (acc: ReturnType<typeof emptyMacros>, f: FoodEntry) => sumMacros(acc, f.macros ?? emptyMacros()),
    emptyMacros(),
  )

  const total_calories = Math.round(foods.reduce((s, f) => s + (f.calories ?? 0), 0))

  const baseRow = {
    user_id: user.id,
    meal_type,
    foods,
    nutrient_totals,
    total_calories,
    photo_url: photo_url ?? null,
    privacy_override: privacy_override ?? null,
    caption: boundedString(caption, MAX_CAPTION),
  }

  const extendedRow = {
    ...baseRow,
    macro_totals,
    photo_urls: photo_urls && photo_urls.length ? photo_urls : null,
    shared_to_feed: shared_to_feed ?? true,
  }

  // Try inserting the full row; if newer columns (migrations 007/022) aren't
  // applied yet, PostgREST reports the missing column (PGRST204) — retry with
  // only the long-standing columns so logging still works.
  let { data, error } = await supabase
    .from('food_logs')
    .insert(extendedRow)
    .select()
    .single()

  if (error && (error.code === 'PGRST204' || /macro_totals|photo_urls|shared_to_feed/.test(error.message))) {
    console.warn('Newer food_logs columns missing — apply migrations 007/022. Logging with base columns for now.')
    ;({ data, error } = await supabase
      .from('food_logs')
      .insert(baseRow)
      .select()
      .single())
  }

  if (error) {
    console.error('log-meal error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Best-effort web push to group co-members ("X logged breakfast"). The in-app
  // bell rows are created by a DB trigger (migration 017); this is just delivery.
  try {
    const [{ data: actor }, { data: memberRows }] = await Promise.all([
      supabase.from('profiles').select('display_name').eq('id', user.id).single(),
      supabase.rpc('get_my_group_member_ids'),
    ])
    const who = actor?.display_name ?? 'A group member'
    // SETOF uuid comes back as scalars or {get_my_group_member_ids: uuid} objects.
    const ids = Array.isArray(memberRows)
      ? (memberRows as unknown[])
          .map(r => (typeof r === 'string' ? r : (r as Record<string, string>)?.get_my_group_member_ids))
          .filter((id): id is string => !!id && id !== user.id)
      : []
    await Promise.all(
      ids.map(id => sendPushToUser(supabase, id, {
        title: 'NutriSync',
        body: `${who} logged ${meal_type}`,
        url: '/feed',
        tag: `meal-${data?.id}`,
      })),
    )
  } catch (e) {
    console.warn('meal-log group push failed (non-fatal):', e)
  }

  // Streak milestone — celebrate when today's log lands on a milestone day.
  try {
    const since = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString()
    const [{ data: rows }, { data: prof }] = await Promise.all([
      supabase.from('food_logs').select('logged_at').eq('user_id', user.id).gte('logged_at', since),
      supabase.from('profiles').select('reminder_timezone').eq('id', user.id).single(),
    ])
    const streak = computeStreak((rows ?? []).map(r => r.logged_at as string), {
      timeZone: resolveTimeZone(prof?.reminder_timezone as string | null),
    })
    if (STREAK_MILESTONES.includes(streak)) {
      await supabase.from('milestones').upsert(
        { user_id: user.id, type: 'streak', key: `streak-${streak}`, data: { days: streak } },
        { onConflict: 'user_id,type,key', ignoreDuplicates: true },
      )
    }
  } catch (e) {
    console.warn('streak milestone check failed (non-fatal):', e)
  }

  await logEvent(supabase, user.id, 'meal_logged', { meal_type: data?.meal_type, shared: data?.shared_to_feed })
  return NextResponse.json({ log: data })
}
