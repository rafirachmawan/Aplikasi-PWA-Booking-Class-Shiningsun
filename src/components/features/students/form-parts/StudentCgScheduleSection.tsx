"use client";

// Dipisahkan dari StudentRegistrationForm.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, RefObject, SetStateAction } from "react";
import { DatePickerInput } from "@/components/ui/DatePickerInput";

interface ClassOption {
  id: string;
  name: string;
  max_quota?: number;
}

export interface StudentCgScheduleSectionProps {
  cgClassId: string;
  cgDate: string;
  cgDayName: string;
  cgFieldsRef: RefObject<HTMLDivElement | null>;
  cgTime: string;
  classes: ClassOption[];
  getCgRemainingSlots: (timeStr: string, classId: string) => number | null;
  isCgClassOpen: boolean;
  isCgTimeOpen: boolean;
  selectedClass: ClassOption | undefined;
  selectedSlotRemaining: number | null;
  sessionTimeGroups: { times: string[]; label: string; }[];
  setCgClassId: Dispatch<SetStateAction<string>>;
  setCgDate: Dispatch<SetStateAction<string>>;
  setCgTime: Dispatch<SetStateAction<string>>;
  setIsCgClassOpen: Dispatch<SetStateAction<boolean>>;
  setIsCgTimeOpen: Dispatch<SetStateAction<boolean>>;
}

export function StudentCgScheduleSection({
  cgClassId,
  cgDate,
  cgDayName,
  cgFieldsRef,
  cgTime,
  classes,
  getCgRemainingSlots,
  isCgClassOpen,
  isCgTimeOpen,
  selectedClass,
  selectedSlotRemaining,
  sessionTimeGroups,
  setCgClassId,
  setCgDate,
  setCgTime,
  setIsCgClassOpen,
  setIsCgTimeOpen,
}: StudentCgScheduleSectionProps) {
  return (
    <div className="animate-in fade-in duration-200 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5 space-y-3 dark:border-amber-800/50 dark:bg-amber-500/10">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
          Jadwal Sesi CG{" "}
          <span className="text-red-500" aria-hidden="true">
            *
          </span>
        </p>
        {cgDayName && (
          <span className="inline-flex items-center rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
            {cgDayName}
          </span>
        )}
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        ref={cgFieldsRef}
      >
        <div
          onClick={() => {
            setIsCgClassOpen(false);
            setIsCgTimeOpen(false);
          }}
        >
          <label
            htmlFor="cgDate"
            className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
          >
            Tanggal Sesi
          </label>
          <DatePickerInput
            id="cgDate"
            value={cgDate}
            onChange={(e) => setCgDate(e.target.value)}
            showManualInput={false}
            widePopover
          />
        </div>

        <div>
          <label
            htmlFor="cgTime"
            className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
          >
            Jam
            {selectedSlotRemaining !== null && (
              <span
                className={`ml-1 font-bold ${
                  selectedSlotRemaining <= 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-brand-600 dark:text-brand-400"
                }`}
              >
                {selectedSlotRemaining <= 0
                  ? "(Penuh)"
                  : `(Sisa ${selectedSlotRemaining})`}
              </span>
            )}
          </label>
          <div className="relative">
            <button
              type="button"
              id="cgTime"
              onClick={() => {
                setIsCgTimeOpen(!isCgTimeOpen);
                setIsCgClassOpen(false);
              }}
              aria-haspopup="listbox"
              aria-expanded={isCgTimeOpen}
              className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs text-sm min-h-11 transition-all cursor-pointer ${
                isCgTimeOpen
                  ? "border-brand-500 ring-2 ring-brand-500/30"
                  : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <span
                className={
                  cgTime
                    ? "font-semibold text-slate-800 dark:text-slate-100 truncate"
                    : "text-slate-400 truncate text-xs sm:text-sm"
                }
              >
                {cgTime || "-- Pilih Jam --"}
              </span>
              <svg
                className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${isCgTimeOpen ? "rotate-180" : ""}`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {isCgTimeOpen && (
              <div
                className={`absolute z-50 w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg max-h-52 overflow-y-auto py-1 animate-in fade-in duration-100 top-full mt-1`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setCgTime("");
                    setIsCgTimeOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 ${
                    cgTime === ""
                      ? "font-bold text-brand-600 bg-brand-50/50 dark:bg-brand-950/20"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  -- Pilih Jam --
                </button>
                {sessionTimeGroups.map((group) => (
                  <div key={group.label}>
                    <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {group.label}
                    </p>
                    {group.times.map((t) => {
                      const rem =
                        cgDate && cgClassId
                          ? getCgRemainingSlots(t, cgClassId)
                          : null;
                      const isFull = rem !== null && rem <= 0;
                      return (
                        <button
                          key={t}
                          type="button"
                          disabled={isFull}
                          onClick={() => {
                            setCgTime(t);
                            setIsCgTimeOpen(false);
                          }}
                          className={`w-full px-4 py-2 text-xs text-left transition-colors flex items-center justify-between gap-2 ${
                            isFull
                              ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          } ${
                            cgTime === t
                              ? "font-bold text-brand-600 bg-brand-50/50 dark:bg-brand-950/20"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span>{t}</span>
                          {rem !== null && (
                            <span
                              className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                                isFull
                                  ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                              }`}
                            >
                              {isFull ? "Penuh" : `Sisa ${rem}`}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="cgClassId"
            className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
          >
            Kelas
            {selectedClass && (
              <span
                className={`ml-1 font-bold ${
                  selectedSlotRemaining !== null &&
                  selectedSlotRemaining <= 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-brand-600 dark:text-brand-400"
                }`}
              >
                {selectedSlotRemaining !== null
                  ? selectedSlotRemaining <= 0
                    ? "(Penuh)"
                    : `(Sisa ${selectedSlotRemaining}/${selectedClass.max_quota || 4})`
                  : `(Max ${selectedClass.max_quota || 4})`}
              </span>
            )}
          </label>
          <div className="relative">
            <button
              type="button"
              id="cgClassId"
              disabled={classes.length === 0}
              onClick={() => {
                setIsCgClassOpen(!isCgClassOpen);
                setIsCgTimeOpen(false);
              }}
              aria-haspopup="listbox"
              aria-expanded={isCgClassOpen}
              className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs text-sm min-h-11 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                isCgClassOpen
                  ? "border-brand-500 ring-2 ring-brand-500/30"
                  : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <span
                className={
                  selectedClass
                    ? "font-semibold text-slate-800 dark:text-slate-100 truncate"
                    : "text-slate-400 truncate text-xs sm:text-sm"
                }
              >
                {selectedClass
                  ? selectedClass.name
                  : "-- Pilih Kelas --"}
              </span>
              <svg
                className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${isCgClassOpen ? "rotate-180" : ""}`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {isCgClassOpen && (
              <div
                className={`absolute z-50 w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg max-h-48 overflow-y-auto py-1 animate-in fade-in duration-100 top-full mt-1`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setCgClassId("");
                    setIsCgClassOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 ${
                    cgClassId === ""
                      ? "font-bold text-brand-600 bg-brand-50/50 dark:bg-brand-950/20"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  -- Pilih Kelas --
                </button>
                {classes.map((cls) => {
                  const maxQuota = cls.max_quota || 4;
                  const rem =
                    cgDate && cgTime
                      ? getCgRemainingSlots(cgTime, cls.id)
                      : null;
                  const isFull = rem !== null && rem <= 0;
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      disabled={isFull}
                      onClick={() => {
                        setCgClassId(cls.id);
                        setIsCgClassOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-xs text-left transition-colors flex items-center justify-between gap-2 ${
                        isFull
                          ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      } ${
                        cgClassId === cls.id
                          ? "font-bold text-brand-600 bg-brand-50/50 dark:bg-brand-950/20"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className="truncate">{cls.name}</span>
                      <span
                        className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                          isFull
                            ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                            : rem !== null
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                              : "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                        }`}
                      >
                        {isFull
                          ? "Penuh"
                          : rem !== null
                            ? `Sisa ${rem}/${maxQuota}`
                            : `Max: ${maxQuota}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {classes.length === 0 && (
            <p className="mt-1 text-[11px] font-medium text-red-600 dark:text-red-400">
              Belum ada kelas. Tambahkan kelas di menu Master Data.
            </p>
          )}
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-amber-800/80 dark:text-amber-300/80">
        Tanggal pendaftaran di atas mencatat kapan siswa
        mendaftar. Jadwal CG ini otomatis masuk ke menu Jadwal dan
        terhitung pada kuota kelas.
      </p>
    </div>
  );
}
