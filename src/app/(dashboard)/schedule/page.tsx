import { Icons } from "@/components/ui/icons";

export default function SchedulePage() {
  const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  // Placeholder untuk 30 hari dalam kalender
  const dates = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-slate-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
            Matriks Kalender
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pusat kendali jadwal bulanan. Mode manual & mode generator otomatis 1 bulan.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center rounded-lg bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Icons.settings className="-ml-1 mr-2 h-5 w-5 text-slate-400" aria-hidden="true" />
            Pengaturan Mode
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 transition-colors"
          >
            <Icons.calendar className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            + Buat Jadwal
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
               <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Juli 2026</h3>
            <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
               <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
             <button className="px-3 py-1.5 text-sm font-medium rounded-md bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white">Bulan</button>
             <button className="px-3 py-1.5 text-sm font-medium rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Minggu</button>
          </div>
        </div>
        
        {/* Kalender Grid Wrapper untuk Mobile */}
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 bg-slate-200 dark:bg-slate-800 gap-px border-b border-slate-200 dark:border-slate-800">
              {days.map((day) => (
                <div key={day} className="bg-slate-50 dark:bg-slate-900/50 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800">
              {/* Padding awal bulan (dummy empty slots) */}
              <div className="bg-white dark:bg-slate-900 min-h-[120px]"></div>
              <div className="bg-white dark:bg-slate-900 min-h-[120px]"></div>
              
              {dates.map((date) => (
                <div key={date} className="bg-white dark:bg-slate-900 min-h-[120px] p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer">
                  <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                    ${date === 5 ? 'bg-brand-600 text-white' : 'text-slate-700 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'}`}>
                    {date}
                  </span>
                  
                  {/* Dummy Jadwal Item */}
                  {date === 5 && (
                     <div className="mt-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 rounded border border-green-200 dark:border-green-500/30 truncate">
                       08:00 Kelas Star
                     </div>
                  )}
                  {date === 12 && (
                     <div className="mt-2 flex flex-col gap-1">
                       <div className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 rounded border border-red-200 dark:border-red-500/30 truncate">
                         LOCKED
                       </div>
                     </div>
                  )}
                </div>
              ))}
              
              {/* Padding akhir bulan */}
              <div className="bg-white dark:bg-slate-900 min-h-[120px]"></div>
              <div className="bg-white dark:bg-slate-900 min-h-[120px]"></div>
              <div className="bg-white dark:bg-slate-900 min-h-[120px]"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
