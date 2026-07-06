"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const quickActions = [
  { name: 'Kelola Siswa', description: 'Kelola data dan status siswa', href: '/students', icon: Icons.users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', borderHover: 'hover:border-blue-200 dark:hover:border-blue-800' },
  { name: 'Jadwal Kelas', description: 'Atur jadwal dan sesi pertemuan', href: '/schedule', icon: Icons.calendar, color: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-500/10', borderHover: 'hover:border-brand-200 dark:hover:border-brand-800' },
  { name: 'Master Data', description: 'Kelola kelas dan label', href: '/master', icon: Icons.settings, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10', borderHover: 'hover:border-purple-200 dark:hover:border-purple-800' },
];

export function QuickAccessLinks() {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  return (
    <>
      {isNavigating && <LoadingSpinner usePortal={true} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((action) => (
          <Link
            key={action.name}
            href={action.href}
            onClick={() => {
              if (pathname !== action.href) {
                setIsNavigating(true);
              }
            }}
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
    </>
  );
}
