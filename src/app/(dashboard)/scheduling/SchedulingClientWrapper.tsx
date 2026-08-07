"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import {
  autoBookStudentToClass,
  bookStudentManual,
  removeStudentBooking,
  bulkRemoveStudentBookings,
  copyScheduleToNextMonth,
  moveStudentBooking,
} from "@/lib/actions";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ChangeLabelModal } from "@/components/features/students/ChangeLabelModal";
import { formatShortDate } from "@/lib/dateUtils";
import { DatePickerInput } from "@/components/ui/DatePickerInput";

interface SchedulingClientWrapperProps {
  students: any[];
  classes: any[];
  schedules: any[];
  currentMonth: number;
  currentYear: number;
}

export function SchedulingClientWrapper({
  students,
  classes,
  schedules,
  currentMonth,
  currentYear,
}: SchedulingClientWrapperProps) {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<"auto" | "manual">("auto");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentId, setStudentId] = useState("");

  // Change Label Modal state
  const [editingStudentForLabel, setEditingStudentForLabel] = useState<any>(null);
  const [labelsList, setLabelsList] = useState<any[]>([]);

  const handleOpenChangeLabel = async (student: any) => {
    setEditingStudentForLabel(student);
    if (labelsList.length === 0) {
      const { getLabels } = await import("@/lib/actions");
      const lbls = await getLabels();
      setLabelsList(lbls);
    }
  };

  // Custom Student Dropdown States
  const [isOpenStudentDropdown, setIsOpenStudentDropdown] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const studentDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside for student dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        studentDropdownRef.current &&
        !studentDropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpenStudentDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Custom Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "warning";
    message: string;
  }>({ isOpen: false, type: "success", message: "" });

  const showAlert = (
    type: "success" | "error" | "warning",
    message: string,
  ) => {
    setModalConfig({ isOpen: true, type, message });
  };

  // Delete Booking Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    slotId: string;
    studentId: string;
    label: string;
  }>({ isOpen: false, slotId: "", studentId: "", label: "" });
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteBooking = async () => {
    if (!deleteConfirm.slotId || !deleteConfirm.studentId) return;
    setIsDeleting(true);
    try {
      await removeStudentBooking(deleteConfirm.slotId, deleteConfirm.studentId);
      setDeleteConfirm({ isOpen: false, slotId: "", studentId: "", label: "" });
      showAlert("success", "Jadwal berhasil dihapus.");
      router.refresh();
    } catch (error: any) {
      showAlert("error", error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Edit Booking Modal State
  const [editModal, setEditModal] = useState({
    isOpen: false,
    slotId: "",
    date: "",
    time: "",
    classId: "",
    label: "",
  });
  const [isEditing, setIsEditing] = useState(false);

  const handleEditBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.slotId || !studentId) return;
    setIsEditing(true);
    try {
      await moveStudentBooking(
        studentId,
        editModal.slotId,
        editModal.classId,
        editModal.date,
        editModal.time,
      );
      setEditModal({ ...editModal, isOpen: false });
      showAlert("success", "Jadwal berhasil diperbarui.");
      router.refresh();
    } catch (error: any) {
      showAlert("error", error.message);
    } finally {
      setIsEditing(false);
    }
  };

  // Bulk Action Modal States
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<{
    isOpen: boolean;
    studentSchedules: any[];
  }>({ isOpen: false, studentSchedules: [] });
  const [copyConfirm, setCopyConfirm] = useState(false);

  // Bulk Actions Execution
  const executeBulkDelete = async () => {
    if (!studentId || bulkDeleteConfirm.studentSchedules.length === 0) return;

    setIsSubmitting(true);
    setBulkDeleteConfirm({ isOpen: false, studentSchedules: [] });
    try {
      const slotIds = bulkDeleteConfirm.studentSchedules.map((s) => s.id);
      await bulkRemoveStudentBookings(studentId, slotIds);
      showAlert("success", "Semua jadwal di bulan ini berhasil dihapus.");
      router.refresh();
    } catch (error: any) {
      showAlert("error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeCopyToNextMonth = async () => {
    if (!studentId) return;

    setIsSubmitting(true);
    setCopyConfirm(false);
    try {
      const res = await copyScheduleToNextMonth(
        studentId,
        currentYear,
        currentMonth,
      );
      if (res.totalBooked === 0) {
        showAlert(
          "error",
          "Gagal! Semua sesi untuk bulan depan sudah penuh atau siswa sudah terdaftar.",
        );
      } else if (res.failedDates.length > 0) {
        const datesFormatted = res.failedDates
          .map((d: string) => formatShortDate(d))
          .join(", ");
        showAlert(
          "warning",
          `Berhasil menyalin ${res.totalBooked} sesi. Namun ada jadwal yang gagal karena penuh pada: ${datesFormatted}.`,
        );
      } else {
        showAlert(
          "success",
          `Berhasil menyalin jadwal. Total ${res.totalBooked} sesi didaftarkan untuk bulan depan.`,
        );
      }
      router.refresh();
    } catch (error: any) {
      showAlert("error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto Mode State
  const [autoSchedules, setAutoSchedules] = useState([
    {
      startDate: new Date().toISOString().split("T")[0],
      time: "08:00",
      classId: "",
    },
  ]);

  // Manual Mode State
  const [manualDate, setManualDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [manualTime, setManualTime] = useState("08:00");
  const [manualClassId, setManualClassId] = useState("");

  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const timeSlots = [
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
  ];

  useEffect(() => {
    setIsSubmitting(false);
  }, [currentMonth, currentYear]);

  const handleMonthChange = (offset: number) => {
    setIsSubmitting(true);
    let newMonth = currentMonth + offset;
    let newYear = currentYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    router.push(`?month=${newMonth}&year=${newYear}`);
  };

  const getRemainingSlots = (
    dateStr: string,
    time: string,
    classId: string,
  ) => {
    if (!dateStr || !classId) return null;
    const cls = classes.find((c) => c.id === classId);
    const maxQuota = cls?.max_quota || 4;
    const slot = schedules.find(
      (s) =>
        s.date.split("T")[0] === dateStr &&
        s.time.substring(0, 5) === time &&
        s.class_id === classId,
    );
    if (!slot) return maxQuota;
    return maxQuota - (slot.bookings ? slot.bookings.length : 0);
  };

  const handleAutoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;

    // Validasi
    const isValid = autoSchedules.every((s) => s.classId !== "");
    if (!isValid) {
      showAlert("warning", "Harap lengkapi pilihan kelas untuk semua jadwal.");
      return;
    }

    setIsSubmitting(true);
    try {
      let totalBooked = 0;
      let allFailedDates: string[] = [];
      for (const schedule of autoSchedules) {
        const res = await autoBookStudentToClass(
          studentId,
          schedule.classId,
          schedule.startDate,
          schedule.time,
        );
        totalBooked += res.bookedCount;
        if (res.failedDates.length > 0) {
          allFailedDates.push(...res.failedDates);
        }
      }

      if (totalBooked === 0) {
        showAlert(
          "error",
          "Gagal! Semua kelas di tanggal tersebut sudah penuh atau siswa sudah terdaftar.",
        );
      } else if (allFailedDates.length > 0) {
        const datesFormatted = allFailedDates
          .map((d) => formatShortDate(d))
          .join(", ");
        showAlert(
          "warning",
          `Berhasil mendaftarkan ${totalBooked} sesi. Namun ada jadwal yang gagal karena penuh pada: ${datesFormatted}.`,
        );
        setStudentId("");
        setAutoSchedules([
          {
            startDate: new Date().toISOString().split("T")[0],
            time: "08:00",
            classId: "",
          },
        ]);
      } else {
        showAlert(
          "success",
          `Berhasil! Siswa telah didaftarkan ke total ${totalBooked} sesi kelas baru.`,
        );
        setStudentId("");
        setAutoSchedules([
          {
            startDate: new Date().toISOString().split("T")[0],
            time: "08:00",
            classId: "",
          },
        ]);
      }
      router.refresh();
    } catch (error: any) {
      showAlert("error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addAutoScheduleRow = () => {
    setAutoSchedules([
      ...autoSchedules,
      {
        startDate: new Date().toISOString().split("T")[0],
        time: "08:00",
        classId: "",
      },
    ]);
  };

  const removeAutoScheduleRow = (index: number) => {
    if (autoSchedules.length > 1) {
      const newSchedules = [...autoSchedules];
      newSchedules.splice(index, 1);
      setAutoSchedules(newSchedules);
    }
  };

  const updateAutoSchedule = (index: number, field: string, value: any) => {
    const newSchedules = [...autoSchedules];
    (newSchedules[index] as any)[field] = value;
    setAutoSchedules(newSchedules);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !manualClassId || !manualDate || !manualTime) return;

    setIsSubmitting(true);
    try {
      await bookStudentManual(studentId, manualClassId, manualDate, manualTime);
      showAlert("success", "Siswa berhasil didaftarkan ke sesi tersebut!");
      setStudentId("");
      router.refresh();
    } catch (error: any) {
      showAlert("error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStudent = students.find((s) => s.id === studentId);
  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()),
  );

  return (
    <>
      {isSubmitting && <LoadingSpinner usePortal={true} />}

      <div className="bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-900/5 sm:rounded-xl overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex">
          <button
            onClick={() => setActiveMode("auto")}
            className={`flex-1 py-4 text-sm font-semibold transition-colors border-b-2 ${
              activeMode === "auto"
                ? "border-brand-500 text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Otomatis (Bulanan)
          </button>
          <button
            onClick={() => setActiveMode("manual")}
            className={`flex-1 py-4 text-sm font-semibold transition-colors border-b-2 ${
              activeMode === "manual"
                ? "border-brand-500 text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Manual (Pilih 1 Sesi)
          </button>
        </div>

        <div className="p-6">
          {/* Month Navigator */}
          {(() => {
            const prevM = currentMonth === 1 ? 12 : currentMonth - 1;
            const prevY = currentMonth === 1 ? currentYear - 1 : currentYear;
            const nextM = currentMonth === 12 ? 1 : currentMonth + 1;
            const nextY = currentMonth === 12 ? currentYear + 1 : currentYear;
            return (
              <div className="mb-6 flex items-center justify-between bg-white dark:bg-slate-900 p-2 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <a
                  href={`/scheduling?month=${prevM}&year=${prevY}`}
                  className="px-3 py-2.5 sm:px-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all flex items-center gap-2 text-sm font-medium min-h-[44px] min-w-[44px] justify-center active:bg-slate-200 dark:active:bg-slate-700 cursor-pointer"
                  title="Bulan Sebelumnya"
                >
                  <Icons.chevronLeft className="w-5 h-5 shrink-0" />
                  <span className="hidden sm:inline">Bulan Sebelumnya</span>
                </a>
                <div className="font-bold text-base sm:text-lg text-slate-800 dark:text-slate-200 text-center px-2 select-none">
                  {monthNames[currentMonth - 1]} {currentYear}
                </div>
                <a
                  href={`/scheduling?month=${nextM}&year=${nextY}`}
                  className="px-3 py-2.5 sm:px-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all flex items-center gap-2 text-sm font-medium min-h-[44px] min-w-[44px] justify-center active:bg-slate-200 dark:active:bg-slate-700 cursor-pointer"
                  title="Bulan Berikutnya"
                >
                  <span className="hidden sm:inline">Bulan Berikutnya</span>
                  <Icons.chevronRight className="w-5 h-5 shrink-0" />
                </a>
              </div>
            );
          })()}

          {/* Global Student Selector */}
          <div className="mb-8 p-4 bg-brand-50 dark:bg-brand-500/10 rounded-xl border border-brand-100 dark:border-brand-500/20">
            <label className="block text-sm font-semibold text-brand-900 dark:text-brand-100 mb-2">
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
                  className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-24 py-3 text-slate-900 dark:text-white text-sm font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all cursor-pointer min-h-[48px]"
                />

                <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                  {selectedStudent && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                        selectedStudent.status === "REGISTERED"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          : selectedStudent.status === "CG"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
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
                      className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-md transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
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
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-h-[40px] min-w-[40px] flex items-center justify-center"
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
                <div className="absolute z-50 mt-1.5 w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-2 animate-in fade-in slide-in-from-top-1 duration-100">
                  {/* Options List */}
                  <div className="max-h-[220px] overflow-y-auto space-y-1">
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
                              }
                            }}
                            className={`w-full px-3 py-2.5 text-xs text-left rounded-lg transition-colors flex items-center justify-between min-h-[44px] ${
                              isInactive
                                ? "opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-800/30"
                                : "hover:bg-brand-50/70 dark:hover:bg-brand-950/40 active:bg-brand-100 dark:active:bg-brand-900/60 cursor-pointer " +
                                  (isSelected
                                    ? "font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/30"
                                    : "text-slate-700 dark:text-slate-300")
                            }`}
                          >
                            <div className="truncate pr-2 flex flex-col">
                              <span
                                className={`font-medium ${isSelected ? "text-brand-700 dark:text-brand-300 font-semibold" : isInactive ? "text-slate-500 dark:text-slate-400" : ""}`}
                              >
                                {s.name}
                              </span>
                              {isInactive && (
                                <span className="text-[9px] text-red-500 dark:text-red-400 font-medium mt-0.5">
                                  *Siswa nonaktif
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                s.status === "REGISTERED"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                  : s.status === "CG"
                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                                    : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
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
              <div className="mt-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-brand-200/80 dark:border-brand-500/30 shadow-2xs flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                    Level Siswa:
                  </span>
                  {selectedStudent.label ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs"
                      style={{ borderLeft: `3px solid ${selectedStudent.label.hex_color}` }}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: selectedStudent.label.hex_color }}
                      />
                      {selectedStudent.label.main_level} - {selectedStudent.label.sub_level}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                      Belum Memiliki Level
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenChangeLabel(selectedStudent)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white transition-all shadow-xs cursor-pointer active:scale-[0.98]"
                >
                  <Icons.edit className="w-3.5 h-3.5" />
                  <span>Ganti Level</span>
                </button>
              </div>
            )}

            {/* Tampilkan Jadwal Siswa yang Terdaftar */}
            {studentId && (
              <div className="mt-4 pt-4 border-t border-brand-200 dark:border-brand-500/30">
                <h4 className="text-sm font-medium text-brand-800 dark:text-brand-200 mb-2">
                  Jadwal Terdaftar (Bulan {monthNames[currentMonth - 1]}):
                </h4>
                {(() => {
                  const studentSchedules = schedules.filter((s) =>
                    s.bookings?.some((b: any) => b.student_id === studentId),
                  );

                  if (studentSchedules.length === 0) {
                    return (
                      <p className="text-xs text-brand-600/70 dark:text-brand-300/70 italic">
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
                          className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl hover:bg-brand-700 shadow-2xs transition-colors flex items-center justify-center gap-2"
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
                          className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-2xs transition-colors flex items-center justify-center gap-2"
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
                              className="flex items-center justify-between p-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs gap-2"
                            >
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                  <Icons.calendar className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                                  {hari}, {tgl} {monthNames[currentMonth - 1]}
                                </span>
                                <span className="text-brand-600 dark:text-brand-400 font-bold bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 rounded-md">
                                  {slot.time.substring(0, 5)}
                                </span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">
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
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/20 transition-colors"
                                  title="Edit jadwal ini"
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
                                  className="p-1.5 rounded-lg bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/40 transition-colors"
                                  title="Hapus jadwal ini"
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

          {activeMode === "auto" ? (
            <form
              onSubmit={handleAutoSubmit}
              className="space-y-6 animate-in slide-in-from-left-4"
            >
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="space-y-3 mt-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Pilih Jadwal Rutin
                  </label>
                  {autoSchedules.map((schedule, index) => {
                    // Helper untuk menampilkan hari dari tanggal
                    const dateObj = new Date(schedule.startDate);
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

                    return (
                      <div
                        key={index}
                        className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800"
                      >
                        <div className="flex-1 min-w-[150px]">
                          <div className="flex items-center justify-between mb-1.5 px-1">
                            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Tanggal
                            </label>
                            {hari && (
                              <span className="text-[10px] font-bold text-brand-700 dark:text-brand-400 bg-brand-100 dark:bg-brand-900/30 px-2 py-0.5 rounded shadow-sm">
                                {hari}
                              </span>
                            )}
                          </div>
                          <DatePickerInput
                            required
                            value={schedule.startDate}
                            onChange={(e) =>
                              updateAutoSchedule(
                                index,
                                "startDate",
                                e.target.value,
                              )
                            }
                          />
                        </div>

                        <div className="flex-1 min-w-[120px]">
                          <div className="flex items-center justify-between mb-1.5 px-1">
                            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Jam Sesi
                              {schedule.classId &&
                                schedule.startDate &&
                                schedule.time &&
                                (() => {
                                  const r = getRemainingSlots(
                                    schedule.startDate,
                                    schedule.time,
                                    schedule.classId,
                                  );
                                  return r !== null ? (
                                    <span className="text-brand-600 dark:text-brand-400 font-bold ml-1 normal-case">
                                      (Sisa {r})
                                    </span>
                                  ) : null;
                                })()}
                            </label>
                          </div>
                          <div className="relative">
                            <select
                              value={schedule.time}
                              onChange={(e) =>
                                updateAutoSchedule(
                                  index,
                                  "time",
                                  e.target.value,
                                )
                              }
                              className="appearance-none block w-full rounded-xl border-slate-200 bg-white pl-4 pr-10 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white cursor-pointer"
                            >
                              {timeSlots.map((t) => {
                                const rem = schedule.classId
                                  ? getRemainingSlots(
                                      schedule.startDate,
                                      t,
                                      schedule.classId,
                                    )
                                  : null;
                                const isFull = rem !== null && rem <= 0;
                                const labelText =
                                  rem !== null
                                    ? isFull
                                      ? `${t}-${String(parseInt(t) + 1).padStart(2, "0")}:00 (Penuh)`
                                      : `${t}-${String(parseInt(t) + 1).padStart(2, "0")}:00 (Sisa ${rem})`
                                    : `${t}-${String(parseInt(t) + 1).padStart(2, "0")}:00`;

                                return (
                                  <option key={t} value={t} disabled={isFull}>
                                    {labelText}
                                  </option>
                                );
                              })}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                              <svg
                                className="h-4 w-4 text-slate-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2.5"
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div className="flex-[2] min-w-[150px]">
                          <div className="flex items-center justify-between mb-1.5 px-1">
                            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Tipe Kelas
                            </label>
                          </div>
                          <div className="relative">
                            <select
                              required
                              value={schedule.classId}
                              onChange={(e) =>
                                updateAutoSchedule(
                                  index,
                                  "classId",
                                  e.target.value,
                                )
                              }
                              className="appearance-none block w-full rounded-xl border-slate-200 bg-white pl-4 pr-10 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white cursor-pointer"
                            >
                              <option value="" disabled>
                                -- Pilih Tipe Kelas --
                              </option>
                              {classes.map((c) => {
                                const rem =
                                  schedule.startDate && schedule.time
                                    ? getRemainingSlots(
                                        schedule.startDate,
                                        schedule.time,
                                        c.id,
                                      )
                                    : null;
                                const labelText =
                                  rem !== null
                                    ? `${c.name} (Sisa ${rem}/${c.max_quota})`
                                    : `${c.name} (Max: ${c.max_quota})`;
                                return (
                                  <option
                                    key={c.id}
                                    value={c.id}
                                    disabled={rem !== null && rem <= 0}
                                  >
                                    {labelText}
                                  </option>
                                );
                              })}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                              <svg
                                className="h-4 w-4 text-slate-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2.5"
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {autoSchedules.length > 1 && (
                          <div className="self-end pb-1.5">
                            <button
                              type="button"
                              onClick={() => removeAutoScheduleRow(index)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full transition-colors"
                              title="Hapus Jadwal"
                            >
                              <Icons.close className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={addAutoScheduleRow}
                  className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  <Icons.add className="w-4 h-4" /> Tambah Jadwal Lainnya
                </button>

                <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                  Sistem akan secara otomatis membuatkan jadwal hingga akhir
                  bulan berdasarkan Tanggal yang Anda pilih pada baris di atas.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !studentId}
                className="w-full flex justify-center py-3 px-4 rounded-xl shadow-sm text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
              >
                {isSubmitting ? "Memproses Data..." : "Jalankan Auto-Booking"}
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleManualSubmit}
              className="space-y-6 animate-in slide-in-from-right-4"
            >
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <Icons.calendar className="w-4 h-4" /> Langkah 2: Pilih Sesi
                  Manual
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    {(() => {
                      const d = new Date(manualDate);
                      const manualHari = isNaN(d.getTime())
                        ? ""
                        : [
                            "Minggu",
                            "Senin",
                            "Selasa",
                            "Rabu",
                            "Kamis",
                            "Jumat",
                            "Sabtu",
                          ][d.getDay()];
                      return (
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Tanggal
                          </label>
                          {manualHari && (
                            <span className="text-[11px] font-bold text-brand-700 dark:text-brand-400 bg-brand-100 dark:bg-brand-900/30 px-2.5 py-0.5 rounded-md shadow-sm">
                              {manualHari}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    <DatePickerInput
                      required
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Pilih Jam
                      {manualClassId &&
                        manualDate &&
                        manualTime &&
                        (() => {
                          const r = getRemainingSlots(
                            manualDate,
                            manualTime,
                            manualClassId,
                          );
                          return r !== null ? (
                            <span className="text-brand-600 dark:text-brand-400 font-bold ml-1">
                              (Sisa {r})
                            </span>
                          ) : null;
                        })()}
                    </label>
                    <div className="relative">
                      <select
                        required
                        value={manualTime}
                        onChange={(e) => setManualTime(e.target.value)}
                        className="appearance-none block w-full rounded-xl border-slate-200 bg-white pl-4 pr-10 py-3 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white cursor-pointer"
                      >
                        <option value="" disabled>
                          -- Pilih Jam --
                        </option>
                        {timeSlots.map((t) => {
                          const rem = manualClassId
                            ? getRemainingSlots(manualDate, t, manualClassId)
                            : null;
                          const isFull = rem !== null && rem <= 0;
                          const labelText =
                            rem !== null
                              ? isFull
                                ? `${t}-${String(parseInt(t) + 1).padStart(2, "0")}:00 (Penuh)`
                                : `${t}-${String(parseInt(t) + 1).padStart(2, "0")}:00 (Sisa ${rem})`
                              : `${t}-${String(parseInt(t) + 1).padStart(2, "0")}:00`;

                          return (
                            <option key={t} value={t} disabled={isFull}>
                              {labelText}
                            </option>
                          );
                        })}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <svg
                          className="h-4 w-4 text-slate-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Pilih Kelas
                    </label>
                    <div className="relative">
                      <select
                        required
                        value={manualClassId}
                        onChange={(e) => setManualClassId(e.target.value)}
                        className="appearance-none block w-full rounded-xl border-slate-200 bg-white pl-4 pr-10 py-3 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white cursor-pointer"
                      >
                        <option value="" disabled>
                          -- Pilih Tipe Kelas --
                        </option>
                        {classes.map((c) => {
                          const rem =
                            manualDate && manualTime
                              ? getRemainingSlots(manualDate, manualTime, c.id)
                              : null;
                          const labelText =
                            rem !== null
                              ? `${c.name} (Sisa ${rem}/${c.max_quota})`
                              : `${c.name} (Max: ${c.max_quota})`;
                          return (
                            <option
                              key={c.id}
                              value={c.id}
                              disabled={rem !== null && rem <= 0}
                            >
                              {labelText}
                            </option>
                          );
                        })}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <svg
                          className="h-4 w-4 text-slate-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Sistem akan secara otomatis membuatkan kotak jadwal di
                  kalender jika belum ada, lalu mendaftarkan siswa ke kelas
                  tersebut.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !studentId || !manualClassId}
                className="w-full flex justify-center py-3 px-4 rounded-xl shadow-sm text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                {isSubmitting ? "Memproses Data..." : "Booking Sesi Ini"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Custom Notification Modal */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            <div className="p-6 text-center">
              {modalConfig.type === "success" && (
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/10 mb-4">
                  <svg
                    className="h-7 w-7 text-emerald-600 dark:text-emerald-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                </div>
              )}
              {modalConfig.type === "warning" && (
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/10 mb-4">
                  <svg
                    className="h-7 w-7 text-amber-600 dark:text-amber-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              )}
              {modalConfig.type === "error" && (
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10 mb-4">
                  <svg
                    className="h-7 w-7 text-red-600 dark:text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              )}

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {modalConfig.type === "success"
                  ? "Berhasil!"
                  : modalConfig.type === "warning"
                    ? "Perhatian"
                    : "Terjadi Kesalahan"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {modalConfig.message}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4">
              <button
                onClick={() =>
                  setModalConfig({ ...modalConfig, isOpen: false })
                }
                className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Booking Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="p-1.5 bg-brand-50 dark:bg-brand-500/10 rounded-lg text-brand-600 dark:text-brand-400">
                  <Icons.edit className="w-5 h-5" />
                </span>
                Edit Jadwal
              </h3>
              <button
                onClick={() => setEditModal({ ...editModal, isOpen: false })}
                className="text-slate-400 hover:text-slate-500 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Icons.close className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleEditBooking}
              className="flex-1 overflow-y-auto p-6 space-y-4"
            >
              <div className="mb-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Jadwal Lama
                </p>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {editModal.label}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Tanggal Baru
                </label>
                <DatePickerInput
                  required
                  value={editModal.date}
                  onChange={(e) =>
                    setEditModal({ ...editModal, date: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Jam Sesi Baru
                  {editModal.classId &&
                    editModal.date &&
                    editModal.time &&
                    (() => {
                      const r = getRemainingSlots(
                        editModal.date,
                        editModal.time,
                        editModal.classId,
                      );
                      return r !== null ? (
                        <span className="text-brand-600 dark:text-brand-400 font-bold ml-1">
                          (Sisa {r})
                        </span>
                      ) : null;
                    })()}
                </label>
                <div className="relative">
                  <select
                    required
                    value={editModal.time}
                    onChange={(e) =>
                      setEditModal({ ...editModal, time: e.target.value })
                    }
                    className="appearance-none block w-full rounded-xl border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white cursor-pointer"
                  >
                    <option value="" disabled>
                      -- Pilih Jam --
                    </option>
                    {timeSlots.map((t) => {
                      const rem = editModal.classId
                        ? getRemainingSlots(
                            editModal.date,
                            t,
                            editModal.classId,
                          )
                        : null;
                      const isFull = rem !== null && rem <= 0;
                      const labelText =
                        rem !== null
                          ? isFull
                            ? `${t}-${String(parseInt(t) + 1).padStart(2, "0")}:00 (Penuh)`
                            : `${t}-${String(parseInt(t) + 1).padStart(2, "0")}:00 (Sisa ${rem})`
                          : `${t}-${String(parseInt(t) + 1).padStart(2, "0")}:00`;

                      return (
                        <option key={t} value={t} disabled={isFull}>
                          {labelText}
                        </option>
                      );
                    })}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg
                      className="h-4 w-4 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Kelas Baru
                </label>
                <div className="relative">
                  <select
                    required
                    value={editModal.classId}
                    onChange={(e) =>
                      setEditModal({ ...editModal, classId: e.target.value })
                    }
                    className="appearance-none block w-full rounded-xl border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white cursor-pointer"
                  >
                    <option value="" disabled>
                      -- Pilih Tipe Kelas --
                    </option>
                    {classes.map((c) => {
                      const rem =
                        editModal.date && editModal.time
                          ? getRemainingSlots(
                              editModal.date,
                              editModal.time,
                              c.id,
                            )
                          : null;
                      const labelText =
                        rem !== null
                          ? `${c.name} (Sisa ${rem}/${c.max_quota})`
                          : `${c.name} (Max: ${c.max_quota})`;
                      return (
                        <option
                          key={c.id}
                          value={c.id}
                          disabled={rem !== null && rem <= 0}
                        >
                          {labelText}
                        </option>
                      );
                    })}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg
                      className="h-4 w-4 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={
                    isEditing ||
                    !editModal.date ||
                    !editModal.time ||
                    !editModal.classId
                  }
                  className="w-full flex justify-center py-2.5 px-4 rounded-xl shadow-sm text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
                >
                  {isEditing ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Booking Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10 mb-4">
                <Icons.trash className="h-7 w-7 text-red-600 dark:text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Hapus Jadwal Siswa?
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                Apakah Anda yakin ingin menghapus jadwal berikut?
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <Icons.calendar className="w-3 h-3 text-brand-500" />
                {deleteConfirm.label}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex gap-3">
              <button
                onClick={() =>
                  setDeleteConfirm({
                    isOpen: false,
                    slotId: "",
                    studentId: "",
                    label: "",
                  })
                }
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteBooking}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Delete Booking Confirmation Modal */}
      {bulkDeleteConfirm.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10 mb-4">
                <Icons.trash className="h-7 w-7 text-red-600 dark:text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Hapus Semua Jadwal?
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                Apakah Anda yakin ingin menghapus semua (
                {bulkDeleteConfirm.studentSchedules.length}) jadwal di bulan ini
                untuk siswa ini?
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex gap-3">
              <button
                onClick={() =>
                  setBulkDeleteConfirm({ isOpen: false, studentSchedules: [] })
                }
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={executeBulkDelete}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? "Menghapus..." : "Ya, Hapus Semua"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy To Next Month Modal */}
      {copyConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-500/10 mb-4">
                <Icons.calendar className="h-7 w-7 text-brand-600 dark:text-brand-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Salin Jadwal ke Bulan Depan?
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                Apakah Anda yakin ingin menyalin pola jadwal bulan ini ke bulan
                depan?
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex gap-3">
              <button
                onClick={() => setCopyConfirm(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={executeCopyToNextMonth}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? "Memproses..." : "Ya, Salin"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ChangeLabelModal
        isOpen={!!editingStudentForLabel}
        onClose={() => setEditingStudentForLabel(null)}
        student={editingStudentForLabel}
        labels={labelsList}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </>
  );
}
