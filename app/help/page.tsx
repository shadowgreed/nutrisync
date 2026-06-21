import type { Metadata } from 'next'
import { CATEGORIES, articlesByCategory, ALL_ARTICLES } from '@/lib/help'
import HelpClient, { type CategorySummary, type ArticleLink } from './HelpClient'

export const metadata: Metadata = {
  title: 'Help Center · NutriSync',
  description: 'Answers and guides for logging food, tracking activity, groups, challenges, and your account.',
}

// Public Help Center home. Content is bundled, so search runs entirely client-side.
export default function HelpHomePage() {
  const categories: CategorySummary[] = CATEGORIES.map(c => ({
    id: c.id,
    title: c.title,
    emoji: c.emoji,
    description: c.description,
    count: articlesByCategory(c.id).length,
  }))

  const index: ArticleLink[] = ALL_ARTICLES.map(a => ({
    slug: a.slug,
    title: a.title,
    summary: a.summary,
    category: a.category,
    tags: a.tags,
  }))

  return <HelpClient categories={categories} index={index} />
}
