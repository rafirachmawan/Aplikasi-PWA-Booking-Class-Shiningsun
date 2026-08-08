"use client";

import { useState } from "react";
import { formatShortDate, formatFullIndonesianDate } from "@/lib/dateUtils";

interface StudentScheduleCardProps {
  upcomingSchedules: any[];
  scheduleHistory: any[];
}

export function StudentScheduleCard({
  upcomingSchedules,
  scheduleHistory,
}: StudentScheduleCardProps) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "history">("upcoming");

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 sm:p-7 space-y-6">
      
      {/* Header & Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📅 Jadwal Kelas Anak</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pantau sesi kelas mendatang dan riwayat kehadiran anak Anda.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "upcoming"
                ? "bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-300 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Sesi Mendatang ({upcomingSchedules.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "history"
                ? "bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-300 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Riwayat Sesi ({scheduleHistory.length})
          </button>
        </div>
      </div>

      {/* Content: Upcoming Schedules */}
      {activeTab === "upcoming" && (
        <div className="space-y-3">
          {upcomingSchedules.length === 0 ? (
            <div className="py-10 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Belum ada jadwal kelas mendatang yang terdaftar.
              </p>
            </div>
          ) : (
            upcomingSchedules.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-brand-200 transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex flex-col items-center justify-center shrink-0 border border-brand-500/20">
                    <span className="text-[10px] uppercase font-bold tracking-wider">
                      {formatShortDate(slot.date).split(',')[0]}
                    </span>
                    <span className="text-sm font-extrabold leading-none mt-0.5">
                      {new Date(slot.date).getDate() || ''}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {slot.class?.name || "Kelas"}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-brand-600 dark:text-brand-400">
                        ⏰ {slot.time} WIB
                      </span>
                      <span>•</span>
                      <span>{formatShortDate(slot.date)}</span>
                    </div>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/60 shrink-0">
                  ✓ Terjadwal
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Content: Schedule History */}
      {activeTab === "history" && (
        <div className="space-y-3">
          {scheduleHistory.length === 0 ? (
            <div className="py-10 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Belum ada riwayat sesi kelas yang berlalu.
              </p>
            </div>
          ) : (
            scheduleHistory.map((slot, index) => (
              <div
                key={slot.id || index}
                className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-200/60 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0 font-bold text-xs">
                    #{index + 1}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {slot.class?.name || "Kelas"}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatFullIndonesianDate(slot.date)} • {slot.time} WIB
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-400 shrink-0">
                  Selesai
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
