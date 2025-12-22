self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('notificationclick', e => {
  e.notification.close();
});
