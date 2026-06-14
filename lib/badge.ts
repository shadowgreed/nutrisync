// App-icon badge (the red unread count on the installed PWA icon). Uses the
// Badging API where supported (installed PWAs on Chrome/Edge/Android, and iOS
// 16.4+ Home Screen apps). No-ops everywhere else, so it's always safe to call.
export function setAppBadge(count: number) {
  if (typeof navigator === 'undefined') return
  try {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>
      clearAppBadge?: () => Promise<void>
    }
    if (count > 0 && nav.setAppBadge) nav.setAppBadge(count)
    else if (nav.clearAppBadge) nav.clearAppBadge()
  } catch {
    /* unsupported / permission — ignore */
  }
}
