self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle http and https schemes.
  // Custom protocols like web+candyd should NOT be handled by the service worker fetch event.
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  event.respondWith(fetch(event.request));
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'Candyd NFC';
  const options = {
    body: data.body || 'A new memory or update is available!',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: data.url || '/',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});
