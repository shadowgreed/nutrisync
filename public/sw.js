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
      // An already-open window at the exact target URL: just focus it.
      const exact = list.find((client) => client.url === urlToOpen)
      if (exact) return exact.focus()
      // Otherwise open a fresh window/tab at the target URL. client.navigate()
      // on an existing window is deliberately not used here — its returned
      // promise was previously fired-and-forgotten (never awaited before the
      // waitUntil() chain resolved), which is a race the service worker can
      // lose on any platform, and some mobile WebKit/PWA builds have also
      // shown it silently no-op instead of navigating. openWindow() is the
      // well-supported, reliable primitive for this.
      if (self.clients.openWindow) return self.clients.openWindow(urlToOpen)
      const any = list.find((client) => 'focus' in client)
      if (any) return any.focus()
    }),
  )
})
