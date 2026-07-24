'use client'

import { useMemo, useState } from 'react'
import type { FinanceAccountRow, PlanSettings } from '@/lib/finance/data'
import { centsToNumericString, dbToCents, formatCents, formatDollars, parseCents } from '@/lib/finance/money'
import {
  aprToBp,
  avalancheOrder,
  bpToAprString,
  computeMinimumsOnlyPlan,
  computePayoffPlan,
  type DebtCard,
} from '@/lib/finance/payoff'
import { currentMonth, formatMonthLabel } from '@/lib/finance/dashboard'
import { BUFFER_TARGET_CENTS } from '@/lib/finance/seed'

interface Props {
  creditAccounts: FinanceAccountRow[]
  settings: PlanSettings
  bufferStartCents: number
}

interface EditableCard extends DebtCard {
  id: string
}

// Everything recomputes locally as fields change (the engine is pure client-safe
// TS); edits persist on blur via PATCH /api/finance/accounts.
export default function DebtClient({ creditAccounts, settings, bufferStartCents }: Props) {
  const [cards, setCards] = useState<EditableCard[]>(() =>
    creditAccounts.map(a => ({
      id: a.id,
      name: a.name,
      balanceCents: dbToCents(a.current_balance),
      aprBp: aprToBp(a.apr ?? 0),
      minPaymentCents: dbToCents(a.min_payment),
    })),
  )
  const [budgetCents, setBudgetCents] = useState(settings.debtBudgetCents)
  const [bufferMonthlyCents, setBufferMonthlyCents] = useState(settings.bufferMonthlyCents)
  const [error, setError] = useState<string | null>(null)

  const startMonth = currentMonth()
  const plan = useMemo(() => computePayoffPlan({
    cards,
    monthlyBudgetCents: budgetCents,
    bufferMonthlyCents,
    bufferTargetCents: BUFFER_TARGET_CENTS,
    bufferStartCents,
    startMonth,
  }), [cards, budgetCents, bufferMonthlyCents, bufferStartCents, startMonth])

  const minimumsPlan = useMemo(() => computeMinimumsOnlyPlan(cards), [cards])
  const ordered = useMemo(() => avalancheOrder(cards), [cards])
  const totalDebtCents = cards.reduce((s, c) => s + Math.max(0, c.balanceCents), 0)

  async function persistCard(id: string, field: 'current_balance' | 'apr' | 'min_payment', value: string) {
    const res = await fetch('/api/finance/accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, [field]: value }),
    })
    setError(res.ok ? null : 'Couldn’t save that change — it will revert on reload.')
  }

  async function persistSettings(patch: Partial<{ debtBudget: string; bufferMonthly: string }>) {
    const res = await fetch('/api/finance/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    setError(res.ok ? null : 'Couldn’t save the plan settings — they will revert on reload.')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}

      {/* Plan knobs */}
      <section className="bg-stone-900 border border-stone-800 rounded-2xl p-4 grid grid-cols-2 gap-3">
        <MoneyInput
          label="Monthly debt budget"
          cents={budgetCents}
          onChange={setBudgetCents}
          onCommit={c => persistSettings({ debtBudget: centsToNumericString(c) })}
        />
        <MoneyInput
          label={`Buffer $/mo (to ${formatDollars(BUFFER_TARGET_CENTS)})`}
          cents={bufferMonthlyCents}
          onChange={setBufferMonthlyCents}
          onCommit={c => persistSettings({ bufferMonthly: centsToNumericString(c) })}
        />
      </section>

      {/* The verdict */}
      <section className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
        {plan.paidOff ? (
          <>
            <p className="text-stone-400 text-xs uppercase tracking-wider">Debt-free date</p>
            <p className="text-3xl font-bold text-emerald-400 mt-0.5">{formatMonthLabel(plan.debtFreeMonth)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-stone-500 text-xs">Months</p>
                <p className="tabular-nums font-medium">{plan.monthCount}</p>
              </div>
              <div>
                <p className="text-stone-500 text-xs">Interest paid on this path</p>
                <p className="tabular-nums font-medium">{formatCents(plan.totalInterestCents)}</p>
              </div>
            </div>
            {minimumsPlan.paidOff && (
              <p className="mt-3 text-xs text-stone-400 border-t border-stone-800 pt-3">
                vs. minimums only: debt-free in {minimumsPlan.monthCount} months with{' '}
                {formatCents(minimumsPlan.totalInterestCents)} interest — this plan saves{' '}
                <span className="text-emerald-400 font-semibold">
                  {minimumsPlan.monthCount - plan.monthCount} months
                </span>{' '}
                and{' '}
                <span className="text-emerald-400 font-semibold">
                  {formatCents(minimumsPlan.totalInterestCents - plan.totalInterestCents)}
                </span>.
              </p>
            )}
          </>
        ) : (
          <p className="text-red-400 font-medium">
            {formatDollars(budgetCents)}/mo doesn&apos;t cover interest + minimums on {formatCents(totalDebtCents)} —
            raise the budget to get a payoff date.
          </p>
        )}
      </section>

      {/* Cards, avalanche order, everything editable */}
      <section className="space-y-2">
        <p className="text-stone-400 text-xs uppercase tracking-wider px-1">
          Avalanche order — pay top card first
        </p>
        {ordered.map((c, i) => (
          <div key={c.id} className="bg-stone-900 border border-stone-800 rounded-2xl p-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 shrink-0 rounded-full bg-stone-800 text-stone-400 text-xs flex items-center justify-center tabular-nums">
                {i + 1}
              </span>
              <p className="font-semibold text-sm flex-1">{c.name}</p>
              {c.balanceCents <= 0 && <span className="text-emerald-400 text-xs font-semibold">PAID OFF</span>}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <CardField
                label="Balance"
                prefix="$"
                defaultValue={centsToNumericString(c.balanceCents)}
                onCommit={raw => {
                  const cents = parseCents(raw)
                  if (cents === null || cents < 0) return false
                  setCards(cs => cs.map(x => (x.id === c.id ? { ...x, balanceCents: cents } : x)))
                  persistCard(c.id, 'current_balance', centsToNumericString(cents))
                  return true
                }}
              />
              <CardField
                label="APR"
                suffix="%"
                defaultValue={bpToAprString(c.aprBp)}
                onCommit={raw => {
                  const bp = aprToBp(raw)
                  if (bp <= 0 || bp > 10000) return false
                  setCards(cs => cs.map(x => (x.id === c.id ? { ...x, aprBp: bp } : x)))
                  persistCard(c.id, 'apr', bpToAprString(bp))
                  return true
                }}
              />
              <CardField
                label="Min payment"
                prefix="$"
                defaultValue={centsToNumericString(c.minPaymentCents)}
                onCommit={raw => {
                  const cents = parseCents(raw)
                  if (cents === null || cents < 0) return false
                  setCards(cs => cs.map(x => (x.id === c.id ? { ...x, minPaymentCents: cents } : x)))
                  persistCard(c.id, 'min_payment', centsToNumericString(cents))
                  return true
                }}
              />
            </div>
          </div>
        ))}
        <p className="text-xs text-stone-500 px-1">
          APRs are placeholders until corrected from statements — edit any field and the order and schedule re-sort instantly.
        </p>
      </section>

      {/* Month-by-month schedule */}
      {plan.paidOff && (
        <section className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
          <p className="px-4 pt-3 pb-2 text-stone-400 text-xs uppercase tracking-wider">Payoff schedule</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-stone-500 border-b border-stone-800">
                  <th className="px-4 py-1.5 font-medium">Month</th>
                  <th className="px-2 py-1.5 font-medium">Focus card</th>
                  <th className="px-2 py-1.5 font-medium text-right">Buffer</th>
                  <th className="px-2 py-1.5 font-medium text-right">Paid</th>
                  <th className="px-2 py-1.5 font-medium text-right">Interest</th>
                  <th className="px-4 py-1.5 font-medium text-right">Debt left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 tabular-nums">
                {plan.months.map(m => {
                  // Focus card = the one that received the biggest payment.
                  const focus = [...m.cards].sort((a, b) => b.paymentCents - a.paymentCents)[0]
                  return (
                    <tr key={m.month}>
                      <td className="px-4 py-1.5 text-stone-300 whitespace-nowrap">{m.month}</td>
                      <td className="px-2 py-1.5 text-stone-300">{focus?.paymentCents ? focus.card : '—'}</td>
                      <td className="px-2 py-1.5 text-right text-stone-500">
                        {m.bufferContributionCents > 0 ? formatDollars(m.bufferContributionCents) : '—'}
                      </td>
                      <td className="px-2 py-1.5 text-right text-stone-300">{formatDollars(m.totalPaymentCents)}</td>
                      <td className="px-2 py-1.5 text-right text-stone-500">{formatCents(m.totalInterestCents)}</td>
                      <td className={`px-4 py-1.5 text-right ${m.remainingDebtCents === 0 ? 'text-emerald-400 font-semibold' : 'text-stone-300'}`}>
                        {formatDollars(m.remainingDebtCents)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function MoneyInput({ label, cents, onChange, onCommit }: {
  label: string
  cents: number
  onChange: (cents: number) => void
  onCommit: (cents: number) => void
}) {
  const [text, setText] = useState((cents / 100).toFixed(0))
  return (
    <label className="block">
      <span className="text-stone-500 text-xs">{label}</span>
      <div className="mt-1 flex items-center bg-stone-800 border border-stone-700 rounded-lg px-2">
        <span className="text-stone-500 text-sm">$</span>
        <input
          inputMode="decimal"
          value={text}
          onChange={e => {
            setText(e.target.value)
            const c = parseCents(e.target.value)
            if (c !== null && c >= 0) onChange(c)
          }}
          onBlur={() => {
            const c = parseCents(text)
            if (c !== null && c >= 0) onCommit(c)
            else setText((cents / 100).toFixed(0))
          }}
          aria-label={label}
          className="w-full bg-transparent py-1.5 px-1 text-sm tabular-nums outline-none"
        />
      </div>
    </label>
  )
}

function CardField({ label, defaultValue, prefix, suffix, onCommit }: {
  label: string
  defaultValue: string
  prefix?: string
  suffix?: string
  onCommit: (raw: string) => boolean
}) {
  const [text, setText] = useState(defaultValue)
  const [invalid, setInvalid] = useState(false)
  return (
    <label className="block min-w-0">
      <span className="text-stone-500 text-[10px] uppercase tracking-wide">{label}</span>
      <div className={`mt-0.5 flex items-center bg-stone-800 border rounded-lg px-1.5 ${invalid ? 'border-red-500' : 'border-stone-700'}`}>
        {prefix && <span className="text-stone-500 text-xs">{prefix}</span>}
        <input
          inputMode="decimal"
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={() => {
            const ok = onCommit(text)
            setInvalid(!ok)
            if (!ok) setText(defaultValue)
          }}
          aria-label={label}
          aria-invalid={invalid || undefined}
          className="w-full min-w-0 bg-transparent py-1 px-0.5 text-xs tabular-nums outline-none"
        />
        {suffix && <span className="text-stone-500 text-xs">{suffix}</span>}
      </div>
    </label>
  )
}
