import { Icons } from "@/components/ui/icons";
import {
  getDashboardStats,
  getTodaySchedules,
  getCurrentUserRole,
  getBranches,
  getBranchId,
  getClasses,
  getActiveBranchName,
} from "@/lib/actions";
import { TodaySchedule } from "@/components/features/dashboard/TodaySchedule";
import { QuickAccessLinks } from "@/components/features/dashboard/QuickAccessLinks";
import { ResetDataSection } from "@/components/features/dashboard/ResetDataSection";
import { BranchSelector } from "@/components/features/auth/BranchSelector";
import { DashboardStatsPanel } from "@/components/features/dashboard/DashboardStatsPanel";
import { NotificationPermissionBanner } from "@/components/features/notifications/NotificationPermissionBanner";
import { formatFullIndonesianDate } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const role = await getCurrentUserRole();
  const currentBranchId = await getBranchId();
  const isSuperadmin = role === "SUPERADMIN";
  const hasBranchSelected = !!currentBranchId && currentBranchId !== "";

  let branches: { id: string; name: string }[] = [];
  if (isSuperadmin) {
    branches = await getBranches();
  }

  // Only fetch data if a branch is selected (or if not superadmin)
  let statsData = { reguler: 0, cg: 0, cgUpcoming: 0, cgPassed: 0, classes: 0 };
  let todaySlots: any[] = [];
  let classes: any[] = [];
  let activeBranchName: string | null = null;

  if (hasBranchSelected || !isSuperadmin) {
    [statsData, todaySlots, classes, activeBranchName] = await Promise.all([
      getDashboardStats(),
      getTodaySchedules(),
      getClasses(),
      getActiveBranchName(),
    ]);
  }

  const stats = [
    {
      name: "Siswa Aktif",
      value: statsData.reguler.toString(),
      iconName: "users",
      statusFilter: "REGISTERED" as const,
    },
    {
      name: "Coba Gratis",
      value: statsData.cg.toString(),
      subValue: `${statsData.cgUpcoming} belum terlewat`,
      iconName: "sun",
      statusFilter: "CG" as const,
    },
    {
      name: "Tipe Kelas",
      value: statsData.classes.toString(),
      iconName: "calendar",
      statusFilter: "CLASSES" as const,
    },
  ];

  // Get selected branch name for display
  let selectedBranchName = "";
  if (currentBranchId === "ALL") {
    selectedBranchName = "Semua Cabang";
  } else if (currentBranchId) {
    const found = branches.find((b) => b.id === currentBranchId);
    if (found) selectedBranchName = found.name;
  }

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Branch Selector Card for Superadmin */}
      {isSuperadmin && branches.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="rounded-xl p-2.5 bg-gradient-to-br from-brand-500 via-brand-600 to-indigo-600 text-white shadow-md shrink-0">
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Cabang Aktif
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {hasBranchSelected
                      ? `Data ditampilkan untuk: ${selectedBranchName}`
                      : "Pilih cabang untuk melihat data"}
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-auto shrink-0">
                <BranchSelector
                  branches={branches}
                  currentBranchId={currentBranchId}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show placeholder when no branch selected (superadmin first login) */}
      {isSuperadmin && !hasBranchSelected ? (
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 sm:p-16 flex flex-col items-center justify-center text-center">
          <div className="rounded-xl p-4 bg-white dark:bg-slate-800 shadow-sm mb-6">
            <svg
              className="h-10 w-10 text-brand-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white mb-2">
            Selamat Datang!
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-4">
            Silakan pilih cabang menggunakan dropdown di atas untuk melihat data
            dashboard.
          </p>
        </div>
      ) : (
        <>
          {/* Hero Banner */}
          <div className="rounded-2xl bg-gradient-to-br from-brand-600 via-brand-600 to-indigo-700 dark:from-brand-700 dark:via-brand-800 dark:to-indigo-950 p-6 shadow-xl border border-brand-500/30 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl"></div>

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white/95 text-xs font-semibold backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    {formatFullIndonesianDate(new Date())}
                  </div>
                  {activeBranchName && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-100 text-xs font-bold backdrop-blur-md">
                      <svg
                        className="w-3.5 h-3.5 text-amber-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Cabang: {activeBranchName}
                    </div>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight drop-shadow-sm">
                  Hallo, ShiningSun!
                  {activeBranchName && (
                    <span className="text-amber-200/90 font-semibold text-lg sm:text-2xl ml-2">
                      ({activeBranchName})
                    </span>
                  )}
                </h2>
                <p className="text-brand-100 text-sm mt-2 max-w-xl leading-relaxed opacity-95">
                  Ringkasan sistem pendaftaran dan penjadwalan. Semoga aktivitas
                  berjalan lancar.
                </p>
              </div>
            </div>

            {/* Glassmorphic Stats Cards */}
            <DashboardStatsPanel stats={stats} />
          </div>

          {/* Notification & Schedule Section */}
          <div className="space-y-6">
            <NotificationPermissionBanner />
            <TodaySchedule slots={todaySlots} classes={classes} />
          </div>

          {/* Quick Access */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
              Akses Cepat
            </h3>
            <QuickAccessLinks isSuperadmin={isSuperadmin} />
          </div>

          <ResetDataSection isSuperadmin={isSuperadmin} />
        </>
      )}
    </div>
  );
}
