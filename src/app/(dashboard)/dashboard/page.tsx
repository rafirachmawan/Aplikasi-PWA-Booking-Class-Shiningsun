import { Icons } from "@/components/ui/icons";
import { getDashboardStats, getTodaySchedules } from "@/lib/actions";
import { TodaySchedule } from "@/components/features/dashboard/TodaySchedule";
import { QuickAccessLinks } from "@/components/features/dashboard/QuickAccessLinks";

export default async function DashboardPage() {
  const [statsData, todaySlots] = await Promise.all([getDashboardStats(), getTodaySchedules()]);

  const stats = [
    { name: 'Total Siswa Aktif', value: statsData.reguler.toString(), icon: Icons.users, change: 'Data Asli', changeType: 'neutral', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', hoverBg: 'group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20' },
    { name: 'Siswa Coba Gratis', value: statsData.cg.toString(), icon: Icons.sun, change: 'Data Asli', changeType: 'neutral', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', hoverBg: 'group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20' },
    { name: 'Total Tipe Kelas', value: statsData.classes.toString(), icon: Icons.calendar, change: 'Tersedia', changeType: 'positive', color: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-500/10', hoverBg: 'group-hover:bg-brand-100 dark:group-hover:bg-brand-500/20' },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
              Selamat {new Date().getHours() < 12 ? 'Pagi' : new Date().getHours() < 15 ? 'Siang' : new Date().getHours() < 18 ? 'Sore' : 'Malam'}, ShiningSun!
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
        <TodaySchedule slots={todaySlots} />
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white mb-4">
          Akses Cepat
        </h3>
        <QuickAccessLinks />
      </div>

    </div>
  );
}
