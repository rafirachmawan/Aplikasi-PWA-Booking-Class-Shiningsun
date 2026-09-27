"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { Icons } from "../ui/icons";
import { useSidebar } from "@/lib/SidebarContext";
import { useEffect, useState, useRef } from "react";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import {
  getModuleLockPasswords,
  updateModuleLockPassword,
} from "@/lib/actions";

// Menu dikelompokkan agar mudah dipindai: Utama, Operasional, Pengaturan.
// Urutan, href, dan ikon sama seperti sebelumnya. Hanya pengelompokan visual.
const navGroups = [
  {
    label: "Utama",
    items: [{ name: "Dashboard", href: "/dashboard", icon: Icons.home }],
  },
  {
    label: "Operasional",
    items: [
      { name: "Jadwal Kelas", href: "/schedule", icon: Icons.calendar },
      { name: "Penjadwalan Siswa", href: "/scheduling", icon: Icons.users },
      { name: "Kelola Siswa", href: "/students", icon: Icons.users },
      { name: "Laporan Perkembangan", href: "/worksheets", icon: Icons.edit },
      { name: "Poin Kehadiran", href: "/points", icon: Icons.star },
      { name: "Kelola Guru", href: "/teachers", icon: Icons.userCheck },
    ],
  },
  {
    label: "Pengaturan",
    items: [
      { name: "Template Penilaian", href: "/templates", icon: Icons.fileText },
      { name: "Master Data", href: "/master", icon: Icons.settings },
    ],
  },
];

// Special routes for superadmin only
const superAdminMenus = [
  {
    name: "Template Ulang Tahun",
    href: "/birthday-templates",
    icon: Icons.fileText,
  },
];

interface SidebarProps {
  userName?: string;
  branchName?: string;
  role?: string | null;
  // Password modul diambil sekali di layout (server, terdedup via cache)
  // lalu dialirkan ke sini — nilai & perilaku sama, tanpa fetch ulang.
  initialLockPasswords?: Record<string, string>;
}

const DEFAULT_LOCK_PASSWORDS: Record<string, string> = { "/points": "123" };

export function Sidebar({
  userName = "Admin",
  branchName = "Tidak Diketahui",
  role = null,
  initialLockPasswords,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen, close } = useSidebar();
  const [isNavigating, setIsNavigating] = useState(false);

  // Development Lock Modal State (for routes still in development)
  const lockedRoutes: Record<string, { label: string; sessionKey: string }> =
    {};
  const [showDevLockModal, setShowDevLockModal] = useState(false);
  const [devLockTarget, setDevLockTarget] = useState<string | null>(null);
  const [devLockPassword, setDevLockPassword] = useState("");
  const [devLockError, setDevLockError] = useState("");
  const devLockPassInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Module Lock Passwords state (nilai awal dari server via props)
  const [lockPasswords, setLockPasswords] = useState<Record<string, string>>(
    initialLockPasswords ?? DEFAULT_LOCK_PASSWORDS,
  );

  // Super Admin Password Management Modal
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [superAdminPasswords, setSuperAdminPasswords] = useState<
    Record<string, string>
  >(initialLockPasswords ?? DEFAULT_LOCK_PASSWORDS);
  const [showPasswordMap, setShowPasswordMap] = useState<
    Record<string, boolean>
  >({});
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
      setSuperAdminSuccessMsg(
        "Password akses tambah point berhasil di perbarui",
      );
    } catch (err: any) {
      setSuperAdminErrorMsg(err?.message || "Gagal menyimpan password.");
    } finally {
      setIsSavingAll(false);
    }
  };

  // Nilai awal sudah dialirkan dari layout — tidak perlu fetch ulang di sini.
  // Fetch segar tetap dipakai saat unlock (handleUnlockDevRoute) & simpan.
  useEffect(() => {
    if (initialLockPasswords) {
      setLockPasswords(initialLockPasswords);
      setSuperAdminPasswords(initialLockPasswords);
    }
  }, [initialLockPasswords]);

  // Nav click protection for locked (in-development) routes
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    const lockInfo = lockedRoutes[href];
    if (lockInfo) {
      if (lockPasswords[href] === "") return;
      const isUnlocked =
        typeof window !== "undefined" &&
        sessionStorage.getItem(lockInfo.sessionKey) === "true";
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
        // Navigasi client-side ke tujuan yang sama (tanpa full reload).
        router.push(devLockTarget);
      } else {
        setDevLockError(
          "Password salah! Silakan periksa kembali atau hubungi SuperAdmin.",
        );
      }
    } catch {
      const fallbackPassword = lockPasswords[devLockTarget] ?? "123";
      if (devLockPassword === fallbackPassword) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(lockInfo.sessionKey, "true");
        }
        setShowDevLockModal(false);
        router.push(devLockTarget);
      } else {
        setDevLockError(
          "Password salah! Silakan periksa kembali atau hubungi SuperAdmin.",
        );
      }
    }
  };

  return (
    <>
      {isNavigating && <LoadingSpinner usePortal={true} />}

      {/* Development Lock Protection Modal */}
      {showDevLockModal && devLockTarget && lockedRoutes[devLockTarget] && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowDevLockModal(false)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-300 flex items-center justify-center mx-auto mb-4">
              <Icons.shield className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Akses {lockedRoutes[devLockTarget].label} Dikunci
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Fitur ini masih dalam tahap pengembangan. Masukkan password untuk
              membuka akses modul ini.
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
                  <p className="text-xs text-red-500 font-semibold mt-2 animate-in fade-in">
                    {devLockError}
                  </p>
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
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isSavingAll && setShowSuperAdminModal(false)}
          />
          <div className="relative z-10 w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-zinc-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                  <Icons.shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Khusus Super Admin
                  </h3>
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
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800/50 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                {superAdminSuccessMsg}
              </div>
            )}

            {superAdminErrorMsg && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800/50 text-xs font-semibold text-red-700 dark:text-red-300">
                {superAdminErrorMsg}
              </div>
            )}

            <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              {[
                {
                  route: "/points",
                  name: "Fitur Tambah Poin",
                  desc: "Password akses untuk tombol Tambah Poin Manual",
                },
              ].map((item) => {
                const currentVal =
                  superAdminPasswords[item.route] ??
                  lockPasswords[item.route] ??
                  "123";
                const isShowPass = !!showPasswordMap[item.route];

                return (
                  <div
                    key={item.route}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/15">
                          <Icons.star className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                        </span>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {item.name}
                          </h4>
                          <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400">
                            {item.desc}
                          </p>
                        </div>
                      </div>
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
                        className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 pr-16"
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
                        title={isShowPass ? "Sembunyikan" : "Lihat"}
                        aria-label={
                          isShowPass ? "Sembunyikan password" : "Lihat password"
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {isShowPass ? (
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.02 10.02 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSuperAdminModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSavingAll}
                onClick={handleSaveAllPasswords}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 active:translate-y-[1px] transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
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
      <div
        className={`
        fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:shadow-sm lg:pointer-events-auto lg:visible
        ${isOpen ? "translate-x-0 pointer-events-auto visible" : "-translate-x-full pointer-events-none invisible peer-checked/sidebar:translate-x-0 peer-checked/sidebar:pointer-events-auto peer-checked/sidebar:visible"}
      `}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-slate-200 dark:border-zinc-800">
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
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </label>
        </div>

        <nav className="flex flex-1 flex-col p-4 overflow-y-auto">
          {navGroups.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? "mt-5" : "mt-1"}>
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      onClick={(e) => handleNavClick(e, item.href)}
                      className={`
                        group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer
                        ${
                          isActive
                            ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 font-semibold"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                        }
                      `}
                    >
                      <item.icon
                        className={`h-5 w-5 transition-colors ${
                          isActive
                            ? "text-brand-600 dark:text-brand-400"
                            : "text-slate-400 group-hover:text-slate-600 dark:text-zinc-500 dark:group-hover:text-zinc-300"
                        }`}
                      />
                      <span className="flex-1 truncate">{item.name}</span>
                      {lockedRoutes[item.href] &&
                        (lockPasswords[item.href] ?? "123") !== "" && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 shrink-0">
                            PIN
                          </span>
                        )}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Super Admin Special Menus */}
          {role === "SUPERADMIN" && (
            <div className="mt-5">
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Super Admin
              </p>
              <div className="space-y-1">
                {[
                  ...superAdminMenus,
                  {
                    name: "Kelola Akun",
                    href: "/accounts",
                    icon: Icons.settings,
                  },
                ].map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      onClick={(e) => handleNavClick(e, item.href)}
                      className={`
                        group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer
                        ${
                          isActive
                            ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 font-semibold"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                        }
                      `}
                    >
                      <item.icon
                        className={`h-5 w-5 transition-colors ${
                          isActive
                            ? "text-brand-600 dark:text-brand-400"
                            : "text-slate-400 group-hover:text-slate-600 dark:text-zinc-500 dark:group-hover:text-zinc-300"
                        }`}
                      />
                      <span className="flex-1 truncate">{item.name}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Khusus Super Admin Section */}
          {role === "SUPERADMIN" && (
            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-zinc-800 space-y-1">
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Keamanan Modul
              </p>

              <button
                type="button"
                onClick={() => {
                  setSuperAdminSuccessMsg("");
                  setSuperAdminErrorMsg("");
                  setShowSuperAdminModal(true);
                }}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700/70 border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer"
              >
                <Icons.shield className="h-4 w-4 text-brand-600 dark:text-brand-400 shrink-0" />
                <span className="flex-1 text-left truncate">
                  Password Tambah Point
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-slate-200 text-slate-600 dark:bg-zinc-700 dark:text-zinc-300 shrink-0">
                  PIN
                </span>
              </button>
            </div>
          )}
        </nav>

        {/* Bottom Section */}
        <div className="mt-auto">
          {/* User Profile Card */}
          <div className="p-4 border-t border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60">
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-200 dark:border-zinc-700 bg-white flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="User Profile"
                  width={32}
                  height={32}
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {userName}
                </span>
                <span className="text-xs text-slate-500 dark:text-zinc-400 truncate">
                  {branchName}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
