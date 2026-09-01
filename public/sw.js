self.addEventListener('push', event => {
  let data = { title: 'Tom Krise 19th Hole Golf League', body: 'You have a new league message.', url: '/messages' }
  try { if (event.data) data = {...data, ...event.data.json()} } catch (_) {}
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/favicon-48.png',
    data: { url: data.url || '/messages' },
    tag: data.tag || 'league-message',
    renotify: true
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/messages', self.location.origin).href
  event.waitUntil(clients.matchAll({type:'window', includeUncontrolled:true}).then(windows => {
    for (const client of windows) {
      if ('focus' in client) { client.navigate(target); return client.focus() }
    }
    return clients.openWindow ? clients.openWindow(target) : undefined
  }))
})
