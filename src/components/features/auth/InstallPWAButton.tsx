"use client";

import { useState, useEffect } from "react";

export function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Mencegah mini-infobar muncul di mobile
      e.preventDefault();
      // Simpan event sehingga bisa di-trigger nanti
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("Untuk menginstal aplikasi PWA ini, silakan gunakan menu browser Anda:\n- Chrome/Edge: Klik ikon Install di address bar, atau menu (titik tiga) -> Install App.\n- Safari (iOS): Klik tombol Share -> Add to Home Screen.");
      return;
    }
    
    // Tampilkan prompt instalasi
    deferredPrompt.prompt();
    
    // Tunggu respon pengguna
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstallable(false);
    }
    
    // Hapus prompt karena hanya bisa dipakai sekali
    setDeferredPrompt(null);
  };

  return (
    <div className="mt-6 flex justify-center">
      <button
        onClick={handleInstallClick}
        type="button"
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        Install Aplikasi
      </button>
    </div>
  );
}
