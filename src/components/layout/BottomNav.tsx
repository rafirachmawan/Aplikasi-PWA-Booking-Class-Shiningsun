import { Icons } from "@/components/ui/icons";

interface BottomNavProps {
  role?: string | null;
}

export function BottomNav({ role }: BottomNavProps) {
  const isSuperadmin = role === 'SUPERADMIN';

  return (
    <nav 
      aria-label="Navigasi Bawah Mobile"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md px-1 py-1.5 shadow-lg flex items-center justify-around"
    >
      <a
        href="/dashboard"
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 active:bg-slate-100 dark:active:bg-slate-800 transition-colors shrink-0"
      >
        <Icons.home className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <span className="text-[10px] font-bold mt-0.5">Dashboard</span>
      </a>

      <a
        href="/schedule"
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 active:bg-slate-100 dark:active:bg-slate-800 transition-colors shrink-0"
      >
        <Icons.calendar className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <span className="text-[10px] font-bold mt-0.5">Jadwal</span>
      </a>

      <a
        href="/scheduling"
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 active:bg-slate-100 dark:active:bg-slate-800 transition-colors shrink-0"
      >
        <svg className="w-5 h-5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-[10px] font-bold mt-0.5">Plot Siswa</span>
      </a>

      <a
        href="/students"
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 active:bg-slate-100 dark:active:bg-slate-800 transition-colors shrink-0"
      >
        <Icons.users className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <span className="text-[10px] font-bold mt-0.5">Siswa</span>
      </a>

      <a
        href="/master"
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 active:bg-slate-100 dark:active:bg-slate-800 transition-colors shrink-0"
      >
        <Icons.settings className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        <span className="text-[10px] font-bold mt-0.5">Master</span>
      </a>

      {isSuperadmin && (
        <a
          href="/accounts"
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-amber-600 dark:text-amber-400 hover:text-amber-700 active:bg-amber-50 dark:active:bg-amber-950/20 transition-colors shrink-0"
        >
          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <span className="text-[9px] font-bold mt-0.5">Akun</span>
        </a>
      )}
    </nav>
  );
}
