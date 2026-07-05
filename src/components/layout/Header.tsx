"use client";

import { Icons } from "../ui/icons";
import { useSidebar } from "@/lib/SidebarContext";
import { BranchSelector } from "@/components/features/auth/BranchSelector";

interface Branch {
  id: string;
  name: string;
}

interface HeaderProps {
  role: string | null;
  branches: Branch[];
  currentBranchId: string;
}

export function Header({ role, branches, currentBranchId }: HeaderProps) {
  const { toggle } = useSidebar();

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 backdrop-blur-md px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 transition-colors">
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-between lg:justify-end">
        <form className="relative flex flex-1 items-center lg:hidden" action="#" method="GET">
          <label htmlFor="search-field" className="sr-only">
            Search
          </label>
          {/* Mobile hamburger menu */}
          <button 
            type="button" 
            className="-m-2.5 p-2.5 text-slate-700 dark:text-slate-200 lg:hidden"
            onClick={toggle}
          >
            <span className="sr-only">Buka sidebar</span>
            <Icons.menu className="h-6 w-6" aria-hidden="true" />
          </button>
          
          <div className="flex items-center gap-3 lg:hidden ml-4 text-brand-600 font-bold text-lg">
             <Icons.sun className="w-6 h-6" />
             ShiningSun
          </div>
        </form>

        <div className="flex items-center gap-x-4 lg:gap-x-6 w-full justify-end">
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-mono">
            DEBUG: {role === null ? 'NULL' : role}
          </span>
          {role === 'SUPERADMIN' && (
            <div className="mr-auto lg:mr-0 pl-4 lg:pl-0">
               <BranchSelector branches={branches} currentBranchId={currentBranchId} />
            </div>
          )}
          
          <button type="button" className="-m-2.5 p-2.5 text-slate-400 hover:text-slate-500">
            <span className="sr-only">Lihat notifikasi</span>
            <div className="relative">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900"></div>
            </div>
          </button>
          
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-slate-200 dark:lg:bg-slate-700" aria-hidden="true" />
          
          <button 
            onClick={async () => {
              if (confirm("Yakin ingin keluar?")) {
                const { logout } = await import('@/lib/authActions');
                await logout();
              }
            }}
            className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
          >
            Keluar
          </button>
        </div>
      </div>
    </header>
  );
}
