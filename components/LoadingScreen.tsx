import { BottomNav } from '@/app/dashboard/DashboardClient'

// Lightweight skeleton shown (via route loading.tsx) the instant you navigate,
// while the server component fetches. Keeps the bottom nav in place so tab
// switches feel immediate.
export default function LoadingScreen({ active, cards = 4 }: { active: string; cards?: number }) {
  return (
    <div className="min-h-screen bg-stone-950 pb-24">
      <div className="px-4 pt-12 pb-4">
        <div className="h-4 w-32 bg-stone-800 rounded mb-2 animate-pulse" />
        <div className="h-7 w-48 bg-stone-800 rounded animate-pulse" />
      </div>
      <div className="px-4 space-y-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="h-28 bg-stone-900 border border-stone-800 rounded-2xl animate-pulse"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
      <BottomNav active={active} />
    </div>
  )
}
