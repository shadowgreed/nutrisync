import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { getArticle, getRelated, getCategory, allSlugs } from '@/lib/help'
import ArticleFeedback from './ArticleFeedback'

// Help articles are bundled content — pre-render every one.
export function generateStaticParams() {
  return allSlugs().map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) return { title: 'Help · NutriSync' }
  return { title: `${article.title} · NutriSync Help`, description: article.summary }
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) notFound()

  const category = getCategory(article.category)
  const related = getRelated(article)

  return (
    <div className="min-h-screen bg-stone-950 text-white pb-16">
      {/* Header / breadcrumb */}
      <header className="px-4 pt-12 pb-3 flex items-center gap-3">
        <Link href={`/help/category/${category.id}`} aria-label="Back" className="flex items-center justify-center w-11 h-11 -ml-2 text-stone-300 hover:text-white">
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <div className="min-w-0">
          <Link href="/help" className="text-stone-500 text-xs hover:text-stone-300">Help Center</Link>
          <span className="text-stone-400 text-xs"> / </span>
          <Link href={`/help/category/${category.id}`} className="text-stone-500 text-xs hover:text-stone-300">{category.title}</Link>
        </div>
      </header>

      <article className="px-5 max-w-2xl mx-auto">
        <p className="text-2xl mb-1" aria-hidden="true">{category.emoji}</p>
        <h1 className="text-white text-2xl font-bold leading-tight">{article.title}</h1>

        {/* Overview */}
        <p className="text-stone-300 text-sm leading-relaxed mt-4">{article.overview}</p>

        {/* Step-by-step */}
        {article.steps && article.steps.length > 0 && (
          <section className="mt-6">
            <h2 className="text-white font-semibold text-base mb-2">Step by step</h2>
            <ol className="space-y-2">
              {article.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-stone-300">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-900/50 border border-emerald-800/50 text-emerald-300 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="pt-0.5 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Tips */}
        {article.tips && article.tips.length > 0 && (
          <section className="mt-6">
            <h2 className="text-white font-semibold text-base mb-2">Tips</h2>
            <ul className="space-y-1.5">
              {article.tips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm text-stone-300 leading-relaxed">
                  <span className="text-emerald-400 shrink-0" aria-hidden="true">💡</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Common questions */}
        {article.faqs && article.faqs.length > 0 && (
          <section className="mt-6">
            <h2 className="text-white font-semibold text-base mb-2">Common questions</h2>
            <div className="space-y-3">
              {article.faqs.map((faq, i) => (
                <div key={i}>
                  <p className="text-stone-200 text-sm font-medium">{faq.q}</p>
                  <p className="text-stone-400 text-sm leading-relaxed mt-0.5">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Feedback */}
        <div className="mt-8">
          <ArticleFeedback slug={article.slug} />
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-6">
            <h2 className="text-white font-semibold text-base mb-2">Related articles</h2>
            <ul className="bg-stone-900 border border-stone-800 rounded-2xl divide-y divide-stone-800 overflow-hidden">
              {related.map(r => (
                <li key={r.slug}>
                  <Link href={`/help/${r.slug}`} className="flex items-center gap-2 px-4 py-3 hover:bg-stone-800/50 transition-colors">
                    <span className="flex-1 text-sm text-stone-200">{r.title}</span>
                    <ChevronRight size={16} className="text-stone-600 shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Need more help */}
        <section className="mt-6">
          <a
            href="mailto:hello@nutrisync.app?subject=NutriSync%20support"
            className="flex items-center justify-between gap-2 bg-stone-900 border border-stone-800 rounded-2xl px-4 py-3 hover:border-stone-600 transition-colors"
          >
            <div>
              <p className="text-white text-sm font-medium">Need more help?</p>
              <p className="text-stone-500 text-xs">Contact our support team.</p>
            </div>
            <ChevronRight size={16} className="text-stone-600 shrink-0" aria-hidden="true" />
          </a>
        </section>

        <p className="text-stone-400 text-[11px] mt-6">Last updated {article.lastUpdated} · v{article.version}</p>
      </article>
    </div>
  )
}
