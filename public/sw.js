// Service Worker para Web Push Notifications
self.addEventListener('push', function(event) {
  console.log('Push received:', event);
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Alerta EPP', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || 'EPP no detectado',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'epp-alert',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'Ver Detalles'
      },
      {
        action: 'dismiss',
        title: 'Cerrar'
      }
    ],
    data: data
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Alerta EPP - CoironTech', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event);
});