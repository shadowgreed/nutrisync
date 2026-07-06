import type { MetadataRoute } from 'next'
import { getDict } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n/server'

// Reads the locale cookie (a Next.js request-time API), so this manifest route
// opts into dynamic rendering instead of being cached as a single static file —
// the installed-app name stays "NutriSync" (brand, never translated) but the
// description follows the visitor's language.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = getDict(await getLocale())
  return {
    name: 'NutriSync',
    short_name: 'NutriSync',
    description: t.manifest.description,
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0c0a09',
    theme_color: '#059669',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
