import { Suspense } from "react";
import {
  getDashboardStats,
  getTodaySchedules,
  getCurrentUserRole,
  getBranches,
  getBranchId,
  getClasses,
  getActiveBranchName,
  getStudentRulesDocuments,
  getCurriculumDocuments,
  getOverdueWorksheets,
  getModuleLockPasswords,
} from "@/lib/actions";
import { TodaySchedule } from "@/components/features/dashboard/TodaySchedule";
import { QuickAccessLinks } from "@/components/features/dashboard/QuickAccessLinks";
import { ResetDataSection } from "@/components/features/dashboard/ResetDataSection";
import { BranchSelector } from "@/components/features/auth/BranchSelector";
import { DashboardStatsPanel } from "@/components/features/dashboard/DashboardStatsPanel";
import { NotificationPermissionBanner } from "@/components/features/notifications/NotificationPermissionBanner";
import { StudentRulesSection } from "@/components/features/dashboard/StudentRulesSection";
import { CurriculumSection } from "@/components/features/dashboard/CurriculumSection";
import { BirthdayListCollapsible } from "@/components/features/dashboard/BirthdayListCollapsible";
import { formatFullIndonesianDate } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Bagian cepat & kecil: identitas + daftar cabang untuk selector.
  // getCurrentUserRole/getBranchId sudah di-cache per-request di actions.ts.
  const [role, currentBranchId] = await Promise.all([
    getCurrentUserRole(),
    getBranchId(),
  ]);
  const isSuperadmin = role === "SUPERADMIN";
  const hasBranchSelected = !!currentBranchId && currentBranchId !== "";

  const branches: { id: string; name: string }[] = isSuperadmin
    ? await getBranches()
    : [];

  // Get selected branch name for display
  let selectedBranchName = "";
  if (currentBranchId === "ALL") {
    selectedBranchName = "Semua Cabang";
  } else if (currentBranchId) {
    const found = branches.find((b) => b.id === currentBranchId);
    if (found) selectedBranchName = found.name;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Branch Selector Card for Superadmin */}
      {isSuperadmin && branches.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="rounded-xl p-2.5 bg-brand-600 text-white shrink-0">
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
                  <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                    {hasBranchSelected
                      ? `Data ditampilkan untuk: ${selectedBranchName}`
                      : "Pilih cabang untuk melihat data"}
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-64 shrink-0">
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
      {/* Kondisi sama seperti sebelumnya: superadmin tanpa cabang -> placeholder,
          selain itu data utama di-streaming agar selector langsung tampil. */}
      {isSuperadmin && !hasBranchSelected ? (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border-2 border-dashed border-slate-300 dark:border-zinc-700 p-8 sm:p-14 flex flex-col items-center justify-center text-center">
          <div className="rounded-xl p-3.5 bg-brand-50 dark:bg-brand-500/15 mb-5">
            <svg
              className="h-8 w-8 text-brand-600 dark:text-brand-400"
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
          <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            Selamat Datang!
          </h3>
          <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-md leading-relaxed">
            Silakan pilih cabang menggunakan dropdown di atas untuk melihat data
            dashboard.
          </p>
        </div>
      ) : (
        <Suspense fallback={<DashboardMainSkeleton />}>
          <DashboardMain
            branchId={currentBranchId}
            isSuperadmin={isSuperadmin}
          />
        </Suspense>
      )}

      {/* Upload File PDF — selalu di paling bawah dashboard.
          Dokumen global, tidak tergantung cabang: di-streaming terpisah agar
          hero tidak menunggu query dokumen. Hasil akhir sama. */}
      <Suspense fallback={<DashboardDocsSkeleton />}>
        <DashboardDocs isSuperadmin={isSuperadmin} />
      </Suspense>
    </div>
  );
}

// Data utama dashboard (query & tampilan sama persis seperti sebelumnya,
// hanya dipindah ke komponen async agar bisa streaming via Suspense).
async function DashboardMain({
  branchId,
  isSuperadmin,
}: {
  branchId: string;
  isSuperadmin: boolean;
}) {
  // Only fetch data if a branch is selected (or if not superadmin)
  // Dijamin oleh pemanggil: komponen ini hanya dirender jika
  // hasBranchSelected || !isSuperadmin (kondisi identik seperti sebelumnya).
  // getModuleLockPasswords terdedup via cache() dengan panggilan layout —
  // QuickAccessLinks menerima nilainya sebagai props (tanpa fetch ulang).
  const [
    statsData,
    todaySlots,
    classes,
    overdueList,
    activeBranchName,
    initialLockPasswords,
  ] = await Promise.all([
    getDashboardStats(),
    getTodaySchedules(),
    getClasses(),
    getOverdueWorksheets(branchId), // Pass branch ID for filtering
    getActiveBranchName(),
    getModuleLockPasswords(),
  ]);

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
      // Show dynamic message based on upcoming schedules
      subValue:
        statsData.cgUpcoming > 0
          ? `${statsData.cgUpcoming} sesi tersedia`
          : "0 sesi",
      iconName: "sun",
      statusFilter: "CG" as const,
    },
    {
      name: "Laporan Terlewat",
      value: overdueList.length.toString(),
      iconName: "alert-circle",
      statusFilter: "OVERDUE_WORKSHEETS" as const,
    },
  ];

  return (
    <>
      {/* Ringkasan: hero satu kartu — header solid brand-600, body putih untuk stat netral. */}
      <div className="overflow-hidden rounded-2xl bg-brand-600 border border-brand-700/30 shadow-sm">
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium text-white/85">
            {formatFullIndonesianDate(new Date())}
            {activeBranchName ? ` - Cabang ${activeBranchName}` : ""}
          </p>
          <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Hallo, ShiningSun!
          </h2>
          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-white/85">
            Ringkasan pendaftaran dan penjadwalan hari ini.
          </p>
        </div>

        <div className="border-t border-white/20 bg-white dark:bg-zinc-900 px-5 sm:px-6 py-5">
          <DashboardStatsPanel stats={stats} />
        </div>
      </div>

      {/* Notification & Schedule Section */}
      <div className="space-y-6">
        <NotificationPermissionBanner />

        {/* Birthday List Collapsible */}
        <BirthdayListCollapsible />

        <TodaySchedule slots={todaySlots} classes={classes} />
      </div>

      {/* Quick Access */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white">
          Akses Cepat
        </h3>
        <QuickAccessLinks
          isSuperadmin={isSuperadmin}
          initialLockPasswords={initialLockPasswords}
        />
      </div>

      <ResetDataSection isSuperadmin={isSuperadmin} showReset={false} />
    </>
  );
}

// Dokumen global di bawah dashboard (query & tampilan sama persis).
async function DashboardDocs({ isSuperadmin }: { isSuperadmin: boolean }) {
  const [rulesDocuments, curriculumDocuments] = await Promise.all([
    getStudentRulesDocuments(),
    getCurriculumDocuments(),
  ]);

  return (
    <>
      {/* Upload File PDF — selalu di paling bawah dashboard */}
      <StudentRulesSection initialDocuments={rulesDocuments} />

      {/* Kurikulum — di bawah Informasi Bimba; upload khusus superadmin, lihat untuk admin */}
      <CurriculumSection
        initialDocuments={curriculumDocuments}
        isSuperadmin={isSuperadmin}
      />
    </>
  );
}

// Skeleton selama streaming (tampilan sementara, bukan data).
function DashboardMainSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-brand-600 border border-brand-700/30 animate-pulse">
      <div className="p-5 sm:p-6">
        <div className="h-4 w-40 rounded-lg bg-white/30" />
        <div className="mt-2 h-7 w-56 max-w-full rounded-lg bg-white/40" />
        <div className="mt-2 h-4 w-72 max-w-full rounded-lg bg-white/25" />
      </div>
      <div className="border-t border-white/20 bg-white dark:bg-zinc-900 px-5 sm:px-6 py-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="h-24 rounded-xl bg-slate-100 dark:bg-zinc-800/70" />
          <div className="h-24 rounded-xl bg-slate-100 dark:bg-zinc-800/70" />
          <div className="h-24 rounded-xl bg-slate-100 dark:bg-zinc-800/70" />
        </div>
      </div>
    </div>
  );
}

function DashboardDocsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-32 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800" />
      <div className="h-32 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800" />
    </div>
  );
}
