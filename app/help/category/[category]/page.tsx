import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { CATEGORIES, getCategory, articlesByCategory } from '@/lib/help'
import { getDict } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n/server'
import type { CategoryId } from '@/lib/help/types'

export function generateStaticParams() {
  return CATEGORIES.map(c => ({ category: c.id }))
}

const VALID = new Set(CATEGORIES.map(c => c.id))

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params
  const locale = await getLocale()
  if (!VALID.has(category as CategoryId)) return { title: getDict(locale).help.notFoundTitle }
  const c = getCategory(category as CategoryId, locale)
  return { title: `${c.title} · NutriSync Help`, description: c.description }
}

export default async function HelpCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  if (!VALID.has(category as CategoryId)) notFound()
  const locale = await getLocale()
  const t = getDict(locale)
  const c = getCategory(category as CategoryId, locale)
  const articles = articlesByCategory(category as CategoryId, locale)

  return (
    <div className="min-h-screen bg-stone-950 text-white pb-16">
      <header className="px-4 pt-safe pb-3 flex items-center gap-3">
        <Link href="/help" aria-label={t.help.backToHelpCenterAria} className="flex items-center justify-center w-11 h-11 -ml-2 text-stone-300 hover:text-white">
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl" aria-hidden="true">{c.emoji}</span>
          <h1 className="text-xl font-bold truncate">{c.title}</h1>
        </div>
      </header>

      <p className="px-5 text-stone-400 text-sm mb-4">{c.description}</p>

      <div className="px-4">
        <ul className="bg-stone-900 border border-stone-800 rounded-2xl divide-y divide-stone-800 overflow-hidden">
          {articles.map(a => (
            <li key={a.slug}>
              <Link href={`/help/${a.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-800/50 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-stone-100 font-medium">{a.title}</p>
                  <p className="text-stone-500 text-xs mt-0.5 line-clamp-1">{a.summary}</p>
                </div>
                <ChevronRight size={16} className="text-stone-600 shrink-0" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
