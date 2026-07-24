import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureFinanceSeed } from '@/lib/finance/seed-server'
import FinanceNav from './FinanceNav'

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // First visit: seed the real accounts, categories, and starting debt
  // snapshot (no-op once data exists — see lib/finance/seed-server.ts).
  await ensureFinanceSeed(supabase, user.id)

  return (
    <div className="min-h-screen bg-stone-950 text-white pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <header className="px-4 pt-safe pb-2">
        <h1 className="text-xl font-bold">Money</h1>
      </header>
      <FinanceNav />
      <main className="px-4 pt-4">{children}</main>
    </div>
  )
}
