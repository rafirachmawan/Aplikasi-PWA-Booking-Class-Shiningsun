"use client";

import { useState } from "react";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { Icons } from "@/components/ui/icons";

export function NotificationPermissionBanner() {
  const { permission, isSubscribed, isLoading, subscribeToPush } = usePushSubscription();
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || permission === "unsupported") {
    return null;
  }

  // Active / Subscribed State -> Show green status indicator
  if (isSubscribed || permission === "granted") {
    return (
      <div className="mb-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-500/20 p-3 sm:p-3.5 backdrop-blur-md flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Icons.check className="w-4 h-4 stroke-[3]" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span>Notifikasi Pagi (05:00 WIB) Aktif</span>
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                PWA Auto-Badge Active
              </span>
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
              Perangkat Anda terdaftar. Ikon PWA di HP/Desktop akan otomatis menampilkan angka jadwal siswa jam 5 pagi.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
          title="Tutup Status"
        >
          <Icons.close className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Not Subscribed / Pending Permission State -> Show activation prompt
  return (
    <div className="mb-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-brand-500/10 to-indigo-500/10 border border-amber-500/20 p-3.5 sm:p-4 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
      <div className="flex items-start sm:items-center gap-3">
        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0">
          <Icons.bell className="w-5 h-5 animate-bounce" />
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            <span>Aktifkan Notifikasi Pagi (05:00 WIB)</span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
              PWA Auto-Badge
            </span>
          </h4>
          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
            Dapatkan angka jumlah jadwal siswa langsung di atas ikon HP Anda setiap jam 5 pagi.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
        <button
          type="button"
          onClick={subscribeToPush}
          disabled={isLoading}
          className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Icons.bell className="w-3.5 h-3.5" />
          )}
          <span>{isLoading ? "Mengaktifkan..." : "Aktifkan Notifikasi"}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          title="Nanti Saja"
        >
          <Icons.close className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
