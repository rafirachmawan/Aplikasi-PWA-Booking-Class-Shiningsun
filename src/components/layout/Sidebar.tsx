"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Icons } from "../ui/icons";
import { useSidebar } from "@/lib/SidebarContext";
import { useEffect, useState, useRef } from "react";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { getModuleLockPasswords, updateModuleLockPassword } from "@/lib/actions";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Icons.home },
  { name: "Jadwal Kelas", href: "/schedule", icon: Icons.calendar },
  { name: "Penjadwalan Siswa", href: "/scheduling", icon: Icons.users },
  { name: "Kelola Siswa", href: "/students", icon: Icons.users },
  { name: "Laporan Perkembangan", href: "/worksheets", icon: Icons.edit },
  { name: "Poin Kehadiran", href: "/points", icon: Icons.star },
  { name: "Kelola Guru", href: "/teachers", icon: Icons.userCheck },
  { name: "Template Penilaian", href: "/templates", icon: Icons.fileText },
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

  // Development Lock Modal State (for routes still in development)
  const lockedRoutes: Record<string, { label: string; sessionKey: string }> = {};
  const [showDevLockModal, setShowDevLockModal] = useState(false);
  const [devLockTarget, setDevLockTarget] = useState<string | null>(null);
  const [devLockPassword, setDevLockPassword] = useState("");
  const [devLockError, setDevLockError] = useState("");
  const devLockPassInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Module Lock Passwords state
  const [lockPasswords, setLockPasswords] = useState<Record<string, string>>({
    "/points": "123",
  });

  // Super Admin Password Management Modal
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [superAdminPasswords, setSuperAdminPasswords] = useState<Record<string, string>>({
    "/points": "123",
  });
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [superAdminSuccessMsg, setSuperAdminSuccessMsg] = useState("");
  const [superAdminErrorMsg, setSuperAdminErrorMsg] = useState("");
  const [isSavingAll, setIsSavingAll] = useState(false);

  const handleSaveAllPasswords = async () => {
    setSuperAdminSuccessMsg("");
    setSuperAdminErrorMsg("");
    setIsSavingAll(true);
    try {
      const routesToSave = ["/points"];
      const updatedPasswords: Record<string, string> = { ...lockPasswords };

      for (const route of routesToSave) {
        const val = superAdminPasswords[route] ?? lockPasswords[route] ?? "123";
        await updateModuleLockPassword(route, val);
        updatedPasswords[route] = val;
        if (typeof window !== "undefined" && lockedRoutes[route]) {
          sessionStorage.removeItem(lockedRoutes[route].sessionKey);
        }
      }

      setLockPasswords(updatedPasswords);
      setSuperAdminPasswords(updatedPasswords);
      setSuperAdminSuccessMsg("Semua password modul berhasil disimpan dan sesi akses di-reset!");
    } catch (err: any) {
      setSuperAdminErrorMsg(err?.message || "Gagal menyimpan password.");
    } finally {
      setIsSavingAll(false);
    }
  };

  useEffect(() => {
    getModuleLockPasswords().then((passwords) => {
      if (passwords) {
        setLockPasswords(passwords);
        setSuperAdminPasswords(passwords);
      }
    });
  }, []);

  // Nav click protection for locked (in-development) routes
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const lockInfo = lockedRoutes[href];
    if (lockInfo) {
      if (lockPasswords[href] === "") return;
      const isUnlocked = typeof window !== "undefined" && sessionStorage.getItem(lockInfo.sessionKey) === "true";
      if (!isUnlocked) {
        e.preventDefault();
        setDevLockTarget(href);
        setShowDevLockModal(true);
        setDevLockPassword("");
        setDevLockError("");
        setTimeout(() => devLockPassInputRef.current?.focus(), 100);
        return;
      }
    }
  };

  const handleUnlockDevRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devLockTarget) return;
    const lockInfo = lockedRoutes[devLockTarget];
    if (!lockInfo) return;

    try {
      const passwords = await getModuleLockPasswords();
      const expectedPassword = passwords[devLockTarget] ?? "123";
      if (devLockPassword === expectedPassword) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(lockInfo.sessionKey, "true");
        }
        setShowDevLockModal(false);
        window.location.href = devLockTarget;
      } else {
        setDevLockError("Password salah! Silakan periksa kembali atau hubungi SuperAdmin.");
      }
    } catch {
      const fallbackPassword = lockPasswords[devLockTarget] ?? "123";
      if (devLockPassword === fallbackPassword) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(lockInfo.sessionKey, "true");
        }
        setShowDevLockModal(false);
        window.location.href = devLockTarget;
      } else {
        setDevLockError("Password salah! Silakan periksa kembali atau hubungi SuperAdmin.");
      }
    }
  };

  return (
    <>
      {isNavigating && <LoadingSpinner usePortal={true} />}

      {/* Development Lock Protection Modal */}
      {showDevLockModal && devLockTarget && lockedRoutes[devLockTarget] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowDevLockModal(false)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">
              🔒
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Akses {lockedRoutes[devLockTarget].label} Dikunci
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Fitur ini masih dalam tahap pengembangan. Masukkan password untuk membuka akses modul ini.
            </p>

            <form onSubmit={handleUnlockDevRoute} className="mt-5 space-y-4">
              <div>
                <input
                  ref={devLockPassInputRef}
                  type="password"
                  required
                  value={devLockPassword}
                  onChange={(e) => {
                    setDevLockPassword(e.target.value);
                    setDevLockError("");
                  }}
                  placeholder="Masukkan password..."
                  className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent font-medium"
                />
                {devLockError && (
                  <p className="text-xs text-red-500 font-semibold mt-2 animate-in fade-in">{devLockError}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDevLockModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm"
                >
                  Buka Akses
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Module Lock Settings Modal */}
      {showSuperAdminModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isSavingAll && setShowSuperAdminModal(false)}
          />
          <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shadow-xs">
                  🛡️
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Khusus Super Admin
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Atur Password Akses Modul Terkunci
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSuperAdminModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {superAdminSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-600 dark:text-emerald-300 animate-in fade-in">
                ✅ {superAdminSuccessMsg}
              </div>
            )}

            {superAdminErrorMsg && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs font-bold text-red-600 dark:text-red-300 animate-in fade-in">
                ⚠️ {superAdminErrorMsg}
              </div>
            )}

            <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              {[
                { route: "/points", name: "Fitur Tambah Poin", icon: "⭐", desc: "Password akses untuk tombol Tambah Poin Manual" },
              ].map((item) => {
                const currentVal = superAdminPasswords[item.route] ?? lockPasswords[item.route] ?? "123";
                const isShowPass = !!showPasswordMap[item.route];

                return (
                  <div
                    key={item.route}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base sm:text-lg">{item.icon}</span>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {item.name}
                          </h4>
                          <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {item.route}
                      </span>
                    </div>

                    <div className="relative w-full">
                      <input
                        type={isShowPass ? "text" : "password"}
                        value={currentVal}
                        onChange={(e) =>
                          setSuperAdminPasswords({
                            ...superAdminPasswords,
                            [item.route]: e.target.value,
                          })
                        }
                        className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 pr-16"
                        placeholder="Kosongkan jika tidak ingin dikunci..."
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswordMap({
                            ...showPasswordMap,
                            [item.route]: !isShowPass,
                          })
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {isShowPass ? "Sembunyikan" : "Lihat"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSuperAdminModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSavingAll}
                onClick={handleSaveAllPasswords}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingAll ? "Menyimpan..." : "Simpan Semua Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile backdrop - opens natively via CSS checkbox or JS state */}
      <label 
        htmlFor="sidebar-drawer-toggle"
        className={`fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm lg:hidden transition-opacity cursor-pointer ${
          isOpen ? "block" : "hidden peer-checked/sidebar:block"
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Sidebar Content */}
      <div className={`
        fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:shadow-sm lg:pointer-events-auto lg:visible
        ${isOpen ? "translate-x-0 pointer-events-auto visible" : "-translate-x-full pointer-events-none invisible peer-checked/sidebar:translate-x-0 peer-checked/sidebar:pointer-events-auto peer-checked/sidebar:visible"}
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
          {/* Close button for mobile - native HTML label */}
          <label 
            htmlFor="sidebar-drawer-toggle"
            className="lg:hidden text-slate-400 hover:text-slate-500 cursor-pointer p-1" 
            onClick={close}
          >
            <span className="sr-only">Tutup sidebar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </label>
        </div>
        
        <nav className="flex flex-1 flex-col p-4 space-y-1 overflow-y-auto">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block px-3 mt-2">Menu</label>
          {[...navigation, ...(role === 'SUPERADMIN' ? [{ name: "Kelola Akun", href: "/accounts", icon: Icons.settings }] : [])].map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className={`
                  group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 cursor-pointer
                  ${
                    isActive
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 font-bold"
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
                <span className="flex-1">{item.name}</span>
                {lockedRoutes[item.href] && (lockPasswords[item.href] ?? "123") !== "" && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300/40">
                    🔒
                  </span>
                )}
              </a>
            );
          })}

          {/* Khusus Super Admin Section */}
          {role === 'SUPERADMIN' && (
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <label className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 block px-3 flex items-center gap-1.5">
                <span>🛡️</span> Khusus Super Admin
              </label>

              <button
                type="button"
                onClick={() => {
                  setSuperAdminSuccessMsg("");
                  setSuperAdminErrorMsg("");
                  setShowSuperAdminModal(true);
                }}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-bold text-amber-800 bg-amber-50/90 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-800/60 transition-all duration-200 cursor-pointer shadow-2xs"
              >
                <Icons.settings className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="flex-1 text-left truncate">Password Akses Modul</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100 shrink-0">
                  🔑 PIN
                </span>
              </button>
            </div>
          )}
        </nav>
      
        {/* Bottom Section */}
        <div className="mt-auto">

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
