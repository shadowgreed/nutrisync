'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

// Shared shell for the Privacy / Terms / About pages.
export default function LegalPage({
  title, updated, children,
}: { title: string; updated?: string; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-stone-950 pb-16">
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Back" className="flex items-center justify-center w-11 h-11 -ml-2 text-stone-300 hover:text-white">
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h1 className="text-white text-2xl font-bold">{title}</h1>
      </div>
      <div className="px-5 max-w-2xl mx-auto space-y-5 text-stone-300 text-sm leading-relaxed [&_h2]:text-white [&_h2]:font-semibold [&_h2]:text-base [&_h2]:mt-6 [&_h2]:mb-1.5 [&_a]:text-emerald-400 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:text-stone-100">
        {updated && <p className="text-stone-500 text-xs">Last updated: {updated}</p>}
        {children}
      </div>
    </div>
  )
}
