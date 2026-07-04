import { Icons } from "@/components/ui/icons";

export default function StudentsPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-slate-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
            Buku Induk Siswa
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola data siswa, pendaftaran baru, dan status Coba Gratis (CG).
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center rounded-lg bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Icons.users className="-ml-1 mr-2 h-5 w-5 text-slate-400" aria-hidden="true" />
            Export Data
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 transition-colors"
          >
            Pendaftaran Baru
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-4 flex gap-6">
          <button className="text-brand-600 dark:text-brand-400 font-semibold border-b-2 border-brand-600 dark:border-brand-400 pb-4 -mb-4 px-1">
            Siswa Reguler
          </button>
          <button className="text-slate-500 dark:text-slate-400 font-medium hover:text-slate-700 dark:hover:text-slate-300 transition-colors pb-4 -mb-4 px-1">
            Siswa Coba Gratis (CG)
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 dark:text-white sm:pl-6">
                  Nama Siswa
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900 dark:text-white">
                  Tingkatan Level
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900 dark:text-white">
                  Usia
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900 dark:text-white">
                  Tgl Daftar
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {[1, 2, 3].map((person) => (
                <tr key={person} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 dark:text-white sm:pl-6 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-700 dark:text-brand-300 font-bold">
                      A
                    </div>
                    Ananda {person}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center rounded-full bg-yellow-100 dark:bg-yellow-400/10 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:text-yellow-500">
                      Montessori A
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
                    3 Tahun 2 Bulan
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
                    12 Ags 2026
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <button className="text-brand-600 hover:text-brand-900 dark:text-brand-400 dark:hover:text-brand-300">
                      Detail<span className="sr-only">, Ananda {person}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
