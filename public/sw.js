// PWA Service Worker for ShiningSun Penjadwalan

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      // Bersihkan cache versi lama agar tidak menumpuk di HP user.
      const keep = [STATIC_CACHE, ASSET_CACHE];
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("shiningsun-") && !keep.includes(n))
          .map((n) => caches.delete(n)),
      );
    })(),
  );
});

// --- Hemat Origin: runtime caching untuk file statis saja (tanpa ubah logika
// aplikasi/data). Dokumen HTML, RSC, dan API SENGAJA tidak di-cache di sini
// (fetch handler di bawah mengabaikannya) sehingga data selalu fresh dari
// jaringan — perilaku aplikasi identik, yang hemat hanya file fingerprinted.
const STATIC_CACHE = "shiningsun-static-v1"; // /_next/static/* (content-hash, immutable)
const ASSET_CACHE = "shiningsun-asset-v1"; // logo/manifest/icon (SWR, TTL 1 hari)
const ASSET_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const SWR_PATHS = new Set([
  "/logo.webp",
  "/logo.png",
  "/icon.png",
  "/manifest.webmanifest",
]);

function isStaticChunk(url) {
  return url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");
}

function isCacheableAsset(url) {
  return url.origin === self.location.origin && SWR_PATHS.has(url.pathname);
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  // Cache hanya respons sukses agar error tidak membeku di HP user.
  if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
  return res;
}

async function staleWhileRevalidate(request, cacheName, maxAgeMs) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const fresh = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => hit);
  if (hit) {
    const dateHeader = hit.headers.get("date");
    const age = dateHeader ? Date.now() - new Date(dateHeader).getTime() : 0;
    // Entri basi (>TTL) tetap disajikan sambil revalidasi di background.
    if (age > maxAgeMs) return fresh.then((res) => res || hit);
    return hit;
  }
  return fresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (isStaticChunk(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isCacheableAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE, ASSET_MAX_AGE_MS));
  }
  // Selain itu: biarkan ke jaringan (data selalu fresh, logika tak berubah).
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
