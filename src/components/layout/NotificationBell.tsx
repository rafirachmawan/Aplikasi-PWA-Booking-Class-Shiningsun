"use client";

import { useState, useRef, useEffect } from "react";
import { getRecentActivities } from "@/lib/actions";

interface NotificationBellProps {
  role: string | null;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} mnt lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays === 1) return "Kemarin";
  return `${diffDays} hari lalu`;
}

export function NotificationBell({ role }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [hasNew, setHasNew] = useState(true);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const data = await getRecentActivities();
      setActivities(data);
      setHasFetched(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = async () => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening) {
      setHasNew(false);
      if (!hasFetched) await fetchActivities();
    }
  };

  const isSuperAdmin = role === "SUPERADMIN";

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleOpen}
        className="-m-2.5 p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
      >
        <span className="sr-only">Lihat notifikasi</span>
        <div className="relative">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>
          {hasNew && (
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
          )}
        </div>
      </button>

      {/* Panel — anchored below header on mobile, dropdown on desktop */}
      {isOpen && (
        <>
          {/* Backdrop (mobile only) */}
          <div
            className="sm:hidden fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div
            className={`
            z-50 bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden
            flex flex-col
            animate-in fade-in duration-200
            /* Responsive positioning is defined in globals.css */
            notif-panel-position top-16.25 left-3 right-3 max-h-[calc(100vh-80px)] rounded-2xl
            sm:top-12 sm:left-auto sm:right-0 sm:w-96 sm:max-h-125 sm:rounded-2xl sm:zoom-in-95
          `}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  Aktivitas Terbaru
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isSuperAdmin ? "Dari semua cabang" : "Cabang Anda"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={fetchActivities}
                  disabled={isLoading}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors disabled:opacity-50"
                  title="Perbarui"
                >
                  <svg
                    className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Activity List */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <svg
                    className="w-6 h-6 text-brand-500 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span className="text-xs text-slate-400">
                    Memuat aktivitas...
                  </span>
                </div>
              ) : activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                  <svg
                    className="w-10 h-10 opacity-30"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <p className="text-xs">Belum ada aktivitas terbaru.</p>
                </div>
              ) : (
                activities.map((act: any) => {
                  const isBirthday = act.type === "BIRTHDAY_FEEDBACK";
                  const message = String(act.message ?? "")
                    .replace(/\s+/g, " ")
                    .trim();
                  const preview =
                    message.length > 140
                      ? `${message.slice(0, 140).trimEnd()}…`
                      : message;

                  return (
                    <div
                      key={act.id}
                      className="flex gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div
                        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          isBirthday
                            ? "bg-pink-100 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400"
                            : "bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"
                        }`}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d={
                              isBirthday
                                ? "M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                                : "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                            }
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {act.student_name}
                          </p>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {timeAgo(act.created_at)}
                          </span>
                        </div>
                        <p
                          className={`mt-0.5 text-[11px] font-medium ${
                            isBirthday
                              ? "text-pink-600 dark:text-pink-400"
                              : "text-sky-600 dark:text-sky-400"
                          }`}
                        >
                          {isBirthday
                            ? "Feedback ulang tahun"
                            : `Feedback laporan perkembangan${
                                act.bulan_ke ? ` · Bulan ke-${act.bulan_ke}` : ""
                              }`}
                        </p>
                        <p className="mt-1.5 rounded-lg border-l-2 border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs leading-relaxed text-slate-600 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300 line-clamp-3 wrap-break-word">
                          {preview}
                        </p>
                        {isSuperAdmin && act.branch_name && (
                          <span className="mt-1.5 inline-block text-[9px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            📍 {act.branch_name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {activities.length > 0 && (
              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 shrink-0">
                <p className="text-[10px] text-slate-400 text-center">
                  {activities.length} aktivitas terbaru • diambil saat lonceng
                  diklik
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
