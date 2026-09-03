const BADGE_CACHE='golf-league-app-badge-v1'
const BADGE_KEY='/__message_badge_count__'

async function readBadgeCount(){
  try{
    const cache=await caches.open(BADGE_CACHE)
    const response=await cache.match(BADGE_KEY)
    return response?Math.max(0,Number(await response.text())||0):0
  }catch(_){return 0}
}
async function writeBadgeCount(count){
  const safe=Math.max(0,Math.floor(Number(count)||0))
  try{
    const cache=await caches.open(BADGE_CACHE)
    await cache.put(BADGE_KEY,new Response(String(safe)))
  }catch(_){}
  try{
    if(self.navigator?.setAppBadge){
      if(safe>0)await self.navigator.setAppBadge(safe)
      else if(self.navigator.clearAppBadge)await self.navigator.clearAppBadge()
    }
  }catch(_){}
}

self.addEventListener('message',event=>{
  if(event.data?.type==='SET_MESSAGE_BADGE')event.waitUntil(writeBadgeCount(event.data.count))
})

self.addEventListener('push', event => {
  let data = { title: 'Tom Krise 19th Hole Golf League', body: 'You have a new league message.', url: '/messages' }
  try { if (event.data) data = {...data, ...event.data.json()} } catch (_) {}
  event.waitUntil((async()=>{
    if(data.kind==='announcement'){
      const current=await readBadgeCount()
      await writeBadgeCount(current+1)
    }
    await self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/favicon-48.png',
      data: { url: data.url || '/messages' },
      tag: data.tag || 'league-message',
      renotify: true
    })
  })())
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
