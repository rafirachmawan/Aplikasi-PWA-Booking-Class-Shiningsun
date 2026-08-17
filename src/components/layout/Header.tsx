"use client";

import { useState } from "react";
import Image from "next/image";
import { Icons } from "../ui/icons";
import { useSidebar } from "@/lib/SidebarContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { NotificationBell } from "@/components/layout/NotificationBell";

interface HeaderProps {
  role: string | null;
  branchName?: string | null;
}

export function Header({ role, branchName }: HeaderProps) {
  const { toggle } = useSidebar();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { logout } = await import("@/lib/authActions");
      await logout();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed", error);
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  return (
    <>
      {isLoggingOut && <LoadingSpinner usePortal={true} />}
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 backdrop-blur-md px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 transition-colors">
        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-between lg:justify-end">
          <div className="flex flex-1 items-center lg:hidden gap-2">
            {/* Mobile hamburger menu */}
            <label
              htmlFor="sidebar-drawer-toggle"
              className="-m-2.5 p-2.5 text-slate-700 dark:text-slate-200 lg:hidden cursor-pointer active:opacity-70 flex items-center justify-center"
              onClick={toggle}
            >
              <span className="sr-only">Buka sidebar</span>
              <Icons.menu className="h-6 w-6" aria-hidden="true" />
            </label>

            <div className="flex items-center gap-2 lg:hidden ml-1">
              <svg
                className="w-4 h-4 text-brand-500 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-brand-600 font-bold text-sm sm:text-base truncate max-w-40 sm:max-w-55">
                {branchName || "ShiningSun"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-x-3 lg:gap-x-6 w-full justify-end">
            {branchName && (
              <div className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                <svg
                  className="w-3.5 h-3.5 text-brand-500 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>{branchName}</span>
              </div>
            )}

            <NotificationBell role={role} />

            <div
              className="hidden lg:block lg:h-6 lg:w-px lg:bg-slate-200 dark:lg:bg-slate-700"
              aria-hidden="true"
            />

            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden shrink-0">
              <Image
                src="/logo.png"
                alt="User Profile"
                width={32}
                height={32}
                className="object-cover"
              />
            </div>

            <button
              disabled={isLoggingOut}
              onClick={() => setShowLogoutModal(true)}
              className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
            >
              {isLoggingOut ? "Keluar..." : "Keluar"}
            </button>
          </div>
        </div>
      </header>

      {showLogoutModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10 mb-4">
                <svg
                  className="h-7 w-7 text-red-600 dark:text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">
                Konfirmasi Keluar
              </h3>
              <p className="text-sm text-center text-slate-500 dark:text-slate-400">
                Apakah Anda yakin ingin keluar dari aplikasi ShiningSun? Anda
                harus login kembali untuk masuk.
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="w-full px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {isLoggingOut ? "Keluar..." : "Ya, Keluar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
