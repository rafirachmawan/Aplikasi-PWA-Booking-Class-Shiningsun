"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { getModuleLockPasswords, updateModuleLockPassword } from "@/lib/actions";

const quickActions = [
  {
    name: 'Jadwal Kelas',
    description: 'Atur jadwal dan sesi pertemuan',
    href: '/schedule',
    icon: Icons.calendar,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    borderHover: 'hover:border-emerald-200 dark:hover:border-emerald-800',
  },
  {
    name: 'Penjadwalan Siswa',
    description: 'Plotting kelas & jadwal siswa',
    href: '/scheduling',
    icon: Icons.users,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    borderHover: 'hover:border-indigo-200 dark:hover:border-indigo-800',
  },
  {
    name: 'Kelola Siswa',
    description: 'Kelola data dan status siswa',
    href: '/students',
    icon: Icons.users,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    borderHover: 'hover:border-blue-200 dark:hover:border-blue-800',
  },
  {
    name: 'Laporan Perkembangan',
    description: 'Catatan & hasil belajar siswa',
    href: '/worksheets',
    icon: Icons.edit,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    borderHover: 'hover:border-amber-200 dark:hover:border-amber-800',
  },
  {
    name: 'Poin Kehadiran',
    description: 'Leaderboard & katalog tukar hadiah',
    href: '/points',
    icon: Icons.star,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    borderHover: 'hover:border-orange-200 dark:hover:border-orange-800',
  },
  {
    name: 'Kelola Guru',
    description: 'Kelola data guru & pengajar',
    href: '/teachers',
    icon: Icons.userCheck,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-500/10',
    borderHover: 'hover:border-teal-200 dark:hover:border-teal-800',
  },
  {
    name: 'Template Penilaian',
    description: 'Atur template evaluasi & catatan',
    href: '/templates',
    icon: Icons.fileText,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    borderHover: 'hover:border-rose-200 dark:hover:border-rose-800',
  },
  {
    name: 'Master Data',
    description: 'Kelola cabang, kelas, & label',
    href: '/master',
    icon: Icons.settings,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    borderHover: 'hover:border-purple-200 dark:hover:border-purple-800',
  },
];

const lockedRoutes: Record<string, { label: string; sessionKey: string }> = {};

interface QuickAccessLinksProps {
  isSuperadmin?: boolean;
}

export function QuickAccessLinks({ isSuperadmin = false }: QuickAccessLinksProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();

  // Development Lock Protection Modal State
  const [showDevLockModal, setShowDevLockModal] = useState(false);
  const [devLockTarget, setDevLockTarget] = useState<string | null>(null);
  const [devLockPassword, setDevLockPassword] = useState("");
  const [devLockError, setDevLockError] = useState("");
  const devLockPassInputRef = useRef<HTMLInputElement>(null);

  const [lockPasswords, setLockPasswords] = useState<Record<string, string>>({
    "/points": "123",
  });

  // Super Admin Password Management Modal State
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
    setIsNavigating(false);
    getModuleLockPasswords().then((passwords) => {
      if (passwords) {
        setLockPasswords(passwords);
        setSuperAdminPasswords(passwords);
      }
    });
  }, [pathname]);

  const allActions = [
    ...quickActions,
    ...(isSuperadmin
      ? [
          {
            name: "Password Akses Modul",
            description: "Atur PIN/password modul terkunci",
            href: "#superadmin-lock-settings",
            icon: Icons.shield,
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-500/10",
            borderHover: "hover:border-amber-300 dark:hover:border-amber-700",
            isSuperAdminOnly: true,
          },
        ]
      : []),
  ];

  const handleActionClick = (e: React.MouseEvent<HTMLAnchorElement>, action: any) => {
    if (action.isSuperAdminOnly) {
      e.preventDefault();
      setSuperAdminSuccessMsg("");
      setSuperAdminErrorMsg("");
      setShowSuperAdminModal(true);
      return;
    }

    const href = action.href;
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

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {allActions.map((action) => (
          <a
            key={action.name}
            href={action.href}
            onClick={(e) => handleActionClick(e, action)}
            className={`relative flex items-center space-x-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:scale-98 ${action.borderHover} group cursor-pointer`}
          >
            <div className={`flex-shrink-0 rounded-xl p-3 ${action.bg} transition-transform duration-300 group-hover:scale-110 shadow-xs`}>
              <action.icon className={`h-5 w-5 ${action.color}`} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                {action.name}
              </h4>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                {action.description}
              </p>
            </div>
          </a>
        ))}
      </div>
    </>
  );
}
