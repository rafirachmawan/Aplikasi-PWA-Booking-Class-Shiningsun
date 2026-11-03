"use client";

// Dipisahkan dari SchedulingClientWrapper.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, RefObject, SetStateAction } from "react";
import { Icons } from "@/components/ui/icons";

export interface SchedulingStudentSelectorProps {
  currentMonth: number;
  filteredStudents: any[];
  handleOpenChangeLabel: (student: any) => Promise<void>;
  isOpenStudentDropdown: boolean;
  monthNames: string[];
  rememberRecentStudent: (id: string) => void;
  schedules: any[];
  selectedStudent: any;
  setBulkDeleteConfirm: Dispatch<SetStateAction<{ isOpen: boolean; studentSchedules: any[]; }>>;
  setCopyConfirm: Dispatch<SetStateAction<boolean>>;
  setDeleteConfirm: Dispatch<SetStateAction<{ isOpen: boolean; slotId: string; studentId: string; label: string; }>>;
  setEditModal: Dispatch<SetStateAction<{ isOpen: boolean; slotId: string; date: string; time: string; classId: string; label: string; }>>;
  setIsOpenStudentDropdown: Dispatch<SetStateAction<boolean>>;
  setStudentId: Dispatch<SetStateAction<string>>;
  setStudentSearchQuery: Dispatch<SetStateAction<string>>;
  studentDropdownRef: RefObject<HTMLDivElement | null>;
  studentId: string;
  studentSearchQuery: string;
}

export function SchedulingStudentSelector({
  currentMonth,
  filteredStudents,
  handleOpenChangeLabel,
  isOpenStudentDropdown,
  monthNames,
  rememberRecentStudent,
  schedules,
  selectedStudent,
  setBulkDeleteConfirm,
  setCopyConfirm,
  setDeleteConfirm,
  setEditModal,
  setIsOpenStudentDropdown,
  setStudentId,
  setStudentSearchQuery,
  studentDropdownRef,
  studentId,
  studentSearchQuery,
}: SchedulingStudentSelectorProps) {
  return (
    <div className="mb-8 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
        Langkah 1: Pilih Siswa
      </label>

      {/* Custom Searchable Input Dropdown */}
      <div className="relative" ref={studentDropdownRef}>
        <div className="relative flex items-center">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Icons.search className="h-4 w-4" />
          </div>

          <input
            type="text"
            placeholder="-- Cari dan Pilih Siswa --"
            value={
              isOpenStudentDropdown
                ? studentSearchQuery
                : selectedStudent
                  ? selectedStudent.name
                  : ""
            }
            onFocus={() => {
              setIsOpenStudentDropdown(true);
              setStudentSearchQuery("");
            }}
            onChange={(e) => {
              setStudentSearchQuery(e.target.value);
              if (!isOpenStudentDropdown) setIsOpenStudentDropdown(true);
            }}
            className="block w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-10 pr-24 py-3 text-slate-900 dark:text-white text-sm font-medium placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors cursor-pointer min-h-12"
          />

          <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
            {selectedStudent && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                  selectedStudent.status === "REGISTERED"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
                    : selectedStudent.status === "CG"
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50"
                      : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {selectedStudent.status === "REGISTERED"
                  ? "Reguler"
                  : selectedStudent.status === "CG"
                    ? "CG"
                    : "Nonaktif"}
              </span>
            )}

            {selectedStudent ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setStudentId("");
                  setStudentSearchQuery("");
                  setIsOpenStudentDropdown(false);
                }}
                className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-md transition-colors min-h-10 min-w-10 flex items-center justify-center"
                title="Hapus pilihan"
              >
                <Icons.close className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsOpenStudentDropdown(!isOpenStudentDropdown);
                  if (!isOpenStudentDropdown) setStudentSearchQuery("");
                }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-h-10 min-w-10 flex items-center justify-center"
              >
                <svg
                  className={`h-4 w-4 transition-transform duration-200 ${isOpenStudentDropdown ? "rotate-180" : ""}`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {isOpenStudentDropdown && (
          <div className="absolute z-50 mt-1.5 w-full rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl p-2">
            {/* Options List */}
            <div className="max-h-55 overflow-y-auto space-y-1">
              {filteredStudents.length === 0 ? (
                <div className="px-3 py-3 text-xs text-slate-400 italic text-center">
                  Siswa tidak ditemukan
                </div>
              ) : (
                filteredStudents.map((s) => {
                  const isInactive = s.status === "INACTIVE";
                  const isSelected = studentId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={isInactive}
                      onClick={() => {
                        if (!isInactive) {
                          setStudentId(s.id);
                          setStudentSearchQuery(s.name);
                          setIsOpenStudentDropdown(false);
                          rememberRecentStudent(s.id);
                        }
                      }}
                      className={`w-full px-3 py-2.5 text-xs text-left rounded-xl transition-colors flex items-center justify-between min-h-11 ${
                        isInactive
                          ? "opacity-60 cursor-not-allowed bg-slate-50 dark:bg-zinc-800/40"
                          : "hover:bg-brand-50 dark:hover:bg-brand-500/15 active:bg-brand-100 cursor-pointer " +
                            (isSelected
                              ? "font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-500/15"
                              : "text-slate-700 dark:text-zinc-300")
                      }`}
                    >
                      <div className="truncate pr-2 flex flex-col">
                        <span
                          className={`font-medium ${isSelected ? "text-brand-700 dark:text-brand-300 font-semibold" : isInactive ? "text-slate-500 dark:text-zinc-400" : ""}`}
                        >
                          {s.name}
                          {s.nickname ? (
                            <span className="text-slate-400 dark:text-zinc-500 font-normal ml-1">
                              ({s.nickname})
                            </span>
                          ) : null}
                        </span>
                        {isInactive && (
                          <span className="text-[9px] text-red-600 dark:text-red-400 font-medium mt-0.5">
                            Siswa nonaktif
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-lg shrink-0 ${
                          s.status === "REGISTERED"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                            : s.status === "CG"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                              : "bg-slate-200 text-slate-600 dark:bg-zinc-700 dark:text-zinc-400"
                        }`}
                      >
                        {s.status === "REGISTERED"
                          ? "Reguler"
                          : s.status === "CG"
                            ? "CG"
                            : "Nonaktif"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Level Siswa & Button Ganti Level */}
      {selectedStudent && (
        <div className="mt-3 p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-800 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 shrink-0">
              Level Siswa:
            </span>
            {selectedStudent.label ? (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700"
                style={{
                  borderLeft: `3px solid ${selectedStudent.label.hex_color}`,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: selectedStudent.label.hex_color,
                  }}
                />
                {selectedStudent.label.main_level} -{" "}
                {selectedStudent.label.sub_level}
              </span>
            ) : (
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800/50">
                Belum Memiliki Level
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleOpenChangeLabel(selectedStudent)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-zinc-900 hover:bg-brand-50 dark:hover:bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/50 transition-colors cursor-pointer active:translate-y-[1px]"
          >
            <Icons.edit className="w-3.5 h-3.5" />
            <span>Ganti Level</span>
          </button>
        </div>
      )}

      {/* Tampilkan Jadwal Siswa yang Terdaftar */}
      {studentId && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-zinc-100 mb-2">
            Jadwal Terdaftar (Bulan {monthNames[currentMonth - 1]}):
          </h4>
          {(() => {
            const studentSchedules = schedules.filter((s) =>
              s.bookings?.some((b: any) => b.student_id === studentId),
            );

            if (studentSchedules.length === 0) {
              return (
                <p className="text-xs text-slate-500 dark:text-zinc-400 italic">
                  Belum ada jadwal untuk siswa ini di bulan{" "}
                  {monthNames[currentMonth - 1]}.
                </p>
              );
            }

            return (
              <>
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setCopyConfirm(true)}
                    className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl hover:bg-brand-700 active:translate-y-[1px] transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Icons.calendar className="w-3.5 h-3.5" />
                    <span>Gunakan jadwal untuk bulan depan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBulkDeleteConfirm({
                        isOpen: true,
                        studentSchedules,
                      })
                    }
                    className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold bg-white dark:bg-zinc-900 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 active:translate-y-[1px] transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Icons.trash className="w-3.5 h-3.5" />
                    <span>Hapus semua</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {studentSchedules.map((slot) => {
                    const dateObj = new Date(slot.date);
                    const hari = isNaN(dateObj.getTime())
                      ? ""
                      : [
                          "Minggu",
                          "Senin",
                          "Selasa",
                          "Rabu",
                          "Kamis",
                          "Jumat",
                          "Sabtu",
                        ][dateObj.getDay()];
                    const tgl = isNaN(dateObj.getTime())
                      ? ""
                      : dateObj.getDate();
                    const jadwalLabel = `${hari}, ${tgl} ${monthNames[currentMonth - 1]} | ${slot.time.substring(0, 5)} | ${slot.class?.name}`;

                    return (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between p-2.5 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 gap-2"
                      >
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                          <span className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                            <Icons.calendar className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                            {hari}, {tgl} {monthNames[currentMonth - 1]}
                          </span>
                          <span className="text-brand-700 dark:text-brand-300 font-bold bg-brand-50 dark:bg-brand-500/15 px-2 py-0.5 rounded-lg tabular-nums">
                            {slot.time.substring(0, 5)}
                          </span>
                          <span className="font-bold text-slate-700 dark:text-zinc-300">
                            {slot.class?.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setEditModal({
                                isOpen: true,
                                slotId: slot.id,
                                date: slot.date,
                                time: slot.time,
                                classId: slot.class_id,
                                label: jadwalLabel,
                              })
                            }
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/15 transition-colors cursor-pointer"
                            title="Edit jadwal ini"
                            aria-label="Edit jadwal ini"
                          >
                            <Icons.edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteConfirm({
                                isOpen: true,
                                slotId: slot.id,
                                studentId: studentId,
                                label: jadwalLabel,
                              })
                            }
                            className="p-1.5 rounded-lg bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/25 transition-colors cursor-pointer"
                            title="Hapus jadwal ini"
                            aria-label="Hapus jadwal ini"
                          >
                            <Icons.trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
