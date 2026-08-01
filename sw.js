const CACHE_NAME = 'lilxu-workbench-v34';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=34',
  './app.js?v=34',
  './manifest.json?v=34',
  './icons/icon-v15.svg?v=34',
  './icons/icon-192-v15.png?v=34',
  './icons/icon-512-v15.png?v=34'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // 全部走网络优先，彻底解决缓存导致看不到更新的问题
  event.respondWith(
    fetch(event.request).then((res) => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      return res;
    }).catch(() =>
      caches.match(event.request).then((cached) => cached || caches.match('./index.html'))
    )
  );
});

// 点击通知时聚焦到已打开的页面
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
