"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Icons } from "../ui/icons";
import { useSidebar } from "@/lib/SidebarContext";
import { useEffect, useState, useRef } from "react";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { resetAllDatabaseData } from "@/lib/actions";
import { usePWAUpdate } from "@/hooks/usePWAUpdate";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Icons.home },
  { name: "Jadwal Kelas", href: "/schedule", icon: Icons.calendar },
  { name: "Penjadwalan Siswa", href: "/scheduling", icon: Icons.users },
  { name: "Kelola Siswa", href: "/students", icon: Icons.users },
  { name: "Master Data", href: "/master", icon: Icons.settings },
];

interface SidebarProps {
  userName?: string;
  branchName?: string;
  role?: string | null;
}

export function Sidebar({ 
  userName = "Admin", 
  branchName = "Tidak Diketahui",
  role = null,
}: SidebarProps) {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { updateAvailable, isUpdating, applyUpdate } = usePWAUpdate();

  // Modal state: 'closed' | 'confirm' | 'password' | 'success' | 'error'
  const [resetModal, setResetModal] = useState<'closed' | 'confirm' | 'password' | 'success' | 'error'>('closed');
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const passwordInputRef = useRef<HTMLInputElement>(null);

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

  // Close sidebar on route change on mobile
  useEffect(() => {
    close();
    setIsNavigating(false);
  }, [pathname, close]);

  return (
    <>
      {(isNavigating || isResetting) && <LoadingSpinner usePortal={true} />}

      {/* Reset Modal Overlay */}
      {resetModal !== 'closed' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={resetModal !== 'success' && resetModal !== 'error' ? closeResetModal : undefined}
          />

          {/* Modal Card */}
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Confirm Step */}
            {resetModal === 'confirm' && (
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <Icons.trash className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">
                  Reset Semua Data?
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2 leading-relaxed">
                  Tindakan ini akan menghapus <strong className="text-slate-700 dark:text-slate-300">semua data</strong> (booking, jadwal, siswa, ruangan, dan label) di seluruh cabang secara permanen.
                </p>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={closeResetModal}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmStep}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    Ya, Lanjutkan
                  </button>
                </div>
              </div>
            )}

            {/* Password Step */}
            {resetModal === 'password' && (
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-amber-600 dark:text-amber-400"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">
                  Konfirmasi Password
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2">
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
                    className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  {resetError && (
                    <p className="text-xs text-red-500 mt-2 text-center font-medium">{resetError}</p>
                  )}
                </div>
                <div className="flex gap-3 mt-5">
                  <button
                    type="button"
                    onClick={closeResetModal}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handlePasswordSubmit}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    Reset Data
                  </button>
                </div>
              </div>
            )}

            {/* Success Step */}
            {resetModal === 'success' && (
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-green-600 dark:text-green-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">
                  Berhasil!
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2">
                  Seluruh data telah berhasil direset. Anda akan dialihkan ke Dashboard.
                </p>
                <button
                  type="button"
                  onClick={handleSuccessDismiss}
                  className="w-full mt-5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors"
                >
                  Ke Dashboard
                </button>
              </div>
            )}

            {/* Error Step */}
            {resetModal === 'error' && (
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <Icons.close className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">
                  Gagal Mereset Data
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2">
                  {resetError || "Terjadi kesalahan saat mereset data."}
                </p>
                <button
                  type="button"
                  onClick={closeResetModal}
                  className="w-full mt-5 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Content */}
      <div className={`
        fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:shadow-sm
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center p-1 bg-white rounded-lg shadow-sm">
              <Image 
                src="/logo.png" 
                alt="ShiningSun Logo" 
                width={32} 
                height={32} 
                className="object-contain"
                priority
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Shining<span className="text-brand-500">Sun</span>
            </span>
          </div>
          {/* Close button for mobile */}
          <button 
            type="button" 
            className="lg:hidden text-slate-400 hover:text-slate-500" 
            onClick={close}
          >
            <span className="sr-only">Tutup sidebar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <nav className="flex flex-1 flex-col p-4 space-y-1 overflow-y-auto">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block px-3 mt-2">Menu</label>
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={(e) => {
                  if (pathname !== item.href) {
                    setIsNavigating(true);
                  }
                }}
                className={`
                  group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200
                  ${
                    isActive
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  }
                `}
              >
                <item.icon
                  className={`w-5 h-5 transition-colors ${
                    isActive
                      ? "text-brand-600 dark:text-brand-400"
                      : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      
        {/* Bottom Section */}
        <div className="mt-auto">
          {/* Reset Button - Only for Superadmin */}
          {role === 'SUPERADMIN' && (
            <div className="px-4 pb-2">
              <button
                type="button"
                onClick={openResetModal}
                disabled={isResetting}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/20 dark:hover:text-red-300 transition-all duration-200"
              >
                <Icons.trash className="w-4 h-4 shrink-0" />
                Reset Semua Data
              </button>
            </div>
          )}

          {/* PWA Update Button */}
          <div className="px-4 pb-2">
            {updateAvailable ? (
              <button
                type="button"
                onClick={applyUpdate}
                disabled={isUpdating}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 transition-all duration-200 shadow-sm animate-in fade-in slide-in-from-bottom-2"
              >
                {isUpdating ? (
                  <>
                    <svg className="animate-spin w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Memperbarui...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 2v6h-6"/>
                      <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                      <path d="M3 22v-6h6"/>
                      <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                    </svg>
                    Update Tersedia — Perbarui
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  const reg = await navigator.serviceWorker?.getRegistration();
                  await reg?.update();
                }}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-50 hover:text-slate-600 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-400 transition-all duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6"/>
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                  <path d="M3 22v-6h6"/>
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                </svg>
                Cek Update Aplikasi
              </button>
            )}
          </div>

          {/* User Profile Card */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 shadow-sm border border-slate-200 dark:border-slate-700 bg-white flex items-center justify-center">
                <Image 
                  src="/logo.png" 
                  alt="User Profile" 
                  width={32} 
                  height={32} 
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{userName}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{branchName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
