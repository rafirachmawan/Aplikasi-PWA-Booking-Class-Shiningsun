"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Icons } from "@/components/ui/icons";
import { resetAllDatabaseData } from "@/lib/actions";
import { usePWAUpdate } from "@/hooks/usePWAUpdate";

interface ResetDataSectionProps {
  isSuperadmin?: boolean;
  showCache?: boolean;
  showReset?: boolean;
}

export function ResetDataSection({
  isSuperadmin = false,
  showCache = true,
  showReset = true,
}: ResetDataSectionProps) {
  const [resetModal, setResetModal] = useState<
    "closed" | "confirm" | "password" | "success" | "error"
  >("closed");
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const { updateAvailable, isUpdating, applyUpdate } = usePWAUpdate();

  const openResetModal = () => {
    setResetModal("confirm");
    setResetPassword("");
    setResetError("");
  };

  const closeResetModal = () => {
    setResetModal("closed");
    setResetPassword("");
    setResetError("");
  };

  const handleConfirmStep = () => {
    setResetModal("password");
    setTimeout(() => passwordInputRef.current?.focus(), 100);
  };

  const handlePasswordSubmit = async () => {
    if (isResetting) return;
    if (resetPassword !== "123") {
      setResetError("Password salah! Silakan coba lagi.");
      return;
    }

    setIsResetting(true);
    setResetModal("closed");
    try {
      await resetAllDatabaseData();
      setResetModal("success");
    } catch (error: any) {
      setResetError(error.message);
      setResetModal("error");
    } finally {
      setIsResetting(false);
    }
  };

  const handleSuccessDismiss = () => {
    closeResetModal();
    // Data baru saja dihapus massal: refresh agar server baca ulang,
    // lalu ke dashboard (tujuan sama, tanpa full reload).
    router.refresh();
    router.push("/dashboard");
  };

  return (
    <div className="mt-10 pt-6 border-t border-slate-200 dark:border-zinc-800 space-y-4">
      {/* Terlihat selama hapus massal berjalan (modal sudah tertutup) */}
      {isResetting && <LoadingSpinner usePortal={true} />}
      {/* Bersihkan Cache & Perbarui Versi Card */}
      {showCache && (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>Bersihkan Cache dan Perbarui Versi</span>
                {updateAvailable && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 animate-pulse whitespace-nowrap">
                    UPDATE TERSEDIA
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Perbarui tampilan aplikasi ke versi terbaru dan bersihkan cache
                browser jika terjadi masalah tampilan.
              </p>
            </div>
          </div>

          {updateAvailable ? (
            <button
              type="button"
              onClick={applyUpdate}
              disabled={isUpdating}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 active:translate-y-[1px] transition-colors shrink-0 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
              <span>{isUpdating ? "Memperbarui..." : "Update Versi Baru"}</span>
            </button>
          ) : (
            <a
              href="/api/clear-cache"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-300 dark:border-zinc-700 active:translate-y-[1px] transition-colors shrink-0 flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 text-brand-600 dark:text-brand-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
              <span>Bersihkan Cache dan Perbarui Versi</span>
            </a>
          )}
        </div>
      )}

      {/* Danger Zone: Reset Semua Data (Superadmin Only) */}
      {showReset && isSuperadmin && (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-800/50 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <Icons.trash className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>Reset Semua Data Sistem</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300 whitespace-nowrap">
                  KHUSUS SUPERADMIN
                </span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Tindakan ini akan menghapus booking, jadwal, data siswa,
                ruangan, dan label di seluruh cabang secara permanen.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openResetModal}
            disabled={isResetting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:translate-y-[1px] transition-colors shrink-0 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Icons.trash className="w-4 h-4" />
            <span>Reset Semua Data</span>
          </button>
        </div>
      )}

      {/* Reset Modal Overlay */}
      {resetModal !== "closed" && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={
              resetModal !== "success" && resetModal !== "error"
                ? closeResetModal
                : undefined
            }
          />

          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
            {/* Confirm Step */}
            {resetModal === "confirm" && (
              <div className="p-6">
                <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/15 flex items-center justify-center mx-auto mb-4">
                  <Icons.trash className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">
                  Reset Semua Data?
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 text-center mt-2 leading-relaxed">
                  Tindakan ini akan menghapus{" "}
                  <strong className="text-slate-700 dark:text-zinc-200">
                    semua data
                  </strong>{" "}
                  (booking, jadwal, siswa, ruangan, dan label) di seluruh cabang
                  secara permanen.
                </p>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={closeResetModal}
                    className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmStep}
                    className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:translate-y-[1px] transition-colors cursor-pointer"
                  >
                    Ya, Lanjutkan
                  </button>
                </div>
              </div>
            )}

            {/* Password Step */}
            {resetModal === "password" && (
              <div className="p-6">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-300 flex items-center justify-center mx-auto mb-4">
                  <Icons.shield className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">
                  Konfirmasi Password
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 text-center mt-2">
                  Masukkan password untuk mengkonfirmasi reset data.
                </p>
                <div className="mt-4">
                  <input
                    ref={passwordInputRef}
                    type="password"
                    value={resetPassword}
                    onChange={(e) => {
                      setResetPassword(e.target.value);
                      setResetError("");
                    }}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handlePasswordSubmit()
                    }
                    placeholder="Masukkan password..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono"
                  />
                  {resetError && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-2 text-center font-medium">
                      {resetError}
                    </p>
                  )}
                </div>
                <div className="flex gap-3 mt-5">
                  <button
                    type="button"
                    onClick={closeResetModal}
                    className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handlePasswordSubmit}
                    className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:translate-y-[1px] transition-colors cursor-pointer"
                  >
                    Reset Data
                  </button>
                </div>
              </div>
            )}

            {/* Success Step */}
            {resetModal === "success" && (
              <div className="p-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                  <Icons.check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">
                  Berhasil!
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 text-center mt-2">
                  Seluruh data telah berhasil direset. Anda akan dialihkan ke
                  Dashboard.
                </p>
                <button
                  type="button"
                  onClick={handleSuccessDismiss}
                  className="w-full mt-5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 active:translate-y-[1px] transition-colors cursor-pointer"
                >
                  Ke Dashboard
                </button>
              </div>
            )}

            {/* Error Step */}
            {resetModal === "error" && (
              <div className="p-6">
                <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/15 flex items-center justify-center mx-auto mb-4">
                  <Icons.close className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">
                  Gagal Mereset Data
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 text-center mt-2">
                  {resetError || "Terjadi kesalahan saat mereset data."}
                </p>
                <button
                  type="button"
                  onClick={closeResetModal}
                  className="w-full mt-5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
