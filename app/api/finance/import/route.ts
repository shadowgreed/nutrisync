import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseJson, badRequest, boundedString } from '@/lib/validate'
import { centsToNumericString, dbToCents } from '@/lib/finance/money'
import { normalizeDate, dedupeKey } from '@/lib/finance/csv'

const MAX_ROWS = 2000
const MAX_AMOUNT_CENTS = 100_000_000

interface IncomingRow {
  date?: unknown
  description?: unknown
  amountCents?: unknown
  category?: unknown
  subcategory?: unknown
}

/**
 * Bulk-save confirmed CSV rows. Dedupe per spec on date+amount+description:
 * rows whose key already exists in the account's transaction history are
 * dropped, so re-importing the same file never double-counts.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await parseJson<{ rows?: IncomingRow[]; account_id?: unknown }>(req)
  if (!body || !Array.isArray(body.rows) || body.rows.length === 0) return badRequest('rows required')
  if (body.rows.length > MAX_ROWS) return badRequest(`Too many rows (max ${MAX_ROWS})`)
  const accountId = boundedString(body.account_id, 64)

  // Validate + normalize every row before touching the database.
  const rows: Array<{ date: string; description: string; amountCents: number; category: string | null; subcategory: string | null }> = []
  for (const r of body.rows) {
    const date = normalizeDate(boundedString(r.date, 10) ?? '')
    const amountCents = typeof r.amountCents === 'number' && Number.isSafeInteger(r.amountCents) ? r.amountCents : null
    if (!date || amountCents === null || Math.abs(amountCents) > MAX_AMOUNT_CENTS) {
      return badRequest('Every row needs a valid date and integer amountCents')
    }
    rows.push({
      date,
      description: boundedString(r.description, 200) ?? '',
      amountCents,
      category: boundedString(r.category, 60),
      subcategory: boundedString(r.subcategory, 60),
    })
  }

  // Existing keys inside the import's date window.
  const dates = rows.map(r => r.date).sort()
  const { data: existing, error: readError } = await supabase
    .from('finance_transactions')
    .select('date, amount, description')
    .eq('user_id', user.id)
    .gte('date', dates[0])
    .lte('date', dates[dates.length - 1])
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 })

  const seen = new Set(
    (existing ?? []).map(t => dedupeKey(t.date as string, dbToCents(t.amount), (t.description as string) ?? '')),
  )

  const toInsert: Array<Record<string, unknown>> = []
  let duplicates = 0
  for (const r of rows) {
    const key = dedupeKey(r.date, r.amountCents, r.description)
    if (seen.has(key)) { duplicates++; continue }
    seen.add(key) // also dedupes within the file itself
    toInsert.push({
      user_id: user.id,
      account_id: accountId,
      date: r.date,
      description: r.description,
      amount: centsToNumericString(r.amountCents),
      category: r.category,
      subcategory: r.subcategory,
      source: 'csv',
    })
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('finance_transactions').insert(toInsert)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ inserted: toInsert.length, duplicates })
}
