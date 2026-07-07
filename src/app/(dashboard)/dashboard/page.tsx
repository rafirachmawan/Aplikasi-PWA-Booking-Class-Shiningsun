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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Banner */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Selamat {new Date().getHours() < 12 ? 'Pagi' : new Date().getHours() < 15 ? 'Siang' : new Date().getHours() < 18 ? 'Sore' : 'Malam'}, ShiningSun!
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Ringkasan performa pendaftaran dan penjadwalan terkini.
          </p>
        </div>

        {/* Stats */}
        <dl className="grid grid-cols-3 gap-3 mt-5">
          {stats.map((item) => (
            <div
              key={item.name}
              className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 sm:p-4 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
            >
              <dt className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                {item.name}
              </dt>
              <dd className="mt-1">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{item.value}</span>
              </dd>
            </div>
          ))}
        </dl>
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
