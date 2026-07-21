// NutriSync service worker — handles incoming web-push notifications.

// Activate a newly deployed service worker immediately instead of waiting for
// every tab to close — otherwise code changes here (like the app badge) never
// take effect for already-installed users.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (e) { data = {} }

  const title = data.title || 'NutriSync'
  const options = {
    body: data.body || '',
    badge: '/icon-badge.png',
    icon: '/icon-192.png',
    data: { url: data.url || '/notifications' },
    tag: data.tag || undefined,
  }

  const tasks = [self.registration.showNotification(title, options)]

  // App-icon badge (the red unread count) — works even when the app is closed.
  if (typeof data.count === 'number' && self.navigator && self.navigator.setAppBadge) {
    tasks.push(
      data.count > 0
        ? self.navigator.setAppBadge(data.count)
        : (self.navigator.clearAppBadge ? self.navigator.clearAppBadge() : Promise.resolve()),
    )
  }

  event.waitUntil(Promise.all(tasks))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/notifications'
  const urlToOpen = new URL(url, self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // Prefer an existing app window: exact URL if one exists, else any
      // window under this SW's scope. Deep links are /feed?post=<id>, which
      // an open client essentially never exact-matches — so without the
      // scope fallback every tap opened a NEW window, and on iOS standalone
      // PWAs openWindow() often lands in Safari instead of the installed
      // app (audit 2026-07-15, NF-PWA-1).
      const scope = self.registration.scope
      const client =
        list.find((c) => c.url === urlToOpen) ||
        list.find((c) => c.url.startsWith(scope))
      if (client) {
        // Focus first, then navigate, and AWAIT both inside waitUntil — the
        // pre-#100 bug was a fired-and-forgotten navigate() the worker could
        // be reaped under. If navigate is unsupported or fails (some WebKit
        // builds), fall back to a fresh window.
        return client.focus().then((focused) => {
          const target = focused || client
          if (target.url === urlToOpen || typeof target.navigate !== 'function') return target
          return target.navigate(urlToOpen).catch(() =>
            self.clients.openWindow ? self.clients.openWindow(urlToOpen) : undefined,
          )
        })
      }
      if (self.clients.openWindow) return self.clients.openWindow(urlToOpen)
    }),
  )
})
