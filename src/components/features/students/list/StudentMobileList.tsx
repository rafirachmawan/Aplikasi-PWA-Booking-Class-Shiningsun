"use client";

// Dipisahkan dari StudentClientWrapper.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, SetStateAction } from "react";
import { Icons } from "@/components/ui/icons";
import { formatShortDate, formatNumericDate } from "@/lib/dateUtils";

export interface StudentMobileListProps {
  currentPage: number;
  displayedStudents: any[];
  endRow: number;
  getMobilePageNumbers: () => Array<number | string>;
  handleDelete: (id: string, name: string) => void;
  handlePageChange: (newPage: number) => Promise<void>;
  handleToggleActive: (id: string, name: string, currentStatus: string) => void;
  isPageLoading: boolean;
  setEditingStudent: Dispatch<any>;
  setFeedbackModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsModalOpen: Dispatch<SetStateAction<boolean>>;
  setSelectedStudentForFeedback: Dispatch<any>;
  startRow: number;
  totalFiltered: number;
  totalPages: number;
}

export function StudentMobileList({
  currentPage,
  displayedStudents,
  endRow,
  getMobilePageNumbers,
  handleDelete,
  handlePageChange,
  handleToggleActive,
  isPageLoading,
  setEditingStudent,
  setFeedbackModalOpen,
  setIsModalOpen,
  setSelectedStudentForFeedback,
  startRow,
  totalFiltered,
  totalPages,
}: StudentMobileListProps) {
  return (
    <div className="block sm:hidden space-y-3 relative pb-6">
      {isPageLoading && (
        <div className="sticky top-16 z-20 flex justify-center py-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-800 shadow-md border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-200">
            <span className="h-3.5 w-3.5 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
            Memuat halaman {currentPage}...
          </div>
        </div>
      )}
      {displayedStudents.length === 0 ? (
        <div className="py-10 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
          <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
            Belum ada data siswa untuk kategori ini.
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">
            Ubah filter atau daftarkan siswa baru.
          </p>
        </div>
      ) : (
        displayedStudents.map((person) => {
          const labelObj = Array.isArray(person.label)
            ? person.label[0]
            : person.label;

          const bDate = new Date(person.date_of_birth);
          const tDate = new Date();
          let y = tDate.getFullYear() - bDate.getFullYear();
          let m = tDate.getMonth() - bDate.getMonth();
          if (m < 0 || (m === 0 && tDate.getDate() < bDate.getDate())) {
            y--;
            m += 12;
          }
          if (tDate.getDate() < bDate.getDate()) {
            m--;
            if (m < 0) {
              m += 12;
            }
          }
          const ageText =
            y === 0 && m === 0 ? "Baru lahir" : `${y} Thn ${m} Bln`;

          return (
            <div
              key={person.id}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 p-4 relative overflow-hidden"
              style={
                labelObj
                  ? { borderLeft: `4px solid ${labelObj.hex_color}` }
                  : {}
              }
            >
              <div className="flex justify-between items-start mb-3 relative z-10">
                <div className="flex-1 pr-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-1.5 flex-wrap">
                    <span>{person.name}</span>
                    {person.nickname ? (
                      <span className="font-normal text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        ( {person.nickname} )
                      </span>
                    ) : null}
                    {person.gender === "Perempuan" ? (
                      <span className="inline-flex items-center rounded-lg px-1.5 py-0.5 text-[9px] font-bold bg-pink-600 text-white">
                        P
                      </span>
                    ) : person.gender === "Laki-laki" ? (
                      <span className="inline-flex items-center rounded-lg px-1.5 py-0.5 text-[9px] font-bold bg-blue-600 text-white">
                        L
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-lg px-1.5 py-0.5 text-[9px] font-semibold bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                        Belum ada
                      </span>
                    )}
                    <span className="font-normal text-slate-900 dark:text-white whitespace-nowrap">
                      ( {ageText} )
                    </span>
                  </h3>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                    {labelObj ? (
                      <span className="flex items-center gap-1.5 font-medium">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: labelObj.hex_color }}
                        ></span>
                        {labelObj.main_level} - {labelObj.sub_level}
                      </span>
                    ) : (
                      <span>Tidak ada tingkat</span>
                    )}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-bold ring-1 ring-inset ${
                    person.status === "REGISTERED"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/20"
                      : person.status === "CG"
                        ? "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/20"
                        : "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-500/20"
                  }`}
                >
                  {person.status === "REGISTERED"
                    ? "Reguler"
                    : person.status === "CG"
                      ? "CG"
                      : "Nonaktif"}
                </span>
              </div>

              {person.status === "CG" && person.cg_schedule && (
                <div className="mb-3 flex items-center gap-1.5 rounded-xl border border-amber-200/70 bg-amber-50/70 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 dark:border-amber-800/40 dark:bg-amber-500/10 dark:text-amber-300 relative z-10">
                  <Icons.calendar className="w-3.5 h-3.5 shrink-0" />
                  <span
                    className="truncate"
                    title={`Jadwal CG: ${formatShortDate(person.cg_schedule.date)} · ${person.cg_schedule.time} · ${person.cg_schedule.class_name}`}
                  >
                    Jadwal CG: {formatShortDate(person.cg_schedule.date)} ·{" "}
                    {person.cg_schedule.time} ·{" "}
                    {person.cg_schedule.class_name}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 dark:text-zinc-400 mb-4 relative z-10 bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-zinc-500 mb-0.5">
                    Tgl Lahir
                  </span>
                  <span className="block font-medium text-slate-700 dark:text-zinc-200">
                    {formatNumericDate(person.date_of_birth)}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-zinc-500 mb-0.5">
                    Tgl Masuk
                  </span>
                  <span className="block font-medium text-slate-700 dark:text-zinc-200">
                    {formatNumericDate(person.registration_date)}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-zinc-500 mb-0.5">
                    Poin
                  </span>
                  <span className="block font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                    {person.points || 0} Poin
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 relative z-10 border-t border-slate-200 dark:border-zinc-800 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudentForFeedback(person);
                    setFeedbackModalOpen(true);
                  }}
                  className="flex-1 py-2.5 px-2 text-xs font-semibold rounded-xl bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25 transition-colors text-center ring-1 ring-brand-200/50 dark:ring-brand-800/50 min-h-11 flex items-center justify-center gap-1 cursor-pointer"
                >
                  Feedback
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleToggleActive(person.id, person.name, person.status)
                  }
                  className={`flex-1 py-2.5 px-2 text-xs font-semibold rounded-xl transition-colors text-center ring-1 min-h-11 flex items-center justify-center cursor-pointer ${
                    person.status === "INACTIVE"
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ring-emerald-200/50 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25 dark:ring-emerald-800/50"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 ring-slate-200/50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:ring-zinc-700"
                  }`}
                >
                  {person.status === "INACTIVE" ? "Aktifkan" : "Nonaktifkan"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingStudent(person);
                    setIsModalOpen(true);
                  }}
                  className="flex-1 py-2.5 px-2 text-xs font-semibold rounded-xl bg-brand-600 text-white hover:bg-brand-700 active:translate-y-px transition-colors text-center min-h-11 flex items-center justify-center cursor-pointer"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(person.id, person.name)}
                  className="flex-1 py-2.5 px-2 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-900 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-500/10 active:translate-y-px transition-colors text-center min-h-11 flex items-center justify-center cursor-pointer"
                >
                  Hapus
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* Mobile Pagination Footer */}
      {totalFiltered > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-3 shadow-sm">
          {/* Info Bar */}
          <div className="flex items-center justify-between gap-2 px-0.5">
            <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
              Menampilkan{" "}
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                {startRow}–{endRow}
              </span>{" "}
              dari{" "}
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                {totalFiltered}
              </span>{" "}
              siswa
            </p>
            {totalPages > 1 && (
              <span className="inline-flex shrink-0 items-center rounded-lg bg-brand-50 dark:bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:text-brand-300 ring-1 ring-inset ring-brand-200/60 dark:ring-brand-800/50 tabular-nums">
                Hal. {currentPage}/{totalPages}
              </span>
            )}
          </div>

          {/* Compact Navigation: ‹ [1 2 3 … 15] › */}
          {totalPages > 1 && (
            <div className="mt-2.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isPageLoading}
                aria-label="Halaman sebelumnya"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors hover:bg-slate-100 dark:hover:bg-zinc-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="mx-auto flex w-max items-center gap-1">
                  {getMobilePageNumbers().map((item, idx) =>
                    typeof item === "string" ? (
                      <span
                        key={`mob-ellipsis-${idx}`}
                        aria-hidden="true"
                        className="px-0.5 text-xs font-semibold text-slate-400 dark:text-zinc-500"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={`mob-page-${item}`}
                        type="button"
                        onClick={() => handlePageChange(item)}
                        disabled={isPageLoading}
                        aria-current={
                          item === currentPage ? "page" : undefined
                        }
                        className={`h-9 min-w-9 shrink-0 rounded-xl px-2 text-xs font-bold transition-colors cursor-pointer tabular-nums ${
                          item === currentPage
                            ? "bg-brand-600 text-white shadow-sm shadow-brand-500/25"
                            : "text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95"
                        }`}
                      >
                        {item}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isPageLoading}
                aria-label="Halaman berikutnya"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-500/20 transition-colors hover:bg-brand-700 active:scale-95 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
              >
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
