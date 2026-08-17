"use client";

import { useState } from "react";
import { formatShortDate, formatFullIndonesianDate } from "@/lib/dateUtils";

interface StudentScheduleCardProps {
  upcomingSchedules: any[];
  scheduleHistory: any[];
}

const formatShortTime = (timeStr?: string) => {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return timeStr;
};

export function StudentScheduleCard({
  upcomingSchedules,
  scheduleHistory,
}: StudentScheduleCardProps) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "history">("upcoming");

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-4 sm:p-7 space-y-5 sm:space-y-6">
      
      {/* Header & Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📅 Jadwal Kelas Anak</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pantau sesi kelas mendatang dan riwayat kehadiran anak.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex w-full sm:w-auto p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
              activeTab === "upcoming"
                ? "bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-300 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Sesi Mendatang ({upcomingSchedules.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
              activeTab === "history"
                ? "bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-300 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
            upcomingSchedules.map((slot) => {
              const dayName = formatShortDate(slot.date).split(',')[0];
              const dateNum = new Date(slot.date).getDate() || '';

              return (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-3.5 sm:p-4.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 transition-all gap-3"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Calendar Badge */}
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-linear-to-b from-brand-500/15 to-brand-500/5 dark:from-brand-500/25 dark:to-brand-500/10 text-brand-600 dark:text-brand-300 flex flex-col items-center justify-center shrink-0 border border-brand-500/20 shadow-2xs">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider leading-none text-brand-500">
                        {dayName}
                      </span>
                      <span className="text-base sm:text-lg font-extrabold leading-none mt-1 text-brand-700 dark:text-brand-200">
                        {dateNum}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="min-w-0">
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {slot.class?.name || "Kelas"}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50 px-2 py-0.5 rounded-md border border-brand-200/60 dark:border-brand-800/50">
                          ⏰ {formatShortTime(slot.time)} WIB
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300">{formatShortDate(slot.date)}</span>
                      </div>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shrink-0 whitespace-nowrap">
                    ✓ Terjadwal
                  </span>
                </div>
              );
            })
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
            scheduleHistory.map((slot, index) => {
              const slotStr = `${slot.status || ""} ${slot.note || ""} ${slot.class?.name || ""}`.toLowerCase();
              const isSakit = slotStr.includes("sakit");
              const isIjin = !isSakit && (slotStr.includes("ijin") || slotStr.includes("izin"));

              return (
                <div
                  key={slot.id || index}
                  className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border gap-3 ${
                    isSakit
                      ? "bg-red-50/80 dark:bg-red-950/40 border-red-300 dark:border-red-800"
                      : isIjin
                      ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800"
                      : "bg-slate-50/60 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                      isSakit
                        ? "bg-red-200/80 dark:bg-red-900/60 text-red-800 dark:text-red-200"
                        : "bg-slate-200/60 dark:bg-slate-800 text-slate-500"
                    }`}>
                      #{index + 1}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {slot.class?.name || "Kelas"}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatFullIndonesianDate(slot.date)} • {formatShortTime(slot.time)} WIB
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold shrink-0 ${
                    isSakit
                      ? "bg-red-600 text-white shadow-2xs"
                      : isIjin
                      ? "bg-amber-500 text-white shadow-2xs"
                      : "bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    {isSakit ? "🤒 Sakit" : isIjin ? "📩 Ijin" : "Selesai"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
