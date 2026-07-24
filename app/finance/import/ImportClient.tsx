'use client'

import { useMemo, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import type { CategoryRow } from '@/lib/finance/data'
import { parseBankCsv, type ParsedTransaction } from '@/lib/finance/csv'
import { suggestCategory } from '@/lib/finance/categorize'
import { formatCents } from '@/lib/finance/money'

interface Props {
  categories: CategoryRow[]
  accounts: Array<{ id: string; name: string; type: string }>
}

interface PreviewRow extends ParsedTransaction {
  include: boolean
  category: string | null
  subcategory: string | null
}

const joinCat = (category: string | null, subcategory: string | null) =>
  category ? `${category}||${subcategory ?? ''}` : ''

export default function ImportClient({ categories, accounts }: Props) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [rawText, setRawText] = useState<string | null>(null)
  const [invert, setInvert] = useState(false)
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [skipped, setSkipped] = useState(0)
  const [accountId, setAccountId] = useState(accounts.find(a => a.type === 'checking')?.id ?? '')
  const [dragOver, setDragOver] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ inserted: number; duplicates: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const catOptions = useMemo(() => {
    const parents = categories.filter(c => c.parent === null)
    return parents.map(p => ({
      parent: p.name,
      children: categories.filter(c => c.parent === p.name).map(c => c.name),
    }))
  }, [categories])

  function buildRows(text: string, invertAmounts: boolean) {
    const parsed = parseBankCsv(text, { invertAmounts })
    setSkipped(parsed.skipped)
    setRows(parsed.rows.map(r => {
      // Deposits are income; otherwise suggest from the description keywords.
      const suggestion = r.amountCents < 0
        ? { category: 'Income', subcategory: 'Other' }
        : suggestCategory(r.description)
      return { ...r, include: true, category: suggestion?.category ?? null, subcategory: suggestion?.subcategory ?? null }
    }))
  }

  function loadFile(file: File) {
    setError(null)
    setResult(null)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      setFileName(file.name)
      setRawText(text)
      buildRows(text, invert)
    }
    reader.readAsText(file)
  }

  function toggleInvert() {
    const next = !invert
    setInvert(next)
    if (rawText) buildRows(rawText, next)
  }

  async function confirm() {
    const selected = rows.filter(r => r.include)
    if (selected.length === 0) return
    setSaving(true)
    setError(null)
    const res = await fetch('/api/finance/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_id: accountId || null,
        rows: selected.map(r => ({
          date: r.date,
          description: r.description,
          amountCents: r.amountCents,
          category: r.category,
          subcategory: r.subcategory,
        })),
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      setError(body?.error ?? 'Import failed — try again.')
      return
    }
    setResult(await res.json())
    setRows([])
    setRawText(null)
    setFileName(null)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {rows.length === 0 && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Drop a CSV file or tap to choose one"
          onClick={() => fileInput.current?.click()}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInput.current?.click() }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files?.[0]
            if (file) loadFile(file)
          }}
          className={`border-2 border-dashed rounded-2xl py-14 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
            dragOver ? 'border-emerald-500 bg-emerald-500/5' : 'border-stone-700 hover:border-stone-500'
          }`}
        >
          <Upload size={28} className="text-stone-500" />
          <p className="text-sm text-stone-300">Drop a bank or card CSV here</p>
          <p className="text-xs text-stone-500">or tap to choose a file</p>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) loadFile(file)
              e.target.value = ''
            }}
          />
        </div>
      )}

      {result && (
        <p role="status" className="bg-stone-900 border border-stone-800 rounded-2xl px-4 py-3 text-sm">
          <span className="text-emerald-400 font-semibold">{result.inserted} imported</span>
          {result.duplicates > 0 && (
            <span className="text-stone-400"> · {result.duplicates} already existed (skipped)</span>
          )}
        </p>
      )}
      {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}

      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm text-stone-300">
              <span className="font-semibold">{fileName}</span>
              <span className="text-stone-500"> — {rows.length} rows{skipped > 0 ? `, ${skipped} unparsable skipped` : ''}</span>
            </p>
            <label className="flex items-center gap-2 text-xs text-stone-400">
              <input type="checkbox" checked={invert} onChange={toggleInvert} className="accent-emerald-500" />
              Amounts look flipped (checking-style export)
            </label>
          </div>

          <select
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
            aria-label="Import into account"
            className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">No account</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>

          <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-stone-500 border-b border-stone-800">
                  <th className="px-3 py-2 font-medium">
                    <input
                      type="checkbox"
                      aria-label="Include all rows"
                      checked={rows.every(r => r.include)}
                      onChange={e => setRows(rs => rs.map(r => ({ ...r, include: e.target.checked })))}
                      className="accent-emerald-500"
                    />
                  </th>
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Description</th>
                  <th className="px-2 py-2 font-medium">Category</th>
                  <th className="px-2 py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {rows.map((r, i) => (
                  <tr key={i} className={r.include ? '' : 'opacity-40'}>
                    <td className="px-3 py-1.5">
                      <input
                        type="checkbox"
                        aria-label={`Include ${r.description}`}
                        checked={r.include}
                        onChange={e => setRows(rs => rs.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x)))}
                        className="accent-emerald-500"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-xs text-stone-400 tabular-nums whitespace-nowrap">{r.date}</td>
                    <td className="px-2 py-1.5 text-stone-200 max-w-40 truncate">{r.description}</td>
                    <td className="px-2 py-1.5">
                      <select
                        value={joinCat(r.category, r.subcategory)}
                        onChange={e => {
                          const [category, subcategory] = e.target.value ? e.target.value.split('||') : ['', '']
                          setRows(rs => rs.map((x, j) => (j === i
                            ? { ...x, category: category || null, subcategory: subcategory || null }
                            : x)))
                        }}
                        aria-label={`Category for ${r.description}`}
                        className="w-28 bg-stone-800 border border-stone-700 rounded-md px-1.5 py-1 text-xs text-stone-300"
                      >
                        <option value="">Uncategorized</option>
                        {catOptions.map(g => (
                          <optgroup key={g.parent} label={g.parent}>
                            <option value={joinCat(g.parent, null)}>{g.parent}</option>
                            {g.children.map(c => <option key={c} value={joinCat(g.parent, c)}>{c}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                    <td className={`px-2 py-1.5 text-right tabular-nums whitespace-nowrap ${r.amountCents < 0 ? 'text-emerald-400' : 'text-stone-200'}`}>
                      {formatCents(-r.amountCents, { sign: r.amountCents < 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={confirm}
            disabled={saving || rows.every(r => !r.include)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 rounded-lg py-2.5 text-sm font-semibold transition-colors"
          >
            {saving ? 'Importing…' : `Import ${rows.filter(r => r.include).length} transactions`}
          </button>
          <button
            type="button"
            onClick={() => { setRows([]); setRawText(null); setFileName(null) }}
            className="w-full text-stone-400 hover:text-white text-sm py-1 transition-colors"
          >
            Cancel
          </button>
        </>
      )}
    </div>
  )
}
