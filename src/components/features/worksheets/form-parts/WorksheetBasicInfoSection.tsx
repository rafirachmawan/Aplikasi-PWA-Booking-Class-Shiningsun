"use client";

// Dipisahkan dari WorksheetFormModal.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";
import { normalizeClientTime } from "../worksheetFormUtils";
import { Icons } from "@/components/ui/icons";

type AttendanceStatus =
    | "HADIR"
    | "IJIN"
    | "SAKIT"
    | "LIBUR"
    | "LIBUR_HARI_BESAR";

export interface WorksheetBasicInfoSectionProps {
  activeStudent: any;
  activeStudentName: any;
  attendanceStatus: AttendanceStatus;
  bulanKe: string;
  bulanKeDropdownRef: RefObject<HTMLDivElement | null>;
  calendarPickerRef: RefObject<HTMLDivElement | null>;
  currentCalendarMonth: number;
  currentCalendarYear: number;
  effectiveLockedStudentId: string;
  filteredStudents: any[];
  filteredTeachers: any[];
  getCalendarDays: () => ReactNode;
  handleAttendanceChange: (status: AttendanceStatus) => void;
  initialData: any;
  isAbsent: boolean;
  isBulanKeDropdownOpen: boolean;
  isCalendarPickerOpen: boolean;
  isDateLocked: boolean;
  isEditing: boolean;
  isStudentDropdownOpen: boolean;
  manualBulanKe: string;
  manualScheduleTime: any;
  MONTH_NAMES: string[];
  openCalendarPicker: () => void;
  openDropdown: string | null;
  scheduleClassName: string | undefined;
  scheduleSlotId: string | undefined;
  scheduleTime: string | undefined;
  setBulanKe: Dispatch<SetStateAction<string>>;
  setCurrentCalendarMonth: Dispatch<SetStateAction<number>>;
  setCurrentCalendarYear: Dispatch<SetStateAction<number>>;
  setIsBulanKeDropdownOpen: Dispatch<SetStateAction<boolean>>;
  setIsStudentDropdownOpen: Dispatch<SetStateAction<boolean>>;
  setManualBulanKe: Dispatch<SetStateAction<string>>;
  setManualScheduleTime: Dispatch<any>;
  setOpenDropdown: Dispatch<SetStateAction<string | null>>;
  setStudentId: Dispatch<any>;
  setStudentSearch: Dispatch<SetStateAction<string>>;
  setTeacherSearch: Dispatch<SetStateAction<string>>;
  setTtdGuru: Dispatch<any>;
  studentDropdownRef: RefObject<HTMLDivElement | null>;
  studentId: any;
  studentSearch: string;
  studentSearchInputRef: RefObject<HTMLInputElement | null>;
  teachers: any[];
  teacherSearch: string;
  teacherSearchInputRef: RefObject<HTMLInputElement | null>;
  ttdGuru: any;
  workSheetDateDisplay: any;
}

export function WorksheetBasicInfoSection({
  activeStudent,
  activeStudentName,
  attendanceStatus,
  bulanKe,
  bulanKeDropdownRef,
  calendarPickerRef,
  currentCalendarMonth,
  currentCalendarYear,
  effectiveLockedStudentId,
  filteredStudents,
  filteredTeachers,
  getCalendarDays,
  handleAttendanceChange,
  initialData,
  isAbsent,
  isBulanKeDropdownOpen,
  isCalendarPickerOpen,
  isDateLocked,
  isEditing,
  isStudentDropdownOpen,
  manualBulanKe,
  manualScheduleTime,
  MONTH_NAMES,
  openCalendarPicker,
  openDropdown,
  scheduleClassName,
  scheduleSlotId,
  scheduleTime,
  setBulanKe,
  setCurrentCalendarMonth,
  setCurrentCalendarYear,
  setIsBulanKeDropdownOpen,
  setIsStudentDropdownOpen,
  setManualBulanKe,
  setManualScheduleTime,
  setOpenDropdown,
  setStudentId,
  setStudentSearch,
  setTeacherSearch,
  setTtdGuru,
  studentDropdownRef,
  studentId,
  studentSearch,
  studentSearchInputRef,
  teachers,
  teacherSearch,
  teacherSearchInputRef,
  ttdGuru,
  workSheetDateDisplay,
}: WorksheetBasicInfoSectionProps) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3.5 sm:p-4 space-y-3.5 sm:space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-[11px] font-extrabold shrink-0">
          1
        </span>
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Info Dasar
        </span>
      </div>
      {(scheduleTime || scheduleClassName) && !isEditing && (
        <div className="px-3 py-2 rounded-xl bg-sky-50 text-sky-800 text-[11px] font-bold border border-sky-200/70 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-900/50">
          📅 Jadwal: {workSheetDateDisplay}
          {normalizeClientTime(scheduleTime) &&
            ` • Jam ${normalizeClientTime(scheduleTime)}`}
          {scheduleClassName && ` • ${scheduleClassName}`}
        </div>
      )}

      {/* Student */}
      {!isEditing ? (
        <div className="relative" ref={studentDropdownRef}>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Siswa <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!effectiveLockedStudentId && studentId) {
                // Locked - prevent any interaction
                return;
              }
              setIsStudentDropdownOpen(!isStudentDropdownOpen);
            }}
            disabled={!!(effectiveLockedStudentId && studentId)}
            className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:outline-none shadow-xs transition-colors ${
              effectiveLockedStudentId && studentId
                ? "bg-slate-100 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600 cursor-not-allowed opacity-60"
                : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 cursor-pointer"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 flex items-center justify-center font-extrabold text-xs shrink-0">
                {activeStudent?.name
                  ? activeStudent.name.charAt(0).toUpperCase()
                  : "👤"}
              </span>
              <span className="truncate font-bold text-xs sm:text-sm">
                {activeStudentName}
              </span>
            </div>
            <Icons.chevronDown
              className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                isStudentDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown Menu - only show if not locked */}
          {isStudentDropdownOpen && !effectiveLockedStudentId && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="relative">
                <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  ref={studentSearchInputRef}
                  type="text"
                  placeholder="Cari siswa..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  autoFocus
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                {filteredStudents.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">
                    Siswa tidak ditemukan
                  </div>
                ) : (
                  filteredStudents.map((s) => {
                    const isSelected = s.id === studentId;
                    const initial = s.name.charAt(0).toUpperCase();

                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setStudentId(s.id);
                          setIsStudentDropdownOpen(false);
                          setStudentSearch("");
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? "bg-brand-50 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300 font-bold border border-brand-200/80 dark:border-brand-800/50"
                            : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                              isSelected
                                ? "bg-brand-600 text-white"
                                : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {initial}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate text-xs">
                              {s.name}{" "}
                              {s.nickname ? `(${s.nickname})` : ""}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-brand-600 dark:text-brand-400 font-bold shrink-0 text-xs">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Nama Siswa
          </label>
          <div className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-500 shrink-0"></span>
            <span>{activeStudentName}</span>
          </div>
        </div>
      )}

      {/* Status Kehadiran Siswa */}
      <div>
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
          <span>Status Kehadiran Siswa</span>
          {isAbsent && (
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
              Materi Dikunci
            </span>
          )}
        </label>
        {/* Opsi Libur dihapus — saat tanggal merah sistem mengisi otomatis */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            {
              id: "HADIR",
              label: "Hadir",
              icon: "✅",
              color:
                "peer-checked:bg-emerald-50 peer-checked:border-emerald-500 peer-checked:text-emerald-700 dark:peer-checked:bg-emerald-950/50 dark:peer-checked:text-emerald-300",
            },
            {
              id: "IJIN",
              label: "Ijin",
              icon: "📝",
              color:
                "peer-checked:bg-amber-50 peer-checked:border-amber-500 peer-checked:text-amber-700 dark:peer-checked:bg-amber-950/50 dark:peer-checked:text-amber-300",
            },
            {
              id: "SAKIT",
              label: "Sakit",
              icon: "🤒",
              color:
                "peer-checked:bg-rose-50 peer-checked:border-rose-500 peer-checked:text-rose-700 dark:peer-checked:bg-rose-950/50 dark:peer-checked:text-rose-300",
            },
          ].map((st) => (
            <label key={st.id} className="relative cursor-pointer">
              <input
                type="radio"
                name="attendance_status"
                value={st.id}
                checked={attendanceStatus === st.id}
                onChange={() =>
                  handleAttendanceChange(st.id as AttendanceStatus)
                }
                className="sr-only peer"
              />
              <div
                className={`p-2.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 ${st.color}`}
              >
                <span className="text-sm">{st.icon}</span>
                <span>{st.label}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Date Input - Text with Calendar Picker */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
          Tanggal *
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={openCalendarPicker}
            disabled={isDateLocked}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none shadow-xs text-left ${
              isDateLocked
                ? "opacity-60 cursor-not-allowed"
                : "hover:bg-slate-50 dark:hover:bg-slate-700/80 cursor-pointer"
            }`}
            title="Tanggal dikunci"
          >
            <span className="font-semibold truncate">
              {workSheetDateDisplay || "Pilih tanggal"}
            </span>
            <Icons.calendar className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
          {isDateLocked && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
              {scheduleSlotId || initialData?.schedule_slot_id
                ? "Tanggal mengikuti jadwal — salah jadwal? Hapus laporan ini dan isi ulang dari jadwal yang benar."
                : "Tanggal dikunci. Untuk mengisi tanggal lain, buka lewat jadwal/overdue tanggal tersebut."}
            </p>
          )}

          {/* Custom calendar date picker (mobile-friendly) */}
          {isCalendarPickerOpen && (
            <div
              ref={calendarPickerRef}
              className="absolute z-200 mt-2 w-72 max-w-[90vw] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 animate-in fade-in slide-in-from-top-2 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                  {MONTH_NAMES[currentCalendarMonth]}{" "}
                  {currentCalendarYear}
                </h4>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentCalendarMonth === 0) {
                        setCurrentCalendarMonth(11);
                        setCurrentCalendarYear(currentCalendarYear - 1);
                      } else {
                        setCurrentCalendarMonth(currentCalendarMonth - 1);
                      }
                    }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentCalendarMonth === 11) {
                        setCurrentCalendarMonth(0);
                        setCurrentCalendarYear(currentCalendarYear + 1);
                      } else {
                        setCurrentCalendarMonth(currentCalendarMonth + 1);
                      }
                    }}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day Headers */}
                {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(
                  (day) => (
                    <div
                      key={day}
                      className="text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center py-1"
                    >
                      {day}
                    </div>
                  ),
                )}

                {/* Days */}
                {getCalendarDays()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Jam Sesi (Opsional untuk kasus 1 siswa 2 sesi jam beda di tanggal sama) */}
      {!scheduleTime && !isEditing && (
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
            Jam Sesi Kelas{" "}
            <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
              (Opsional — kosongkan jika hari ini hanya 1 sesi)
            </span>
          </label>
          <input
            type="time"
            value={manualScheduleTime}
            onChange={(e) => setManualScheduleTime(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none shadow-xs"
          />
          <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
            Format 24 jam (mis. 14:00 untuk jam 2 siang). Salah isi membuat
            laporan dianggap belum menutup jadwal.
          </p>
        </div>
      )}

      {/* Teacher Name */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
          Nama Guru Sesi <span className="text-red-500">*</span>
        </label>
        {teachers.length > 0 ? (
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setOpenDropdown(openDropdown === "guru" ? null : "guru")
              }
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700/80 cursor-pointer text-left"
            >
              <span className="truncate">
                {ttdGuru ? `👩‍🏫 ${ttdGuru}` : "-- Pilih Guru --"}
              </span>
              <Icons.chevronDown
                className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${openDropdown === "guru" ? "rotate-180" : ""}`}
              />
            </button>

            {openDropdown === "guru" && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Search input for Teacher */}
                <div className="p-1">
                  <input
                    ref={teacherSearchInputRef}
                    type="text"
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    placeholder="🔍 Cari nama guru..."
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 focus:outline-none font-medium"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>

                <div className="max-h-44 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
                  {filteredTeachers.length === 0 ? (
                    <div className="py-3 text-center text-xs text-slate-400 italic">
                      Tidak ada guru yang cocok.
                    </div>
                  ) : (
                    filteredTeachers.map((t) => {
                      const isSel = ttdGuru === t.name;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setTtdGuru(t.name);
                            setOpenDropdown(null);
                            setTeacherSearch("");
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                            isSel
                              ? "bg-brand-50 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300 font-extrabold"
                              : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                          }`}
                        >
                          <span>👩‍🏫 {t.name}</span>
                          {isSel && (
                            <span className="text-brand-600 shrink-0 text-xs font-bold">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <input
            type="text"
            value={ttdGuru}
            onChange={(e) => setTtdGuru(e.target.value)}
            placeholder="Cth: Miss Sarah"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-400"
          />
        )}
      </div>

      {/* Bulan Ke - Dropdown 1-10 + Manual */}
      <div className="space-y-1.5" ref={bulanKeDropdownRef}>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
          Bulan ke- <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() =>
                setIsBulanKeDropdownOpen(!isBulanKeDropdownOpen)
              }
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700/80 cursor-pointer text-left ${
                bulanKe
                  ? "border-sky-300 dark:border-sky-700 text-sky-900 dark:text-sky-300"
                  : "border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              }`}
            >
              <span>
                {bulanKe ? `📅 Bulan ke-${bulanKe}` : "-- Pilih Bulan --"}
              </span>
              <Icons.chevronDown
                className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isBulanKeDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isBulanKeDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-sky-200 dark:border-sky-800 p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150 max-h-60 overflow-y-auto custom-scrollbar">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setBulanKe(num.toString());
                      setManualBulanKe("");
                      setIsBulanKeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      bulanKe === num.toString()
                        ? "bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                        : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    📅 Bulan ke-{num}
                    {bulanKe === num.toString() && (
                      <span className="text-sky-600 shrink-0 text-xs font-bold">
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="number"
            value={manualBulanKe}
            onChange={(e) => setManualBulanKe(e.target.value)}
            placeholder="Manual"
            className="w-24 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none shadow-xs placeholder:text-slate-400"
          />
        </div>
      </div>
    </div>
  );
}
