// Firebase Messaging Service Worker
// Handles background push notifications (when the app tab is not focused or closed)
// Must live at /firebase-messaging-sw.js (root) as required by FCM.

importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB1vbFUucvnAYDnQtuuuanaiQtAa_d-120",
  authDomain: "studio-1871371743-58ae3.firebaseapp.com",
  projectId: "studio-1871371743-58ae3",
  storageBucket: "studio-1871371743-58ae3.firebasestorage.app",
  messagingSenderId: "96358606625",
  appId: "1:96358606625:web:5b18081e88eb87abe08060",
});

const messaging = firebase.messaging();

// Handle messages received while the app is in the background or closed
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const url = payload.data?.url || '/notifications';

  self.registration.showNotification(title || 'Advize', {
    body: body || 'You have a new notification.',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    tag: payload.data?.notificationId || 'advize-notification',
    renotify: true,
    data: { url },
  });
});

// When the user clicks the notification, open the relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/notifications';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a tab is already open, focus it and navigate
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) client.navigate(url);
            return;
          }
        }
        // Otherwise open a new tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});
