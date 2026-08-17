"use client";

import { useState } from "react";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { Icons } from "@/components/ui/icons";
import { NotificationStatusModal } from "@/components/ui/NotificationStatusModal";

export function NotificationPermissionBanner() {
  const {
    permission,
    isSubscribed,
    isLoading,
    subscribeToPush,
    unsubscribeFromPush,
  } = usePushSubscription();

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: "success" | "warning" | "error" | "info";
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  if (permission === "unsupported") {
    return null;
  }

  const isActive = isSubscribed;

  const handleSubscribe = async () => {
    const res = await subscribeToPush();
    if (res.success) {
      setModalConfig({
        isOpen: true,
        type: "success",
        title: "Notifikasi Berhasil Diaktifkan! 🎉",
        message: res.message,
      });
    } else {
      setModalConfig({
        isOpen: true,
        type: "error",
        title: "Gagal Mengaktifkan Notifikasi",
        message: res.message,
      });
    }
  };

  const handleUnsubscribe = async () => {
    const res = await unsubscribeFromPush();
    if (res.success) {
      setModalConfig({
        isOpen: true,
        type: "warning",
        title: "Notifikasi Dinonaktifkan 🔕",
        message: res.message,
      });
    } else {
      setModalConfig({
        isOpen: true,
        type: "error",
        title: "Gagal Menonaktifkan",
        message: res.message,
      });
    }
  };

  const handleTestNotification = async () => {
    try {
      if (typeof window === "undefined" || !("serviceWorker" in navigator))
        return;
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.ready;
      }
      if (reg && "showNotification" in reg) {
        await reg.showNotification("Tes Notifikasi ShiningSun 🔔", {
          body: "Ini adalah notifikasi uji coba PWA. Sistem notifikasi perangkat Anda aktif dan siap menerima pengingat!",
          icon: "/logo.png",
          badge: "/logo.png",
          tag: "pwa-test-notification",
        } as NotificationOptions);

        setModalConfig({
          isOpen: true,
          type: "success",
          title: "Tes Notifikasi Berhasil! 🔔",
          message:
            "Notifikasi uji coba telah dikirim. Periksa panel notifikasi perangkat/HP Anda.",
        });
      } else {
        throw new Error("Service Worker belum aktif");
      }
    } catch (err: any) {
      setModalConfig({
        isOpen: true,
        type: "error",
        title: "Gagal Mengirim Notifikasi",
        message:
          err?.message || "Tidak dapat memicu notifikasi pada perangkat ini.",
      });
    }
  };

  return (
    <>
      <div
        className={`mb-4 rounded-2xl border p-3 sm:p-3.5 backdrop-blur-md flex items-center justify-between gap-3 shadow-xs transition-all duration-300 ${
          isActive
            ? "bg-linear-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border-emerald-500/20"
            : "bg-linear-to-r from-amber-500/10 via-brand-500/10 to-indigo-500/10 border-amber-500/20"
        }`}
      >
        {/* Left: Icon + Title + Badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`p-1.5 rounded-lg shrink-0 ${
              isActive
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
            }`}
          >
            {isActive ? (
              <Icons.check className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <Icons.bell className="w-4 h-4" />
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white whitespace-nowrap">
              Notifikasi Pagi
            </span>
            <span
              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                isActive
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
              }`}
            >
              {isActive ? "● AKTIF" : "○ NONAKTIF"}
            </span>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
          {isActive ? (
            <>
              <button
                type="button"
                onClick={handleTestNotification}
                disabled={isLoading}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Icons.bell className="w-3 h-3" />
                <span>Tes Notif</span>
              </button>
              <button
                type="button"
                onClick={handleUnsubscribe}
                disabled={isLoading}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-red-500 hover:text-white text-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-red-600 dark:hover:text-white text-[11px] sm:text-xs font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Icons.close className="w-3 h-3" />
                )}
                <span>{isLoading ? "..." : "Nonaktifkan"}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-[11px] sm:text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Icons.bell className="w-3 h-3" />
              )}
              <span>{isLoading ? "..." : "Aktifkan"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Modern Responsive Custom Modal */}
      <NotificationStatusModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
      />
    </>
  );
}
