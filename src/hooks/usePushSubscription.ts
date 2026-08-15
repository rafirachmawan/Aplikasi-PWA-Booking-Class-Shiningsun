"use client";

import { useState, useEffect, useCallback } from "react";
import { getBranchId } from "@/lib/actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function getSWRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    let reg = await navigator.serviceWorker.getRegistration();

    if (!reg) {
      reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }

    if (reg) return reg;

    const readyReg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);

    return readyReg;
  } catch (err) {
    console.warn("Failed to get or register service worker:", err);
    return null;
  }
}

export function usePushSubscription() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);

    // Clear app badge when app is opened
    if ("clearAppBadge" in navigator) {
      (navigator as any).clearAppBadge().catch(() => {});
    }

    // Check if subscription exists
    getSWRegistration().then((reg) => {
      if (reg) {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        }).catch(() => {});
      }
    });
  }, []);

  const subscribeToPush = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      return { success: false, message: "Browser Anda tidak mendukung Web Push Notification." };
    }

    setIsLoading(true);

    try {
      // 1. Request notification permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        return {
          success: false,
          message: "Izin notifikasi ditolak oleh browser. Silakan izinkan notifikasi di pengaturan browser Anda.",
        };
      }

      // 2. Fetch VAPID public key
      let vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        try {
          const keyRes = await fetch("/api/push/vapid-key");
          const keyData = await keyRes.json();
          vapidPublicKey = keyData.publicKey;
        } catch (e) {
          console.error("Failed to fetch VAPID key from API:", e);
        }
      }

      if (!vapidPublicKey) {
        return { success: false, message: "Gagal mendapatkan Kunci VAPID Notifikasi. Silakan muat ulang halaman." };
      }

      // 3. Get Service Worker Registration
      const reg = await getSWRegistration();
      if (!reg) {
        return { success: false, message: "Service Worker belum aktif. Pastikan aplikasi berjalan via PWA / HTTPS." };
      }

      // 4. Subscribe with PushManager
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const branchId = (await getBranchId()) || "ALL";

      // 5. Save subscription to backend DB
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          branchId,
        }),
      });

      const resData = await res.json().catch(() => ({}));
      if (res.ok) {
        setIsSubscribed(true);
        
        // Show immediate system notification popup on the user's OS/device
        if (reg && "showNotification" in reg) {
          reg.showNotification("Notifikasi PWA ShiningSun Aktif! 🎉", {
            body: "Notifikasi PWA berhasil diaktifkan. Anda akan menerima pengingat dan pembaruan jadwal.",
            icon: "/logo.png",
            badge: "/logo.png",
            tag: "pwa-subscribe-success",
          } as NotificationOptions).catch(() => {});
        }

        return {
          success: true,
          message: "Notifikasi PWA berhasil diaktifkan! Perangkat ini akan menerima update jadwal pukul 05:00 WIB.",
        };
      } else {
        throw new Error(resData.error || "Server gagal menyimpan pendaftaran notifikasi");
      }
    } catch (err: any) {
      console.error("Error subscribing to push notifications:", err);
      return {
        success: false,
        message: err.message || "Gagal mengaktifkan notifikasi.",
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribeFromPush = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);

    try {
      const reg = await getSWRegistration();
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
      }

      if ("clearAppBadge" in navigator) {
        (navigator as any).clearAppBadge().catch(() => {});
      }

      setIsSubscribed(false);
      return {
        success: true,
        message: "Notifikasi PWA telah berhasil dinonaktifkan dari perangkat ini.",
      };
    } catch (err: any) {
      console.error("Error unsubscribing:", err);
      return {
        success: false,
        message: err.message || "Gagal menonaktifkan notifikasi.",
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    permission,
    isSubscribed,
    isLoading,
    subscribeToPush,
    unsubscribeFromPush,
  };
}
