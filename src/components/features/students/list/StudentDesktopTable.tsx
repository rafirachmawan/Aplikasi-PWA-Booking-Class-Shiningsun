"use client";

// Dipisahkan dari StudentClientWrapper.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, SetStateAction } from "react";
import { Icons } from "@/components/ui/icons";
import { formatShortDate, formatNumericDate } from "@/lib/dateUtils";

export interface StudentDesktopTableProps {
  currentPage: number;
  displayedStudents: any[];
  endRow: number;
  getVisiblePageNumbers: () => Array<number | string>;
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

export function StudentDesktopTable({
  currentPage,
  displayedStudents,
  endRow,
  getVisiblePageNumbers,
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
}: StudentDesktopTableProps) {
  return (
    <div className="hidden sm:block bg-white dark:bg-zinc-900 shadow-sm border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden relative">
      {isPageLoading && (
        <div className="absolute inset-0 z-20 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-[1px] flex items-center justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-zinc-800 shadow-md border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-200">
            <span className="h-4 w-4 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
            Memuat halaman {currentPage}...
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-brand-100 dark:bg-zinc-800">
              <th
                scope="col"
                className="border-b-2 border-brand-300/80 py-3.5 pl-4 pr-3 text-left text-[11px] font-bold uppercase tracking-wider text-brand-800 dark:border-zinc-700 dark:text-zinc-200 sm:pl-6"
              >
                Nama Lengkap
              </th>
              <th
                scope="col"
                className="border-b-2 border-brand-300/80 px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-brand-800 dark:border-zinc-700 dark:text-zinc-200"
              >
                Status
              </th>
              <th
                scope="col"
                className="border-b-2 border-brand-300/80 px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-brand-800 dark:border-zinc-700 dark:text-zinc-200"
              >
                Tingkat Level
              </th>
              <th
                scope="col"
                className="border-b-2 border-brand-300/80 px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-brand-800 dark:border-zinc-700 dark:text-zinc-200"
              >
                Poin Kehadiran
              </th>
              <th
                scope="col"
                className="border-b-2 border-brand-300/80 px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-brand-800 dark:border-zinc-700 dark:text-zinc-200"
              >
                Tgl Lahir &amp; Usia
              </th>
              <th
                scope="col"
                className="border-b-2 border-brand-300/80 px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-brand-800 dark:border-zinc-700 dark:text-zinc-200"
              >
                Tgl Masuk
              </th>
              <th
                scope="col"
                className="border-b-2 border-brand-300/80 py-3.5 pl-3 pr-4 text-right text-[11px] font-bold uppercase tracking-wider text-brand-800 dark:border-zinc-700 dark:text-zinc-200 sm:pr-6"
              >
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
            {displayedStudents.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
                    Belum ada data siswa untuk kategori ini.
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">
                    Ubah filter atau daftarkan siswa baru.
                  </p>
                </td>
              </tr>
            ) : (
              displayedStudents.map((person) => {
                const labelObj = Array.isArray(person.label)
                  ? person.label[0]
                  : person.label;

                // Hitung umur secara instan untuk display
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
                  <tr
                    key={person.id}
                    className="transition-[filter,background-color] duration-150 hover:brightness-95 dark:hover:brightness-110"
                    style={
                      labelObj
                        ? {
                            backgroundColor: `${labelObj.hex_color}10`,
                            borderLeft: `4px solid ${labelObj.hex_color}`,
                          }
                        : {}
                    }
                  >
                    <td className="max-w-70 whitespace-nowrap py-3.5 pl-4 pr-3 align-middle text-sm font-semibold text-slate-900 dark:text-white sm:pl-6">
                      <div className="flex items-center gap-2">
                        <span className="truncate" title={person.name}>
                          {person.name}
                        </span>
                        {person.nickname ? (
                          <span className="text-slate-400 dark:text-slate-500">
                            ({person.nickname})
                          </span>
                        ) : null}
                        {person.gender === "Perempuan" ? (
                          <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold bg-pink-600 text-white">
                            P
                          </span>
                        ) : person.gender === "Laki-laki" ? (
                          <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold bg-blue-600 text-white">
                            L
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                            Belum ada
                          </span>
                        )}
                      </div>
                      {person.status === "CG" && person.cg_schedule && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                          <Icons.calendar className="w-3 h-3 shrink-0" />
                          <span
                            className="max-w-56 truncate"
                            title={`Jadwal CG: ${formatShortDate(person.cg_schedule.date)} · ${person.cg_schedule.time} · ${person.cg_schedule.class_name}`}
                          >
                            {formatShortDate(person.cg_schedule.date)} ·{" "}
                            {person.cg_schedule.time} ·{" "}
                            {person.cg_schedule.class_name}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 align-middle text-sm">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                          person.status === "REGISTERED"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20"
                            : person.status === "CG"
                              ? "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20"
                              : "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-500/20"
                        }`}
                      >
                        {person.status === "REGISTERED"
                          ? "Reguler"
                          : person.status === "CG"
                            ? "CG"
                            : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 align-middle text-sm text-slate-500 dark:text-slate-400">
                      {labelObj ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: labelObj.hex_color,
                            }}
                          ></div>
                          <span className="truncate">
                            {labelObj.main_level} - {labelObj.sub_level}
                          </span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 align-middle text-sm font-bold text-amber-700 dark:text-amber-300">
                      <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-800/50 px-2.5 py-1 rounded-lg text-xs tabular-nums">
                        {person.points || 0} Poin
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 align-middle text-sm text-slate-500 dark:text-slate-400">
                      <div>{formatNumericDate(person.date_of_birth)}</div>
                      <div className="text-xs text-slate-400 font-semibold">
                        {ageText}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 align-middle text-sm text-slate-500 dark:text-slate-400">
                      {formatNumericDate(person.registration_date)}
                    </td>
                    <td className="whitespace-nowrap py-3.5 pl-3 pr-4 align-middle sm:pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedStudentForFeedback(person);
                            setFeedbackModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 ring-1 ring-brand-200/60 transition-colors dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25 dark:ring-brand-800/50 cursor-pointer"
                        >
                          Feedback
                        </button>
                        <button
                          onClick={() =>
                            handleToggleActive(
                              person.id,
                              person.name,
                              person.status,
                            )
                          }
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors ring-1 cursor-pointer ${
                            person.status === "INACTIVE"
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ring-emerald-200/60 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25 dark:ring-emerald-800/50"
                              : "bg-slate-50 text-slate-600 hover:bg-slate-100 ring-slate-200/60 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:ring-zinc-700"
                          }`}
                        >
                          {person.status === "INACTIVE"
                            ? "Aktifkan"
                            : "Nonaktifkan"}
                          <span className="sr-only">, {person.name}</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingStudent(person);
                            setIsModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 ring-1 ring-brand-200/60 transition-colors dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25 dark:ring-brand-800/50 cursor-pointer"
                        >
                          Edit
                          <span className="sr-only">, {person.name}</span>
                        </button>
                        <button
                          onClick={() => handleDelete(person.id, person.name)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold bg-red-50 text-red-600 hover:bg-red-100 ring-1 ring-red-200/60 transition-colors dark:bg-red-500/15 dark:text-red-400 dark:hover:bg-red-500/25 dark:ring-red-800/50 cursor-pointer"
                        >
                          Hapus
                          <span className="sr-only">, {person.name}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Desktop Pagination Footer */}
      {totalFiltered > 0 && (
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/80 px-4 py-3.5 sm:px-6">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400">
            Menampilkan{" "}
            <span className="font-bold text-slate-900 dark:text-white">
              {startRow}–{endRow}
            </span>{" "}
            dari{" "}
            <span className="font-bold text-slate-900 dark:text-white">
              {totalFiltered}
            </span>{" "}
            siswa{" "}
            <span className="text-slate-400 dark:text-zinc-500">
              (Halaman {currentPage} dari {totalPages})
            </span>
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isPageLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ‹ Sebelumnya
            </button>
            {getVisiblePageNumbers().map((item, idx) =>
              typeof item === "string" ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-xs font-semibold text-slate-400 dark:text-zinc-500"
                >
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => handlePageChange(item)}
                  disabled={isPageLoading}
                  className={`min-w-8 h-8 px-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    item === currentPage
                      ? "bg-brand-600 text-white shadow-sm"
                      : "border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700"
                  }`}
                >
                  {item}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isPageLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Selanjutnya ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
