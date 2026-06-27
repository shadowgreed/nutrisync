'use client'

import { useEffect } from 'react'

// Last-resort boundary for errors thrown in the root layout itself. It must
// render its own <html>/<body> because it replaces the entire document.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0c0a09', color: '#e7e5e4', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }} aria-hidden="true">🌧️</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Something went wrong</h1>
            <p style={{ color: '#a8a29e', fontSize: 14, marginTop: 8 }}>
              The app hit an unexpected error. Please try again.
            </p>
            <button
              onClick={reset}
              style={{ marginTop: 20, background: '#059669', color: '#fff', fontWeight: 600, fontSize: 14, padding: '10px 16px', borderRadius: 12, border: 'none', cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
