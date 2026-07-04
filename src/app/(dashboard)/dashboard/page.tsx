import { Icons } from "@/components/ui/icons";
import { getDashboardStats } from "@/lib/actions";

export default async function DashboardPage() {
  const statsData = await getDashboardStats();

  const stats = [
    { name: 'Total Siswa Aktif', value: statsData.reguler.toString(), icon: Icons.users, change: 'Data Asli', changeType: 'neutral' },
    { name: 'Siswa Coba Gratis', value: statsData.cg.toString(), icon: Icons.sun, change: 'Data Asli', changeType: 'neutral' },
    { name: 'Total Tipe Kelas', value: statsData.classes.toString(), icon: Icons.calendar, change: 'Tersedia', changeType: 'positive' },
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
            className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 px-4 pb-12 pt-5 shadow-sm border border-slate-100 dark:border-slate-800 sm:px-6 sm:pt-6 transition-all hover:shadow-md hover:border-brand-200 dark:hover:border-brand-800 group"
          >
            <dt>
              <div className="absolute rounded-xl bg-brand-50 dark:bg-brand-500/10 p-3 group-hover:scale-110 group-hover:bg-brand-100 dark:group-hover:bg-brand-500/20 transition-all">
                <item.icon className="h-6 w-6 text-brand-600 dark:text-brand-400" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-slate-500 dark:text-slate-400">
                {item.name}
              </p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
              <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                {item.value}
              </p>
              <p
                className={`ml-2 flex items-baseline text-sm font-semibold
                  ${item.changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
                `}
              >
                {item.change}
              </p>
            </dd>
          </div>
        ))}
      </dl>

      {/* Placeholder for Calendar Widget */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-5">
          <h3 className="text-base font-semibold leading-6 text-slate-900 dark:text-white">
            Jadwal Hari Ini
          </h3>
        </div>
        <div className="px-6 py-12 flex flex-col items-center justify-center text-center">
          <div className="p-4 rounded-full bg-slate-50 dark:bg-slate-800 mb-4">
            <Icons.calendar className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Belum ada jadwal</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Mulai atur kelas untuk hari ini melalui menu Jadwal Kelas.
          </p>
          <div className="mt-6">
            <button
              type="button"
              className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 transition-colors"
            >
              <Icons.calendar className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Buat Jadwal Baru
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
