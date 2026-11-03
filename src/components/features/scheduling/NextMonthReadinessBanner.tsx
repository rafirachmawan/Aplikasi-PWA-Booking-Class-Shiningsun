"use client";

// Dipisahkan dari SchedulingClientWrapper.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, SetStateAction } from "react";

export interface NextMonthReadinessBannerProps {
  copyingGapId: string | null;
  currentMonth: number;
  gapStudents: any[];
  handleGapCopy: (gapStudentId: string, gapStudentName: string) => Promise<void>;
  isGapOpen: boolean;
  monthNames: string[];
  nextMonth: number;
  nextYear: number;
  setIsGapOpen: Dispatch<SetStateAction<boolean>>;
}

export function NextMonthReadinessBanner({
  copyingGapId,
  currentMonth,
  gapStudents,
  handleGapCopy,
  isGapOpen,
  monthNames,
  nextMonth,
  nextYear,
  setIsGapOpen,
}: NextMonthReadinessBannerProps) {
  return (
    <div className="mb-8 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setIsGapOpen(!isGapOpen)}
        aria-expanded={isGapOpen}
        className="w-full flex items-center justify-between gap-2 cursor-pointer"
      >
        <span className="text-sm font-semibold text-slate-900 dark:text-white">
          Kesiapan {monthNames[nextMonth - 1]} {nextYear}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
              gapStudents.length === 0
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
                : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50"
            }`}
          >
            {gapStudents.length === 0
              ? "Semua terjadwal"
              : `${gapStudents.length} belum terjadwal`}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-slate-400 transition-transform duration-200 ${isGapOpen ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {isGapOpen &&
        (gapStudents.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400 italic">
            Semua siswa aktif sudah memiliki jadwal di{" "}
            {monthNames[nextMonth - 1]}.
          </p>
        ) : (
          <>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
              Siswa berikut belum punya satu pun sesi di{" "}
              {monthNames[nextMonth - 1]}. Salin dari{" "}
              {monthNames[currentMonth - 1]} agar tidak ada yang terlewat.
            </p>
            <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
              {gapStudents.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700"
                >
                  <div className="truncate min-w-0">
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">
                      {s.name}
                      {s.nickname ? (
                        <span className="text-slate-400 dark:text-zinc-500 font-normal ml-1">
                          ({s.nickname})
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-lg ${
                        s.status === "REGISTERED"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                      }`}
                    >
                      {s.status === "REGISTERED" ? "Reguler" : "CG"}
                    </span>
                    <button
                      type="button"
                      disabled={copyingGapId !== null}
                      onClick={() => handleGapCopy(s.id, s.name)}
                      className="px-3 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl hover:bg-brand-700 active:translate-y-[1px] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {copyingGapId === s.id ? "Menyalin..." : "Salin"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ))}
    </div>
  );
}
