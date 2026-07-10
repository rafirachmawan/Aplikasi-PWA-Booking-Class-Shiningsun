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

const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

export function NotificationBell({ role }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [hasNew, setHasNew] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click (desktop)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lock body scroll when open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleOpen = async () => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening) {
      setHasNew(false);
      if (!hasFetched) {
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
      }
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const data = await getRecentActivities();
      setActivities(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const isSuperAdmin = role === "SUPERADMIN";

  const PanelBody = (
    <>
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Aktivitas Terbaru</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {isSuperAdmin ? "Dari semua cabang" : "Cabang Anda"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors disabled:opacity-50"
            title="Perbarui"
          >
            <svg className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
          {/* Close button (mobile only) */}
          <button
            onClick={() => setIsOpen(false)}
            className="sm:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Activity List */}
      <div className="overflow-y-auto flex-1 divide-y divide-slate-50 dark:divide-slate-800">
        {isLoading && activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <svg className="w-6 h-6 text-brand-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs text-slate-400">Memuat aktivitas...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
            <svg className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-xs">Belum ada aktivitas terbaru.</p>
          </div>
        ) : (
          activities.map((act: any, i: number) => {
            const student = Array.isArray(act.student) ? act.student[0] : act.student;
            const slot = Array.isArray(act.slot) ? act.slot[0] : act.slot;
            const cls = slot ? (Array.isArray(slot.class) ? slot.class[0] : slot.class) : null;
            const branch = slot ? (Array.isArray(slot.branch) ? slot.branch[0] : slot.branch) : null;
            const statusColor = student?.status === 'REGISTERED' ? 'bg-emerald-500' : student?.status === 'CG' ? 'bg-amber-500' : 'bg-slate-400';

            return (
              <div key={i} className="flex gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="shrink-0 mt-0.5">
                  <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                    <span className="font-bold">{student?.name || "?"}</span>
                    {" "}ditambahkan ke jadwal{" "}
                    <span className="font-semibold text-brand-600 dark:text-brand-400">{slot ? formatDate(slot.date) : "?"}</span>
                    {cls && <span className="text-slate-500 dark:text-slate-400"> · {cls.name}</span>}
                    {slot?.time && <span className="text-slate-400"> · {slot.time.substring(0, 5)}</span>}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded ${statusColor} text-white`}>
                      {student?.status === 'REGISTERED' ? 'Reguler' : student?.status === 'CG' ? 'CG' : 'Nonaktif'}
                    </span>
                    {isSuperAdmin && branch?.name && (
                      <span className="text-[9px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        📍 {branch.name}
                      </span>
                    )}
                    <span className="text-[9px] text-slate-400 ml-auto">{timeAgo(act.created_at)}</span>
                  </div>
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
            {activities.length} aktivitas terbaru • diambil saat lonceng diklik
          </p>
        </div>
      )}
    </>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleOpen}
        className="-m-2.5 p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
      >
        <span className="sr-only">Lihat notifikasi</span>
        <div className="relative">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          {hasNew && (
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
          )}
        </div>
      </button>

      {isOpen && (
        <>
          {/* ── MOBILE: Bottom Sheet ── */}
          <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setIsOpen(false)}
            />
            {/* Sheet panel */}
            <div className="relative z-10 bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl border-t border-slate-200 dark:border-slate-700 flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-full duration-300">
              {/* Drag handle indicator */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
              {PanelBody}
            </div>
          </div>

          {/* ── DESKTOP: Dropdown ── */}
          <div className="hidden sm:flex sm:flex-col absolute right-0 top-12 w-96 max-h-[500px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 z-50">
            {PanelBody}
          </div>
        </>
      )}
    </div>
  );
}
