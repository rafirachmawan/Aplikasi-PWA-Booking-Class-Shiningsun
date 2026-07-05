"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "../ui/icons";
import { useSidebar } from "@/lib/SidebarContext";
import { useEffect } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Icons.home },
  { name: "Jadwal Kelas", href: "/schedule", icon: Icons.calendar },
  { name: "Buku Induk Siswa", href: "/students", icon: Icons.users },
  { name: "Master Data", href: "/master", icon: Icons.settings },
];

interface SidebarProps {
  userName?: string;
  branchName?: string;
}

export function Sidebar({ userName = "Admin", branchName = "Tidak Diketahui" }: SidebarProps) {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();

  // Close sidebar on route change on mobile
  useEffect(() => {
    close();
  }, [pathname, close]);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Content */}
      <div className={`
        fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:shadow-sm
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500 text-white rounded-lg shadow-md shadow-brand-500/20">
              <Icons.sun className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Shining<span className="text-brand-500">Sun</span>
            </span>
          </div>
          {/* Close button for mobile */}
          <button 
            type="button" 
            className="lg:hidden text-slate-400 hover:text-slate-500" 
            onClick={close}
          >
            <span className="sr-only">Tutup sidebar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <nav className="flex flex-1 flex-col p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200
                  ${
                    isActive
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  }
                `}
              >
                <item.icon
                  className={`w-5 h-5 transition-colors ${
                    isActive
                      ? "text-brand-600 dark:text-brand-400"
                      : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      
        <div className="p-4 mt-auto border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div className="w-8 h-8 rounded-full bg-brand-200 flex items-center justify-center text-brand-700 font-bold shrink-0 uppercase">
              {userName.charAt(0)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{userName}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{branchName}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
