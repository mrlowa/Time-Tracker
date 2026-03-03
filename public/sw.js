/* eslint-env serviceworker */
import { precacheAndRoute } from 'workbox-precaching';

// Automatically precache the assets injected by Vite PWA
precacheAndRoute(self.__WB_MANIFEST || []);

// Listen for push notifications (if coming from a server, though we use local notifications)
self.addEventListener('push', (event) => {
    let rawData = event.data ? event.data.text() : '{}';
    let data;
    try {
        data = JSON.parse(rawData);
    } catch {
        data = { title: 'Time Tracker', body: rawData };
    }

    const options = {
        body: data.body,
        icon: '/pwa-192x192.png',
        badge: '/mask-icon.svg',
        data: data.data || {}
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Handle notification click (Deep Linking)
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Default URL to open if none is provided in the notification data
    let targetUrl = event.notification.data?.url || '/?catchup=true';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there's already a window available
            for (const client of clientList) {
                if (client.url && 'focus' in client) {
                    // Navigate existing client to the target URL
                    return client.navigate(targetUrl).then(c => c.focus());
                }
            }
            // If no window exists, open a new one
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// Self-updating service worker
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', () => {
    self.clients.claim();
});
