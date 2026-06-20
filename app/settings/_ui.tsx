import Link from 'next/link'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

// Shared presentational pieces for the Settings hub + its sub-screens. Pure
// (no hooks), so they work in server components.

export function SettingsShell({ title, back = '/settings', children }: { title: string; back?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-950 text-white pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="px-4 pt-12 pb-3 flex items-center gap-3">
        <Link href={back} aria-label="Back" className="text-stone-300 hover:text-white">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-xl font-bold">{title}</h1>
      </header>
      {children}
    </div>
  )
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="px-4 mb-5">
      {title && <p className="text-stone-400 text-xs uppercase tracking-wider mb-2">{title}</p>}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl divide-y divide-stone-800 overflow-hidden">
        {children}
      </div>
    </section>
  )
}

export function LinkRow({ icon, label, value, href, soon }: {
  icon: ReactNode; label: string; value?: string; href?: string; soon?: boolean
}) {
  const inner = (
    <>
      <span className="shrink-0 text-stone-400">{icon}</span>
      <span className="flex-1 text-sm text-stone-200">{label}</span>
      {value && <span className="text-stone-500 text-xs">{value}</span>}
      {soon
        ? <span className="text-[10px] font-semibold text-stone-500 bg-stone-800 border border-stone-700 px-1.5 py-0.5 rounded-full">Soon</span>
        : href && <ChevronRight size={16} className="text-stone-600 shrink-0" />}
    </>
  )
  const cls = `w-full flex items-center gap-3 px-4 py-3 text-left ${soon ? 'opacity-60' : 'hover:bg-stone-800/50'} transition-colors`
  if (href && !soon) return <Link href={href} className={cls}>{inner}</Link>
  return <div className={cls}>{inner}</div>
}
