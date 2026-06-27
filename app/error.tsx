'use client'

import { useEffect } from 'react'

// Route-level error boundary. Catches render/data errors in any segment so a
// single failed query can't blank the screen — the user gets a recovery action.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surfaced in server logs / browser console for debugging.
    console.error('Route error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="text-4xl mb-3" aria-hidden="true">🌧️</div>
        <h1 className="text-white text-xl font-bold">Something went wrong</h1>
        <p className="text-stone-400 text-sm mt-2">
          That screen hit a snag. You can try again, or head back to your dashboard.
        </p>
        <div className="flex gap-2 justify-center mt-5">
          <button
            onClick={reset}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            Go to dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
