// PWA Service Worker for ShiningSun Penjadwalan

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle Background Web Push Event (05:00 AM WIB Automated Notification & Badging)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || "ShiningSun Penjadwalan";
    const badgeCount = typeof payload.badgeCount === "number" ? payload.badgeCount : 0;

    const options = {
      body: payload.body || "Ada pembaruan jadwal hari ini.",
      icon: "/icon.png",
      badge: "/icon.png",
      tag: "daily-schedule-notification",
      data: { url: payload.url || "/dashboard" },
    };

    // Update PWA App Icon Badge on device Home Screen (Android / Windows / iOS 16.4+)
    if ("setAppBadge" in self.navigator) {
      self.navigator.setAppBadge(badgeCount).catch(console.error);
    }

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("Error processing PWA push event:", err);
  }
});

// Handle Notification Click (Focus app window or open /dashboard)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
