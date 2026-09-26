// Without these, a freshly-registered worker activates but never takes
// control of the page that registered it -- that page would stay
// uncontrolled until its next reload, and anything awaiting
// navigator.serviceWorker.ready on it hangs forever. skipWaiting +
// clients.claim make control immediate on first install.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const tasks = [
    self.registration.showNotification(data.title || 'Watson SMS', {
      body: data.body || '',
      icon: '/sms-icon-192.png',
      badge: '/sms-icon-192.png',
      data: { url: data.url || '/sms' },
    }),
  ];
  // The in-page badge sync (SmsApp.tsx) only runs while the app's JS is
  // actually executing -- a push arriving with the app closed needs the
  // service worker itself to set the badge, using the count the backend
  // computed at send time (bridge.py), since the worker has no access to
  // the app's React state or an authenticated fetch of its own.
  if ('setAppBadge' in self.registration && typeof data.unread_count === 'number') {
    tasks.push(
      data.unread_count > 0
        ? self.registration.setAppBadge(data.unread_count)
        : self.registration.clearAppBadge()
    );
  }
  event.waitUntil(Promise.all(tasks));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/sms';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
