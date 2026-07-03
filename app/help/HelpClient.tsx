'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, ChevronRight, X } from 'lucide-react'
import type { CategoryId } from '@/lib/help/types'
import { logHelpEvent } from '@/lib/help/track'

export interface CategorySummary {
  id: CategoryId
  title: string
  emoji: string
  description: string
  count: number
}

export interface ArticleLink {
  slug: string
  title: string
  summary: string
  category: CategoryId
  tags: string[]
}

const CATEGORY_WEIGHT: Record<CategoryId, number> = {
  'getting-started': 3, 'food-logging': 3, 'activity': 3, 'groups': 3,
  'challenges': 3, 'progress': 3, 'account': 2, 'troubleshooting': 1,
}

// Lightweight client search over the bundled article index. Mirrors the server
// ranking: exact title/tag matches first, then feature content over troubleshooting.
function search(index: ArticleLink[], query: string): ArticleLink[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const tokens = [...new Set(q.split(/\s+/).filter(t => t.length >= 2))]
  return index
    .map(a => {
      const title = a.title.toLowerCase()
      const tags = a.tags.map(t => t.toLowerCase())
      const hay = a.summary.toLowerCase()
      let s = 0
      if (title === q) s += 1000
      else if (title.includes(q)) s += 200
      if (tags.some(t => t === q)) s += 300
      if (tags.some(t => t.includes(q))) s += 80
      for (const tok of tokens) {
        if (title.includes(tok)) s += 40
        if (tags.some(t => t.includes(tok))) s += 25
        if (hay.includes(tok)) s += 8
      }
      if (s > 0) s += CATEGORY_WEIGHT[a.category]
      return { a, s }
    })
    .filter(h => h.s > 0)
    .sort((x, y) => y.s - x.s || x.a.title.localeCompare(y.a.title))
    .map(h => h.a)
}

export default function HelpClient({ categories, index }: { categories: CategorySummary[]; index: ArticleLink[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const results = useMemo(() => search(index, query), [index, query])
  const searching = query.trim().length >= 2

  // Debounced search analytics — log the committed query, not every keystroke.
  useEffect(() => {
    if (!searching) return
    const id = setTimeout(() => logHelpEvent({ type: 'search', query: query.trim(), resultCount: results.length }), 700)
    return () => clearTimeout(id)
  }, [query, searching, results.length])

  return (
    <div className="min-h-screen bg-stone-950 text-white pb-16">
      {/* Header */}
      <header className="px-4 pt-safe pb-3 flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Back" className="flex items-center justify-center w-11 h-11 -ml-2 text-stone-300 hover:text-white">
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h1 className="text-2xl font-bold">Help Center</h1>
      </header>

      {/* Search */}
      <div className="px-4 mb-5">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" aria-hidden="true" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            type="search"
            inputMode="search"
            placeholder="Search for answers…"
            aria-label="Search help articles"
            className="w-full bg-stone-900 border border-stone-800 rounded-2xl pl-9 pr-9 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 text-stone-500 hover:text-white">
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        {!searching && (
          <p className="text-stone-400 text-xs mt-2 px-1">Try: delete meal · create challenge · invite friend · edit calories</p>
        )}
      </div>

      {searching ? (
        /* ── Search results ─────────────────────────────────────────────────── */
        <div className="px-4">
          <p className="text-stone-500 text-xs mb-2">{results.length} result{results.length === 1 ? '' : 's'} for “{query.trim()}”</p>
          {results.length > 0 ? (
            <ul className="space-y-2">
              {results.map(a => (
                <li key={a.slug}>
                  <Link href={`/help/${a.slug}`} className="block bg-stone-900 border border-stone-800 rounded-2xl p-3.5 hover:border-stone-600 transition-colors">
                    <p className="text-white text-sm font-semibold">{a.title}</p>
                    <p className="text-stone-400 text-xs mt-0.5 line-clamp-2">{a.summary}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="bg-stone-900 border border-dashed border-stone-800 rounded-2xl p-6 text-center">
              <p className="text-stone-300 text-sm font-medium">No results found</p>
              <p className="text-stone-500 text-xs mt-1 mb-4">Try different words, or browse the categories below.</p>
              <ContactCTA />
            </div>
          )}
        </div>
      ) : (
        /* ── Browse categories ──────────────────────────────────────────────── */
        <>
          <div className="px-4 grid grid-cols-2 gap-2.5">
            {categories.map(c => (
              <Link key={c.id} href={`/help/category/${c.id}`} className="bg-stone-900 border border-stone-800 rounded-2xl p-3.5 hover:border-stone-600 transition-colors">
                <div className="text-2xl mb-1.5" aria-hidden="true">{c.emoji}</div>
                <p className="text-white text-sm font-semibold leading-tight">{c.title}</p>
                <p className="text-stone-500 text-[11px] mt-0.5 line-clamp-2">{c.description}</p>
                <p className="text-stone-400 text-[11px] mt-1.5">{c.count} article{c.count === 1 ? '' : 's'}</p>
              </Link>
            ))}
          </div>

          <div className="px-4 mt-6">
            <ContactCTA />
          </div>
        </>
      )}
    </div>
  )
}

function ContactCTA() {
  return (
    <a
      href="mailto:hello@nutrisync.app?subject=NutriSync%20support"
      className="flex items-center justify-between gap-2 bg-stone-900 border border-stone-800 rounded-2xl px-4 py-3 hover:border-stone-600 transition-colors"
    >
      <div>
        <p className="text-white text-sm font-medium">Still need help?</p>
        <p className="text-stone-500 text-xs">Contact our support team.</p>
      </div>
      <ChevronRight size={16} className="text-stone-600 shrink-0" aria-hidden="true" />
    </a>
  )
}
