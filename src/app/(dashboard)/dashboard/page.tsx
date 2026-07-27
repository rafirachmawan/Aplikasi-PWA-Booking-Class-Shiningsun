import { Icons } from "@/components/ui/icons";
import { getDashboardStats, getTodaySchedules, getCurrentUserRole, getBranches, getBranchId, getClasses } from "@/lib/actions";
import { TodaySchedule } from "@/components/features/dashboard/TodaySchedule";
import { QuickAccessLinks } from "@/components/features/dashboard/QuickAccessLinks";
import { BranchSelector } from "@/components/features/auth/BranchSelector";

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
  
  if (hasBranchSelected || !isSuperadmin) {
    [statsData, todaySlots, classes] = await Promise.all([getDashboardStats(), getTodaySchedules(), getClasses()]);
  }

  const stats = [
    { name: 'Total Siswa Aktif', value: statsData.reguler.toString(), icon: Icons.users, change: 'Data Asli', changeType: 'neutral', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', hoverBg: 'group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20' },
    { name: 'Siswa Coba Gratis', value: statsData.cg.toString(), icon: Icons.sun, change: 'Data Asli', changeType: 'neutral', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', hoverBg: 'group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20' },
    { name: 'Total Tipe Kelas', value: statsData.classes.toString(), icon: Icons.calendar, change: 'Tersedia', changeType: 'positive', color: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-500/10', hoverBg: 'group-hover:bg-brand-100 dark:group-hover:bg-brand-500/20' },
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
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="rounded-xl p-2.5 bg-gradient-to-br from-brand-500 to-brand-600 shadow-md shadow-brand-500/20 shrink-0">
                  <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Cabang Aktif</h3>
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
        <div className="rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 sm:p-16 flex flex-col items-center justify-center text-center">
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
          <div className="rounded-3xl bg-brand-600 p-6 sm:p-10 shadow-lg relative overflow-hidden">
            {/* Abstract Background Decoration */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-400 opacity-20 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-medium backdrop-blur-sm mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
                  Hallo, ShiningSun!
                </h2>
                <p className="text-brand-100 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
                  Ini adalah ringkasan sistem pendaftaran dan penjadwalan hari ini. Semoga aktivitas berjalan lancar.
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-8 sm:mt-10 relative z-10">
              {stats.map((item) => (
                <div
                  key={item.name}
                  className="rounded-2xl bg-white/10 border border-white/10 p-3 sm:p-5 backdrop-blur-md hover:bg-white/15 transition-all"
                >
                  <dt className="text-[10px] sm:text-xs font-semibold text-brand-100 uppercase tracking-wider mb-1 sm:mb-2 line-clamp-1">
                    {item.name}
                  </dt>
                  <dd>
                    <span className="text-2xl sm:text-4xl font-bold text-white">{item.value}</span>
                  </dd>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <TodaySchedule slots={todaySlots} classes={classes} />
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white mb-4">
              Akses Cepat
            </h3>
            <QuickAccessLinks />
          </div>
        </>
      )}
    </div>
  );
}
