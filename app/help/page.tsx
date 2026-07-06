import type { Metadata } from 'next'
import { localizedCategories, articlesByCategory, localizedArticles } from '@/lib/help'
import { getDict } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n/server'
import HelpClient, { type CategorySummary, type ArticleLink } from './HelpClient'

export async function generateMetadata(): Promise<Metadata> {
  const t = getDict(await getLocale())
  return {
    title: `${t.help.title} · NutriSync`,
    description: t.help.metaDescription,
  }
}

// Public Help Center home. Content is bundled, so search runs entirely client-side.
export default async function HelpHomePage() {
  const locale = await getLocale()
  const categories: CategorySummary[] = localizedCategories(locale).map(c => ({
    id: c.id,
    title: c.title,
    emoji: c.emoji,
    description: c.description,
    count: articlesByCategory(c.id).length,
  }))

  const index: ArticleLink[] = localizedArticles(locale).map(a => ({
    slug: a.slug,
    title: a.title,
    summary: a.summary,
    category: a.category,
    tags: a.tags,
  }))

  return <HelpClient categories={categories} index={index} />
}
