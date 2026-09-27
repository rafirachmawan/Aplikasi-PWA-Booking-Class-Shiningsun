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
  const [activeTab, setActiveTab] = useState<"upcoming" | "history">(
    "upcoming",
  );

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm p-4 sm:p-6 space-y-5">
      {/* Header & Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border-b border-slate-200 dark:border-zinc-800 pb-4">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Jadwal Kelas Anak
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Pantau sesi kelas mendatang dan riwayat kehadiran anak.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex w-full sm:w-auto p-1 rounded-xl bg-slate-100 dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-xs font-bold transition-colors text-center cursor-pointer tabular-nums ${
              activeTab === "upcoming"
                ? "bg-white dark:bg-zinc-900 text-brand-700 dark:text-brand-300 shadow-sm"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Sesi Mendatang ({upcomingSchedules.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-xs font-bold transition-colors text-center cursor-pointer tabular-nums ${
              activeTab === "history"
                ? "bg-white dark:bg-zinc-900 text-brand-700 dark:text-brand-300 shadow-sm"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
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
            <div className="py-10 text-center bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-700 p-6">
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                Belum ada jadwal kelas mendatang yang terdaftar.
              </p>
            </div>
          ) : (
            upcomingSchedules.map((slot) => {
              const dayName = formatShortDate(slot.date).split(",")[0];
              const dateNum = new Date(slot.date).getDate() || "";

              return (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800 gap-3"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Calendar Badge */}
                    <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider leading-none">
                        {dayName}
                      </span>
                      <span className="text-base sm:text-lg font-bold leading-none mt-1 tabular-nums">
                        {dateNum}
                      </span>
                    </div>

                    {/* Info — nama kelas disembunyikan dari portal ortu */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 flex-wrap">
                        <span className="font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-500/15 px-2 py-0.5 rounded-lg tabular-nums">
                          {formatShortTime(slot.time)} WIB
                        </span>
                        <span className="font-medium text-slate-600 dark:text-zinc-300">
                          {formatShortDate(slot.date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 shrink-0 whitespace-nowrap">
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
            <div className="py-10 text-center bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-700 p-6">
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                Belum ada riwayat sesi kelas yang berlalu.
              </p>
            </div>
          ) : (
            scheduleHistory.map((slot, index) => {
              const slotStr =
                `${slot.status || ""} ${slot.note || ""} ${slot.class?.name || ""}`.toLowerCase();
              const isSakit = slotStr.includes("sakit");
              const isIjin =
                !isSakit &&
                (slotStr.includes("ijin") || slotStr.includes("izin"));

              return (
                <div
                  key={slot.id || index}
                  className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border gap-3 ${
                    isSakit
                      ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-800/50"
                      : isIjin
                        ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800/50"
                        : "bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs tabular-nums ${
                        isSakit
                          ? "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300"
                          : "bg-slate-200/70 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400"
                      }`}
                    >
                      #{index + 1}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        {formatFullIndonesianDate(slot.date)} •{" "}
                        {formatShortTime(slot.time)} WIB
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${
                      isSakit
                        ? "bg-red-600 text-white"
                        : isIjin
                          ? "bg-amber-500 text-white"
                          : "bg-slate-200/70 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {isSakit ? "Sakit" : isIjin ? "Ijin" : "Selesai"}
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
