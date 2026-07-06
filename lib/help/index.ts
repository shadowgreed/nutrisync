import type { Article, ArticleTranslation, CategoryId } from './types'
import type { Locale } from '@/lib/i18n'
import { gettingStarted } from './articles/getting-started'
import { foodLogging } from './articles/food-logging'
import { activity } from './articles/activity'
import { groups } from './articles/groups'
import { challenges } from './articles/challenges'
import { progress } from './articles/progress'
import { account } from './articles/account'
import { troubleshooting } from './articles/troubleshooting'
import { gettingStartedEs } from './articles-es/getting-started'
import { foodLoggingEs } from './articles-es/food-logging'
import { activityEs } from './articles-es/activity'
import { groupsEs } from './articles-es/groups'
import { challengesEs } from './articles-es/challenges'
import { progressEs } from './articles-es/progress'
import { accountEs } from './articles-es/account'
import { troubleshootingEs } from './articles-es/troubleshooting'

export * from './types'
export { CATEGORIES, getCategory, localizedCategories } from './categories'

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

const ALL_TRANSLATIONS_ES: ArticleTranslation[] = [
  ...gettingStartedEs,
  ...foodLoggingEs,
  ...activityEs,
  ...groupsEs,
  ...challengesEs,
  ...progressEs,
  ...accountEs,
  ...troubleshootingEs,
]

const BY_SLUG: Record<string, Article> = Object.fromEntries(ALL_ARTICLES.map(a => [a.slug, a]))
const ES_BY_ID: Record<string, ArticleTranslation> = Object.fromEntries(ALL_TRANSLATIONS_ES.map(a => [a.id, a]))

// Overlay the Spanish translation (matched by the stable `id`, never by array
// position) onto the EN base article. `slug`/`category`/`related`/`lastUpdated`/
// `version` always come from the EN base — they're keys/metadata, not text.
function localize(article: Article, locale: Locale): Article {
  if (locale !== 'es') return article
  const es = ES_BY_ID[article.id]
  if (!es) return article
  return {
    ...article,
    title: es.title,
    tags: es.tags,
    summary: es.summary,
    overview: es.overview,
    steps: es.steps ?? article.steps,
    tips: es.tips ?? article.tips,
    faqs: es.faqs ?? article.faqs,
  }
}

export function getArticle(slug: string, locale: Locale = 'en'): Article | null {
  const article = BY_SLUG[slug] ?? null
  return article ? localize(article, locale) : null
}

export function allSlugs(): string[] {
  return ALL_ARTICLES.map(a => a.slug)
}

export function articlesByCategory(category: CategoryId, locale: Locale = 'en'): Article[] {
  return ALL_ARTICLES.filter(a => a.category === category).map(a => localize(a, locale))
}

/** All articles, localized, in their original order — for the search index. */
export function localizedArticles(locale: Locale = 'en'): Article[] {
  return ALL_ARTICLES.map(a => localize(a, locale))
}

// Resolve an article's related slugs to real articles, skipping any that don't
// exist so a stale reference never crashes the page.
export function getRelated(article: Article, locale: Locale = 'en'): Article[] {
  return (article.related ?? [])
    .map(slug => BY_SLUG[slug])
    .filter((a): a is Article => !!a)
    .map(a => localize(a, locale))
}

// NOTE: in-app search lives in app/help/HelpClient.tsx (client-side ranking over
// the article index). A previous server-side searchArticles()/scoreArticle()
// here was unused and has been removed to avoid two divergent rankers.
