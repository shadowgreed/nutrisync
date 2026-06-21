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

// ── Search ───────────────────────────────────────────────────────────────────
// Ranking priorities (PRD): exact match → feature-specific content →
// troubleshooting → related. Implemented as a weighted score over title, tags,
// summary, and body, with a small per-category nudge so feature pages outrank
// troubleshooting on equal text matches.

const CATEGORY_WEIGHT: Record<CategoryId, number> = {
  'getting-started': 3,
  'food-logging': 3,
  'activity': 3,
  'groups': 3,
  'challenges': 3,
  'progress': 3,
  'account': 2,
  'troubleshooting': 1,
}

function scoreArticle(a: Article, q: string, tokens: string[]): number {
  const title = a.title.toLowerCase()
  const tags = a.tags.map(t => t.toLowerCase())
  const haystack = `${a.summary} ${a.overview}`.toLowerCase()
  let score = 0

  if (title === q) score += 1000
  else if (title.includes(q)) score += 200
  if (tags.some(t => t === q)) score += 300
  if (tags.some(t => t.includes(q))) score += 80

  for (const tok of tokens) {
    if (title.includes(tok)) score += 40
    if (tags.some(t => t.includes(tok))) score += 25
    if (haystack.includes(tok)) score += 8
  }

  if (score > 0) score += CATEGORY_WEIGHT[a.category]
  return score
}

export interface SearchHit { article: Article; score: number }

export function searchArticles(query: string): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const tokens = [...new Set(q.split(/\s+/).filter(t => t.length >= 2))]
  return ALL_ARTICLES
    .map(article => ({ article, score: scoreArticle(article, q, tokens) }))
    .filter(h => h.score > 0)
    .sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title))
}
