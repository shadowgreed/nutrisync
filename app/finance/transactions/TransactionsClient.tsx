'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { CategoryRow, FinanceTransactionRow } from '@/lib/finance/data'
import { centsToNumericString, dbToCents, formatCents, parseCents } from '@/lib/finance/money'
import { currentMonth, formatMonthLabel } from '@/lib/finance/dashboard'

interface Props {
  initialTransactions: FinanceTransactionRow[]
  categories: CategoryRow[]
  accounts: Array<{ id: string; name: string; type: string }>
}

/** 'Category||Subcategory' <select> value encoding (subcategory optional). */
const joinCat = (category: string | null, subcategory: string | null) =>
  category ? `${category}||${subcategory ?? ''}` : ''
const splitCat = (v: string): { category: string | null; subcategory: string | null } => {
  if (!v) return { category: null, subcategory: null }
  const [category, subcategory] = v.split('||')
  return { category, subcategory: subcategory || null }
}

export default function TransactionsClient({ initialTransactions, categories, accounts }: Props) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [monthFilter, setMonthFilter] = useState(currentMonth())
  const [categoryFilter, setCategoryFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  // Grouped options: top-level categories, then each child under its parent.
  const catOptions = useMemo(() => {
    const parents = categories.filter(c => c.parent === null)
    return parents.map(p => ({
      parent: p.name,
      children: categories.filter(c => c.parent === p.name).map(c => c.name),
    }))
  }, [categories])

  const monthOptions = useMemo(() => {
    const months = new Set<string>([currentMonth()])
    transactions.forEach(t => months.add(t.date.slice(0, 7)))
    return ['', ...[...months].sort().reverse()]
  }, [transactions])

  const visible = useMemo(
    () => transactions.filter(t =>
      (!monthFilter || t.date.startsWith(monthFilter)) &&
      (!categoryFilter || t.category === categoryFilter),
    ),
    [transactions, monthFilter, categoryFilter],
  )

  async function updateCategory(id: string, value: string) {
    const { category, subcategory } = splitCat(value)
    const prev = transactions
    setTransactions(ts => ts.map(t => (t.id === id ? { ...t, category, subcategory } : t)))
    const res = await fetch('/api/finance/transactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, category, subcategory }),
    })
    if (!res.ok) { setTransactions(prev); setError('Couldn’t save the category — try again.') }
    else setError(null)
  }

  async function remove(id: string) {
    const prev = transactions
    setTransactions(ts => ts.filter(t => t.id !== id))
    const res = await fetch('/api/finance/transactions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) { setTransactions(prev); setError('Delete failed — try again.') }
    else setError(null)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <div className="flex gap-2">
        <select
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
          aria-label="Filter by month"
          className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-sm"
        >
          {monthOptions.map(m => (
            <option key={m || 'all'} value={m}>{m ? formatMonthLabel(m) : 'All months'}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
          className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {catOptions.map(g => <option key={g.parent} value={g.parent}>{g.parent}</option>)}
        </select>
        <button
          type="button"
          onClick={() => setAdding(a => !a)}
          aria-label="Add transaction"
          aria-expanded={adding}
          className="shrink-0 bg-emerald-600 hover:bg-emerald-500 rounded-lg px-3 py-2 transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>

      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}

      {adding && (
        <AddForm
          catOptions={catOptions}
          accounts={accounts}
          onAdded={t => { setTransactions(ts => [t, ...ts]); setAdding(false) }}
        />
      )}

      {visible.length === 0 ? (
        <p className="text-stone-500 text-sm text-center py-10">
          No transactions{monthFilter ? ` in ${formatMonthLabel(monthFilter)}` : ''}. Import a CSV or add one manually.
        </p>
      ) : (
        <ul className="bg-stone-900 border border-stone-800 rounded-2xl divide-y divide-stone-800 overflow-hidden">
          {visible.map(t => {
            const cents = dbToCents(t.amount)
            const isIncome = cents < 0
            return (
              <li key={t.id} className="px-3 py-2.5 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-200 truncate">{t.description || '(no description)'}</p>
                  <p className="text-xs text-stone-500 tabular-nums">
                    {t.date}
                    {t.source !== 'manual' && <span className="ml-2 uppercase text-[10px] text-stone-600">{t.source}</span>}
                  </p>
                </div>
                <select
                  value={joinCat(t.category, t.subcategory)}
                  onChange={e => updateCategory(t.id, e.target.value)}
                  aria-label={`Category for ${t.description || 'transaction'}`}
                  className="w-28 shrink-0 bg-stone-800 border border-stone-700 rounded-md px-1.5 py-1 text-xs text-stone-300"
                >
                  <option value="">Uncategorized</option>
                  {catOptions.map(g => (
                    <optgroup key={g.parent} label={g.parent}>
                      <option value={joinCat(g.parent, null)}>{g.parent}</option>
                      {g.children.map(c => (
                        <option key={c} value={joinCat(g.parent, c)}>{c}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <span className={`w-20 shrink-0 text-right text-sm font-medium tabular-nums ${isIncome ? 'text-emerald-400' : 'text-stone-200'}`}>
                  {formatCents(-cents, { sign: isIncome })}
                </span>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  aria-label={`Delete ${t.description || 'transaction'}`}
                  className="shrink-0 text-stone-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function AddForm({ catOptions, accounts, onAdded }: {
  catOptions: Array<{ parent: string; children: string[] }>
  accounts: Array<{ id: string; name: string; type: string }>
  onAdded: (t: FinanceTransactionRow) => void
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [catValue, setCatValue] = useState('')
  const [accountId, setAccountId] = useState(accounts.find(a => a.type === 'checking')?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const cents = parseCents(amount)
    if (cents === null || cents === 0) { setError('Enter an amount like 12.34'); return }
    setSaving(true)
    setError(null)
    const { category, subcategory } = splitCat(catValue)
    // Convention: positive = expense, negative = income.
    const signed = kind === 'expense' ? Math.abs(cents) : -Math.abs(cents)
    const res = await fetch('/api/finance/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        description,
        amount: centsToNumericString(signed),
        category,
        subcategory,
        account_id: accountId || null,
      }),
    })
    setSaving(false)
    if (!res.ok) { setError('Couldn’t save — try again.'); return }
    const { transaction } = await res.json()
    onAdded(transaction)
  }

  return (
    <form onSubmit={submit} className="bg-stone-900 border border-stone-800 rounded-2xl p-3 space-y-2">
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          aria-label="Date"
          required
          className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-sm"
        />
        <input
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          aria-label="Amount"
          required
          className="w-24 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-sm text-right tabular-nums"
        />
        <select
          value={kind}
          onChange={e => setKind(e.target.value as 'expense' | 'income')}
          aria-label="Expense or income"
          className="bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-sm"
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </div>
      <input
        placeholder="Description"
        value={description}
        onChange={e => setDescription(e.target.value)}
        aria-label="Description"
        className="w-full bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-sm"
      />
      <div className="flex gap-2">
        <select
          value={catValue}
          onChange={e => setCatValue(e.target.value)}
          aria-label="Category"
          className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-sm"
        >
          <option value="">Uncategorized</option>
          {catOptions.map(g => (
            <optgroup key={g.parent} label={g.parent}>
              <option value={joinCat(g.parent, null)}>{g.parent}</option>
              {g.children.map(c => <option key={c} value={joinCat(g.parent, c)}>{c}</option>)}
            </optgroup>
          ))}
        </select>
        <select
          value={accountId}
          onChange={e => setAccountId(e.target.value)}
          aria-label="Account"
          className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-sm"
        >
          <option value="">No account</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      {error && <p role="alert" className="text-red-400 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 rounded-lg py-2 text-sm font-semibold transition-colors"
      >
        {saving ? 'Saving…' : 'Add transaction'}
      </button>
    </form>
  )
}
