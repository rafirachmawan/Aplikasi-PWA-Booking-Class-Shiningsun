"use client";

import { useState, useRef } from "react";
import { Icons } from "@/components/ui/icons";
import { resetAllDatabaseData } from "@/lib/actions";
import { usePWAUpdate } from "@/hooks/usePWAUpdate";

interface ResetDataSectionProps {
  isSuperadmin?: boolean;
}

export function ResetDataSection({ isSuperadmin = false }: ResetDataSectionProps) {
  const [resetModal, setResetModal] = useState<'closed' | 'confirm' | 'password' | 'success' | 'error'>('closed');
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  
  const { updateAvailable, isUpdating, applyUpdate } = usePWAUpdate();

  const openResetModal = () => {
    setResetModal('confirm');
    setResetPassword("");
    setResetError("");
  };

  const closeResetModal = () => {
    setResetModal('closed');
    setResetPassword("");
    setResetError("");
  };

  const handleConfirmStep = () => {
    setResetModal('password');
    setTimeout(() => passwordInputRef.current?.focus(), 100);
  };

  const handlePasswordSubmit = async () => {
    if (resetPassword !== "123") {
      setResetError("Password salah! Silakan coba lagi.");
      return;
    }

    setIsResetting(true);
    setResetModal('closed');
    try {
      await resetAllDatabaseData();
      setResetModal('success');
    } catch (error: any) {
      setResetError(error.message);
      setResetModal('error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSuccessDismiss = () => {
    closeResetModal();
    window.location.href = "/dashboard";
  };

  return (
    <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
      {/* Bersihkan Cache & Perbarui Versi Card */}
      <div className="rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 shadow-xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5.5 h-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6"/>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
              <path d="M3 22v-6h6"/>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Bersihkan Cache & Perbarui Versi</span>
              {updateAvailable && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 animate-pulse">
                  UPDATE TERSEDIA
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Perbarui tampilan aplikasi ke versi terbaru dan bersihkan cache browser jika terjadi masalah tampilan.
            </p>
          </div>
        </div>

        {updateAvailable ? (
          <button
            type="button"
            onClick={applyUpdate}
            disabled={isUpdating}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 active:scale-95 transition-all shadow-sm shrink-0 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6"/>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
              <path d="M3 22v-6h6"/>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
            </svg>
            <span>{isUpdating ? "Memperbarui..." : "Update Versi Baru"}</span>
          </button>
        ) : (
          <a
            href="/api/clear-cache"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 active:scale-95 transition-all shadow-2xs shrink-0 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6"/>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
              <path d="M3 22v-6h6"/>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
            </svg>
            <span>Bersihkan Cache & Perbarui Versi</span>
          </a>
        )}
      </div>

      {/* Danger Zone: Reset Semua Data (Superadmin Only) */}
      {isSuperadmin && (
        <div className="rounded-3xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 shadow-xs">
              <Icons.trash className="w-5.5 h-5.5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Reset Semua Data Sistem</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300">
                  KHUSUS SUPERADMIN
                </span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tindakan ini akan menghapus booking, jadwal, data siswa, ruangan, dan label di seluruh cabang secara permanen.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openResetModal}
            disabled={isResetting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-sm shrink-0 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Icons.trash className="w-4 h-4" />
            <span>Reset Semua Data</span>
          </button>
        </div>
      )}

      {/* Reset Modal Overlay */}
      {resetModal !== 'closed' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={resetModal !== 'success' && resetModal !== 'error' ? closeResetModal : undefined}
          />

          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Confirm Step */}
            {resetModal === 'confirm' && (
              <div className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <Icons.trash className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">
                  Reset Semua Data?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2 leading-relaxed">
                  Tindakan ini akan menghapus <strong className="text-slate-700 dark:text-slate-300">semua data</strong> (booking, jadwal, siswa, ruangan, dan label) di seluruh cabang secara permanen.
                </p>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={closeResetModal}
                    className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmStep}
                    className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    Ya, Lanjutkan
                  </button>
                </div>
              </div>
            )}

            {/* Password Step */}
            {resetModal === 'password' && (
              <div className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-amber-600 dark:text-amber-400"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">
                  Konfirmasi Password
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
                  Masukkan password untuk mengkonfirmasi reset data.
                </p>
                <div className="mt-4">
                  <input
                    ref={passwordInputRef}
                    type="password"
                    value={resetPassword}
                    onChange={(e) => { setResetPassword(e.target.value); setResetError(""); }}
                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                    placeholder="Masukkan password..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono"
                  />
                  {resetError && (
                    <p className="text-xs text-red-500 mt-2 text-center font-medium">{resetError}</p>
                  )}
                </div>
                <div className="flex gap-3 mt-5">
                  <button
                    type="button"
                    onClick={closeResetModal}
                    className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handlePasswordSubmit}
                    className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    Reset Data
                  </button>
                </div>
              </div>
            )}

            {/* Success Step */}
            {resetModal === 'success' && (
              <div className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-green-600 dark:text-green-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">
                  Berhasil!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
                  Seluruh data telah berhasil direset. Anda akan dialihkan ke Dashboard.
                </p>
                <button
                  type="button"
                  onClick={handleSuccessDismiss}
                  className="w-full mt-5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors"
                >
                  Ke Dashboard
                </button>
              </div>
            )}

            {/* Error Step */}
            {resetModal === 'error' && (
              <div className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <Icons.close className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">
                  Gagal Mereset Data
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2">
                  {resetError || "Terjadi kesalahan saat mereset data."}
                </p>
                <button
                  type="button"
                  onClick={closeResetModal}
                  className="w-full mt-5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
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
