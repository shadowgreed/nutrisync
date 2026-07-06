// Help Center content model. Articles are structured content (not raw markdown)
// so every article renders in the same template: overview → steps → tips → FAQ →
// related → contact. Fields mirror the PRD's CMS schema (id/title/slug/category/
// tags/summary/body/last_updated/version); `body` is expressed as the structured
// fields below.

export type CategoryId =
  | 'getting-started'
  | 'food-logging'
  | 'activity'
  | 'groups'
  | 'challenges'
  | 'progress'
  | 'account'
  | 'troubleshooting'

export interface HelpCategory {
  id: CategoryId
  title: string
  emoji: string
  description: string
}

export interface FAQ {
  q: string
  a: string
}

export interface Article {
  id: string
  slug: string
  title: string
  category: CategoryId
  tags: string[]
  summary: string
  // ── body ──────────────────────────────────────────────────────────────────
  overview: string
  steps?: string[]
  tips?: string[]
  faqs?: FAQ[]
  related?: string[]      // slugs of related articles
  // ── metadata ────────────────────────────────────────────────────────────────
  lastUpdated: string     // ISO date, e.g. '2026-06-21'
  version: string         // content version, e.g. '1.0'
}

// Localized overlay for one article's translatable content, matched to its EN
// counterpart by `id` (never by array position). `slug`/`category`/`related`/
// `lastUpdated`/`version` are never translated — they're stable keys/metadata,
// not language-bearing text — so they always come from the EN base article.
export interface ArticleTranslation {
  id: string
  title: string
  tags: string[]
  summary: string
  overview: string
  steps?: string[]
  tips?: string[]
  faqs?: FAQ[]
}
