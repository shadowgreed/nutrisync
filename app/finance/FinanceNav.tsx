'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/finance', label: 'Dashboard' },
  { href: '/finance/debt', label: 'Debt' },
  { href: '/finance/transactions', label: 'Transactions' },
  { href: '/finance/import', label: 'Import' },
]

export default function FinanceNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Finance sections" className="px-4 flex gap-1 overflow-x-auto border-b border-stone-800">
      {TABS.map(t => {
        const active = pathname === t.href
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              active
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-stone-400 hover:text-white'
            }`}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
