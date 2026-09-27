"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  getModuleLockPasswords,
  updateModuleLockPassword,
} from "@/lib/actions";

// Satu aksen untuk semua jalan pintas (sistem login: brand-600).
// Ikon dibedakan dari bentuk glyph, bukan warna pelangi.
const quickActionTone = {
  color: "text-brand-600 dark:text-brand-400",
  bg: "bg-brand-50 dark:bg-brand-500/15",
  borderHover: "hover:border-brand-200 dark:hover:border-brand-800/60",
};

const quickActions = [
  {
    name: "Jadwal Kelas",
    description: "Atur jadwal dan sesi pertemuan",
    href: "/schedule",
    icon: Icons.calendar,
    ...quickActionTone,
  },
  {
    name: "Penjadwalan Siswa",
    description: "Plotting kelas dan jadwal siswa",
    href: "/scheduling",
    icon: Icons.users,
    ...quickActionTone,
  },
  {
    name: "Kelola Siswa",
    description: "Kelola data dan status siswa",
    href: "/students",
    icon: Icons.users,
    ...quickActionTone,
  },
  {
    name: "Laporan Perkembangan",
    description: "Catatan dan hasil belajar siswa",
    href: "/worksheets",
    icon: Icons.edit,
    ...quickActionTone,
  },
  {
    name: "Poin Kehadiran",
    description: "Leaderboard dan katalog hadiah",
    href: "/points",
    icon: Icons.star,
    ...quickActionTone,
  },
  {
    name: "Kelola Guru",
    description: "Kelola data guru dan pengajar",
    href: "/teachers",
    icon: Icons.userCheck,
    ...quickActionTone,
  },
  {
    name: "Template Penilaian",
    description: "Atur template evaluasi",
    href: "/templates",
    icon: Icons.fileText,
    ...quickActionTone,
  },
  {
    name: "Master Data",
    description: "Kelola cabang, kelas, label",
    href: "/master",
    icon: Icons.settings,
    ...quickActionTone,
  },
];

const lockedRoutes: Record<string, { label: string; sessionKey: string }> = {};

interface QuickAccessLinksProps {
  isSuperadmin?: boolean;
  // Password modul dialirkan dari server (terdedup via cache) — nilai &
  // perilaku sama, tanpa fetch ulang tiap pindah halaman.
  initialLockPasswords?: Record<string, string>;
}

const DEFAULT_LOCK_PASSWORDS: Record<string, string> = { "/points": "123" };

export function QuickAccessLinks({
  isSuperadmin = false,
  initialLockPasswords,
}: QuickAccessLinksProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Development Lock Protection Modal State
  const [showDevLockModal, setShowDevLockModal] = useState(false);
  const [devLockTarget, setDevLockTarget] = useState<string | null>(null);
  const [devLockPassword, setDevLockPassword] = useState("");
  const [devLockError, setDevLockError] = useState("");
  const devLockPassInputRef = useRef<HTMLInputElement>(null);

  const [lockPasswords, setLockPasswords] = useState<Record<string, string>>(
    initialLockPasswords ?? DEFAULT_LOCK_PASSWORDS,
  );

  // Super Admin Password Management Modal State
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

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  // Nilai awal dari server via props — sinkron ulang bila props berubah
  // (tanpa roundtrip jaringan). Fetch segar tetap dipakai saat unlock.
  useEffect(() => {
    if (initialLockPasswords) {
      setLockPasswords(initialLockPasswords);
      setSuperAdminPasswords(initialLockPasswords);
    }
  }, [initialLockPasswords]);

  const allActions = [
    ...quickActions,
    ...(isSuperadmin
      ? [
          {
            name: "Password Tambah Point",
            description: "Atur PIN modul terkunci",
            href: "#superadmin-lock-settings",
            icon: Icons.shield,
            ...quickActionTone,
            isSuperAdminOnly: true,
          },
        ]
      : []),
  ];

  const handleActionClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    action: any,
  ) => {
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
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 space-y-2.5"
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
                        aria-label={isShowPass ? "Sembunyikan password" : "Lihat password"}
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
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 active:translate-y-[1px] transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
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
            className={`relative flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm transition-colors hover:shadow-md active:translate-y-[1px] ${action.borderHover} group cursor-pointer`}
          >
            <div
              className={`shrink-0 rounded-xl p-3 ${action.bg}`}
            >
              <action.icon
                className={`h-5 w-5 ${action.color}`}
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                {action.name}
              </h4>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400 truncate">
                {action.description}
              </p>
            </div>
          </a>
        ))}
      </div>
    </>
  );
}
