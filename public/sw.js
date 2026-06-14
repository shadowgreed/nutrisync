// NutriSync service worker — handles incoming web-push notifications.

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
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    }),
  )
})
