"use client";

import { useEffect, useState } from "react";

/**
 * Hook untuk mendeteksi apakah ada update PWA yang tersedia.
 * Serwist menggunakan skipWaiting: true, jadi SW baru langsung aktif
 * setelah install. Kita hanya perlu reload page agar konten terbaru tampil.
 */
export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const checkForUpdate = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        // Kalau sudah ada SW waiting (update siap), langsung tandai
        if (registration.waiting) {
          setUpdateAvailable(true);
        }

        // Dengarkan kalau ada SW baru yang sedang install
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            // Kalau SW baru sudah installed dan ada SW lama aktif → ada update
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      } catch (e) {
        console.warn("[PWA] Gagal cek update SW:", e);
      }
    };

    checkForUpdate();

    // Cek update setiap kali tab kembali focus (user balik ke app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        navigator.serviceWorker.getRegistration().then((reg) => {
          reg?.update().catch(() => {});
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const applyUpdate = () => {
    setIsUpdating(true);
    // Reload page → browser akan pakai SW + asset terbaru
    window.location.reload();
  };

  return { updateAvailable, isUpdating, applyUpdate };
}
