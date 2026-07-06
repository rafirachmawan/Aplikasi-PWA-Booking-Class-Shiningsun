import Link from "next/link";
import { Icons } from "@/components/ui/icons";
import { getDashboardStats } from "@/lib/actions";

export default async function DashboardPage() {
  const statsData = await getDashboardStats();

  const stats = [
    { name: 'Total Siswa Aktif', value: statsData.reguler.toString(), icon: Icons.users, change: 'Data Asli', changeType: 'neutral', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', hoverBg: 'group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20' },
    { name: 'Siswa Coba Gratis', value: statsData.cg.toString(), icon: Icons.sun, change: 'Data Asli', changeType: 'neutral', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', hoverBg: 'group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20' },
    { name: 'Total Tipe Kelas', value: statsData.classes.toString(), icon: Icons.calendar, change: 'Tersedia', changeType: 'positive', color: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-500/10', hoverBg: 'group-hover:bg-brand-100 dark:group-hover:bg-brand-500/20' },
  ];

  const quickActions = [
    { name: 'Kelola Siswa', description: 'Kelola data dan status siswa', href: '/students', icon: Icons.users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', borderHover: 'hover:border-blue-200 dark:hover:border-blue-800' },
    { name: 'Jadwal Kelas', description: 'Atur jadwal dan sesi pertemuan', href: '/schedule', icon: Icons.calendar, color: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-500/10', borderHover: 'hover:border-brand-200 dark:hover:border-brand-800' },
    { name: 'Master Data', description: 'Kelola kelas dan label', href: '/master', icon: Icons.settings, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10', borderHover: 'hover:border-purple-200 dark:hover:border-purple-800' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-slate-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Overview Cabang
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ringkasan performa pendaftaran dan penjadwalan terkini (Live Database).
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((item) => (
          <div
            key={item.name}
            className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md hover:-translate-y-1 hover:border-slate-200 dark:hover:border-slate-700 group flex items-center gap-4"
          >
            <div className={`rounded-xl p-3 ${item.bg} ${item.hoverBg} transition-all duration-300 group-hover:scale-110 flex-shrink-0`}>
              <item.icon className={`h-6 w-6 ${item.color}`} aria-hidden="true" />
            </div>
            <div>
              <dt className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">
                {item.name}
              </dt>
              <dd className="flex items-baseline">
                <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {item.value}
                </p>
                <p
                  className={`ml-2 flex items-baseline text-xs font-semibold
                    ${item.changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
                  `}
                >
                  {item.change}
                </p>
              </dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="mt-8">
        <h3 className="text-lg font-semibold leading-6 text-slate-900 dark:text-white mb-4">
          Akses Cepat
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              href={action.href}
              className={`relative flex items-center space-x-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 ${action.borderHover} group`}
            >
              <div className={`flex-shrink-0 rounded-xl p-3 ${action.bg} transition-transform duration-300 group-hover:scale-110`}>
                <action.icon className={`h-5 w-5 ${action.color}`} aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                  {action.name}
                </h4>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
