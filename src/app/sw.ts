/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, ExpirationPlugin } from "serwist";

// Declare global types for Serwist Service Worker
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & WorkerGlobalScope;

// Override: force NetworkFirst for JS bundles to prevent stale cache on mobile
const customCache = defaultCache.map((entry: any) => {
  // Override CacheFirst JS bundles → NetworkFirst
  if (entry.matcher instanceof RegExp && entry.matcher.source.includes('_next') && entry.matcher.source.includes('js')) {
    return {
      ...entry,
      handler: new NetworkFirst({
        cacheName: "next-js-assets-nf",
        plugins: [new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 1 day max
          maxAgeFrom: "last-used" as const,
        })],
        networkTimeoutSeconds: 10,
      }),
    };
  }
  return entry;
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: customCache,
});

serwist.addEventListeners();

// Handle Background Web Push Event (05:00 AM WIB Automated Notification & Badging)
self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || "ShiningSun Penjadwalan";
    const badgeCount = typeof payload.badgeCount === "number" ? payload.badgeCount : 0;

    const options: NotificationOptions = {
      body: payload.body || "Ada pembaruan jadwal hari ini.",
      icon: "/icon.png",
      badge: "/icon.png",
      tag: "daily-schedule-notification",
      data: { url: payload.url || "/dashboard" },
    };

    // Update PWA App Icon Badge on device Home Screen (Android / Windows / iOS 16.4+)
    if ("setAppBadge" in self.navigator) {
      (self.navigator as any).setAppBadge(badgeCount).catch(console.error);
    }

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("Error processing PWA push event:", err);
  }
});

// Handle Notification Click (Focus app window or open /dashboard)
self.addEventListener("notificationclick", (event: NotificationEvent) => {
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
