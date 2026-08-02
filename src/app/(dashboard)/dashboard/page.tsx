import { Icons } from "@/components/ui/icons";
import { getDashboardStats, getTodaySchedules, getCurrentUserRole, getBranches, getBranchId, getClasses, getActiveBranchName } from "@/lib/actions";
import { TodaySchedule } from "@/components/features/dashboard/TodaySchedule";
import { QuickAccessLinks } from "@/components/features/dashboard/QuickAccessLinks";
import { BranchSelector } from "@/components/features/auth/BranchSelector";
import { DashboardStatsPanel } from "@/components/features/dashboard/DashboardStatsPanel";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const role = await getCurrentUserRole();
  const currentBranchId = await getBranchId();
  const isSuperadmin = role === 'SUPERADMIN';
  const hasBranchSelected = !!currentBranchId && currentBranchId !== '';

  let branches: { id: string; name: string }[] = [];
  if (isSuperadmin) {
    branches = await getBranches();
  }

  // Only fetch data if a branch is selected (or if not superadmin)
  let statsData = { reguler: 0, cg: 0, classes: 0 };
  let todaySlots: any[] = [];
  let classes: any[] = [];
  let activeBranchName: string | null = null;
  
  if (hasBranchSelected || !isSuperadmin) {
    [statsData, todaySlots, classes, activeBranchName] = await Promise.all([
      getDashboardStats(), 
      getTodaySchedules(), 
      getClasses(),
      getActiveBranchName()
    ]);
  }

  const stats = [
    { name: 'Siswa Aktif', value: statsData.reguler.toString(), iconName: 'users', statusFilter: 'REGISTERED' as const },
    { name: 'Coba Gratis', value: statsData.cg.toString(), iconName: 'sun', statusFilter: 'CG' as const },
    { name: 'Tipe Kelas', value: statsData.classes.toString(), iconName: 'calendar', statusFilter: 'CLASSES' as const },
  ];

  // Get selected branch name for display
  let selectedBranchName = '';
  if (currentBranchId === 'ALL') {
    selectedBranchName = 'Semua Cabang';
  } else if (currentBranchId) {
    const found = branches.find(b => b.id === currentBranchId);
    if (found) selectedBranchName = found.name;
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Branch Selector Card for Superadmin */}
      {isSuperadmin && branches.length > 0 && (
        <div className="rounded-3xl bg-gradient-to-r from-white via-slate-50/50 to-slate-100/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 border border-slate-200/80 dark:border-slate-800 shadow-md shadow-slate-200/50 dark:shadow-slate-900/50 overflow-hidden">
          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="rounded-2xl p-3 bg-gradient-to-br from-brand-500 via-brand-600 to-indigo-600 shadow-md shadow-brand-500/25 shrink-0 text-white">
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cabang Aktif</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {hasBranchSelected 
                      ? `Data ditampilkan untuk: ${selectedBranchName}` 
                      : 'Pilih cabang untuk melihat data'}
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-64 shrink-0">
                <BranchSelector branches={branches} currentBranchId={currentBranchId} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show placeholder when no branch selected (superadmin first login) */}
      {isSuperadmin && !hasBranchSelected ? (
        <div className="rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 sm:p-16 flex flex-col items-center justify-center text-center shadow-inner">
          <div className="rounded-2xl p-4 bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 mb-6">
            <svg className="h-10 w-10 text-brand-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white mb-2">
            Selamat Datang, Superadmin!
          </h3>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-2">
            Silakan pilih cabang terlebih dahulu menggunakan dropdown di atas untuk melihat data dashboard, jadwal, dan informasi lainnya.
          </p>
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 mt-2">
            <svg className="h-4 w-4 animate-bounce" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
            <span className="text-sm font-medium">Pilih cabang di atas untuk memulai</span>
            <svg className="h-4 w-4 animate-bounce" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </div>
        </div>
      ) : (
        <>
          {/* Hero Banner */}
          <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-brand-600 to-indigo-700 dark:from-brand-700 dark:via-brand-800 dark:to-indigo-950 p-6 sm:p-10 shadow-xl shadow-brand-500/20 border border-brand-500/30 relative overflow-hidden">
            {/* Abstract Background Decoration */}
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white/95 text-xs font-semibold backdrop-blur-md shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  {activeBranchName && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-100 text-xs font-bold backdrop-blur-md shadow-xs">
                      <svg className="w-3.5 h-3.5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Cabang: {activeBranchName}
                    </div>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight flex flex-wrap items-baseline gap-x-2.5 gap-y-1 drop-shadow-xs">
                  <span>Hallo, ShiningSun!</span>
                  {activeBranchName && (
                    <span className="text-amber-200/90 font-semibold text-lg sm:text-2xl">
                      ({activeBranchName})
                    </span>
                  )}
                </h2>
                <p className="text-brand-100 text-sm sm:text-base mt-2 max-w-xl leading-relaxed opacity-95">
                  Ini adalah ringkasan sistem pendaftaran dan penjadwalan {activeBranchName ? `cabang ${activeBranchName}` : 'hari ini'}. Semoga aktivitas berjalan lancar.
                </p>
              </div>
            </div>

            {/* Glassmorphic Elevated Stats Cards - inside hero */}
            <DashboardStatsPanel stats={stats} />
          </div>

          <div className="mt-8">
            <TodaySchedule slots={todaySlots} classes={classes} />
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-bold leading-6 text-slate-900 dark:text-white mb-4">
              Akses Cepat
            </h3>
            <QuickAccessLinks />
          </div>
        </>
      )}
    </div>
  );
}
