import type { Article, CategoryId } from './types'
import { gettingStarted } from './articles/getting-started'
import { foodLogging } from './articles/food-logging'
import { activity } from './articles/activity'
import { groups } from './articles/groups'
import { challenges } from './articles/challenges'
import { progress } from './articles/progress'
import { account } from './articles/account'
import { troubleshooting } from './articles/troubleshooting'

export * from './types'
export { CATEGORIES, getCategory } from './categories'

export const ALL_ARTICLES: Article[] = [
  ...gettingStarted,
  ...foodLogging,
  ...activity,
  ...groups,
  ...challenges,
  ...progress,
  ...account,
  ...troubleshooting,
]

const BY_SLUG: Record<string, Article> = Object.fromEntries(ALL_ARTICLES.map(a => [a.slug, a]))

export function getArticle(slug: string): Article | null {
  return BY_SLUG[slug] ?? null
}

export function allSlugs(): string[] {
  return ALL_ARTICLES.map(a => a.slug)
}

export function articlesByCategory(category: CategoryId): Article[] {
  return ALL_ARTICLES.filter(a => a.category === category)
}

// Resolve an article's related slugs to real articles, skipping any that don't
// exist so a stale reference never crashes the page.
export function getRelated(article: Article): Article[] {
  return (article.related ?? [])
    .map(slug => BY_SLUG[slug])
    .filter((a): a is Article => !!a)
}

// NOTE: in-app search lives in app/help/HelpClient.tsx (client-side ranking over
// the article index). A previous server-side searchArticles()/scoreArticle()
// here was unused and has been removed to avoid two divergent rankers.
