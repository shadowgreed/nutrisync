'use client'

import { useEffect, useState } from 'react'

// Last-resort boundary for errors thrown in the root layout itself. It must
// render its own <html>/<body> because it replaces the entire document, so it
// can't use I18nProvider (the layout that mounts it is what just crashed) —
// instead it reads the locale cookie directly, with tiny inline copy so this
// file stays maximally dependency-free.
const COPY = {
  en: { lang: 'en', title: 'Something went wrong', body: 'The app hit an unexpected error. Please try again.', retry: 'Try again' },
  es: { lang: 'es-419', title: 'Algo salió mal', body: 'La app tuvo un error inesperado. Inténtalo de nuevo.', retry: 'Intentar de nuevo' },
}

function readLocale(): 'en' | 'es' {
  if (typeof document === 'undefined') return 'en'
  const match = document.cookie.match(/(?:^|; )nutrisync_locale=([^;]+)/)
  return match?.[1] === 'es' ? 'es' : 'en'
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [locale, setLocale] = useState<'en' | 'es'>('en')
  const t = COPY[locale]

  useEffect(() => {
    console.error('Global error:', error)
    setLocale(readLocale())
  }, [error])

  return (
    <html lang={t.lang}>
      <body style={{ margin: 0, background: '#0c0a09', color: '#e7e5e4', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }} aria-hidden="true">🌧️</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{t.title}</h1>
            <p style={{ color: '#a8a29e', fontSize: 14, marginTop: 8 }}>
              {t.body}
            </p>
            <button
              onClick={reset}
              style={{ marginTop: 20, background: '#059669', color: '#fff', fontWeight: 600, fontSize: 14, padding: '10px 16px', borderRadius: 12, border: 'none', cursor: 'pointer' }}
            >
              {t.retry}
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
