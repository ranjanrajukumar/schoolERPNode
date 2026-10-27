/* Service worker: shows push notifications sent from School ERP and opens the linked page when one is clicked. */
self.addEventListener('push', (event) => {
  let data = { title: 'School ERP', body: '', url: '/' };
  try { data = { ...data, ...event.data.json() }; } catch { /* keep the defaults */ }
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, data: { url: data.url } }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin));
      return open ? open.focus().then((w) => w.navigate(url)) : self.clients.openWindow(url);
    }),
  );
});
