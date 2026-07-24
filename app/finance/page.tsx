import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { accountToCard, getPlanSettings, type FinanceAccountRow } from '@/lib/finance/data'
import { computeMonthNet, currentMonth, debtProgressPercent, formatMonthLabel } from '@/lib/finance/dashboard'
import { dbToCents, formatCents, formatDollars } from '@/lib/finance/money'
import { computePayoffPlan } from '@/lib/finance/payoff'
import { BUFFER_TARGET_CENTS, STARTING_DEBT_CENTS } from '@/lib/finance/seed'

// The three questions, above the fold: this month's net, total debt +
// projected debt-free date, buffer status. Server-rendered — nothing here
// needs interactivity.
export default async function FinanceDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const month = currentMonth()
  const monthStart = `${month}-01`

  const [{ data: accounts }, { data: monthTx }, settings] = await Promise.all([
    supabase
      .from('finance_accounts')
      .select('*')
      .eq('user_id', user.id),
    supabase
      .from('finance_transactions')
      .select('amount, category')
      .eq('user_id', user.id)
      .gte('date', monthStart),
    getPlanSettings(supabase, user.id),
  ])

  const accts = (accounts ?? []) as FinanceAccountRow[]
  const cards = accts.filter(a => a.type === 'credit').map(accountToCard)
  const totalDebtCents = cards.reduce((s, c) => s + Math.max(0, c.balanceCents), 0)
  const minimumsCents = cards.reduce((s, c) => s + (c.balanceCents > 0 ? c.minPaymentCents : 0), 0)
  const bufferCents = accts
    .filter(a => a.type === 'savings')
    .reduce((s, a) => s + dbToCents(a.current_balance), 0)

  const net = computeMonthNet(
    (monthTx ?? []).map(t => ({ amount_cents: dbToCents(t.amount), category: t.category as string | null })),
    minimumsCents,
  )

  const plan = computePayoffPlan({
    cards,
    monthlyBudgetCents: settings.debtBudgetCents,
    bufferMonthlyCents: settings.bufferMonthlyCents,
    bufferTargetCents: BUFFER_TARGET_CENTS,
    bufferStartCents: bufferCents,
    startMonth: month,
  })

  const progress = debtProgressPercent(totalDebtCents, STARTING_DEBT_CENTS)
  const bufferPct = Math.min(100, (bufferCents / BUFFER_TARGET_CENTS) * 100)
  const netPositive = net.netCents >= 0

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* This month's net */}
      <section className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <p className="text-stone-400 text-xs uppercase tracking-wider">{formatMonthLabel(month)} net</p>
        <p className={`text-4xl font-bold tabular-nums mt-1 ${netPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {formatCents(net.netCents, { sign: netPositive })}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <p className="text-stone-500">Income</p>
            <p className="text-stone-200 tabular-nums font-medium">{formatDollars(net.incomeCents)}</p>
          </div>
          <div>
            <p className="text-stone-500">Spending</p>
            <p className="text-stone-200 tabular-nums font-medium">{formatDollars(net.expenseCents)}</p>
          </div>
          <div>
            <p className="text-stone-500">Debt mins</p>
            <p className="text-stone-200 tabular-nums font-medium">{formatDollars(net.debtMinimumsCents)}</p>
          </div>
        </div>
      </section>

      {/* Debt progress — the emotional center */}
      <Link href="/finance/debt" className="block bg-stone-900 border border-stone-800 rounded-2xl p-4 hover:border-stone-700 transition-colors">
        <div className="flex items-baseline justify-between">
          <p className="text-stone-400 text-xs uppercase tracking-wider">Total debt</p>
          <p className="text-stone-500 text-xs tabular-nums">{progress.toFixed(1)}% paid</p>
        </div>
        <p className="text-3xl font-bold tabular-nums mt-1">{formatCents(totalDebtCents)}</p>
        <div
          className="mt-3 h-3 rounded-full bg-stone-800 overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Debt payoff progress"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-[width]"
            style={{ width: `${Math.max(progress, 1)}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-stone-500 tabular-nums">
          <span>{formatDollars(STARTING_DEBT_CENTS)}</span>
          <span>$0</span>
        </div>
        <p className="mt-3 text-sm">
          {plan.paidOff ? (
            <>
              <span className="text-stone-400">Debt-free </span>
              <span className="text-emerald-400 font-semibold">{formatMonthLabel(plan.debtFreeMonth)}</span>
              <span className="text-stone-400"> at {formatDollars(settings.debtBudgetCents)}/mo</span>
            </>
          ) : (
            <span className="text-red-400 font-medium">
              Current budget doesn&apos;t pay this off — raise it in the Debt tab
            </span>
          )}
        </p>
      </Link>

      {/* Buffer status */}
      <section className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-stone-400 text-xs uppercase tracking-wider">Cash buffer</p>
          <p className="text-stone-500 text-xs tabular-nums">target {formatDollars(BUFFER_TARGET_CENTS)}</p>
        </div>
        <p className="text-2xl font-bold tabular-nums mt-1">
          {formatCents(bufferCents)}
          <span className="text-stone-500 text-sm font-normal"> / {formatDollars(BUFFER_TARGET_CENTS)}</span>
        </p>
        <div
          className="mt-3 h-2 rounded-full bg-stone-800 overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(bufferPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Buffer progress"
        >
          <div className="h-full rounded-full bg-stone-300" style={{ width: `${bufferPct}%` }} />
        </div>
        <p className="mt-2 text-xs text-stone-500">
          {bufferCents >= BUFFER_TARGET_CENTS
            ? 'Buffer full — every plan dollar goes to debt.'
            : `${formatDollars(settings.bufferMonthlyCents)}/mo goes here first until full. Update the Buffer account balance as your savings change.`}
        </p>
      </section>
    </div>
  )
}
