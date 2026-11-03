"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
import { StudentScheduleDetailModal } from "../../../components/features/scheduling/StudentScheduleDetailModal";
import { SchedulingNotificationModal } from "../../../components/features/scheduling/SchedulingNotificationModal";
import { ManualBookingForm } from "../../../components/features/scheduling/ManualBookingForm";
import { AutoBookingForm } from "../../../components/features/scheduling/AutoBookingForm";
import { SchedulingStudentSelector } from "../../../components/features/scheduling/SchedulingStudentSelector";
import { NextMonthReadinessBanner } from "../../../components/features/scheduling/NextMonthReadinessBanner";

interface SchedulingClientWrapperProps {
  students: any[];
  classes: any[];
  schedules: any[];
  nextMonthScheduledIds: string[];
  currentMonth: number;
  currentYear: number;
}

// Key localStorage riwayat siswa terakhir dipilih di dropdown penjadwalan
const RECENT_STUDENTS_KEY = "shiningsun_recent_students_scheduling";

export function SchedulingClientWrapper({
  students,
  classes,
  schedules,
  nextMonthScheduledIds,
  currentMonth,
  currentYear,
}: SchedulingClientWrapperProps) {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<"auto" | "manual">("auto");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentId, setStudentId] = useState("");

  // Change Label Modal state
  const [editingStudentForLabel, setEditingStudentForLabel] =
    useState<any>(null);
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

  // Riwayat siswa terakhir dipilih: paling baru di atas; tanpa riwayat = alfabet
  const [recentStudentIds, setRecentStudentIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_STUDENTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((x): x is string => typeof x === "string");
        }
      }
    } catch {
      // Abaikan jika localStorage tidak tersedia
    }
    return [];
  });

  const rememberRecentStudent = (id: string) => {
    setRecentStudentIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 10);
      try {
        localStorage.setItem(RECENT_STUDENTS_KEY, JSON.stringify(next));
      } catch {
        // Abaikan
      }
      return next;
    });
  };

  // Custom dropdown Tipe Kelas (per baris jadwal rutin)
  const [openClassIdx, setOpenClassIdx] = useState<number | null>(null);
  const [classTypeSearch, setClassTypeSearch] = useState("");
  const classTypeSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (openClassIdx !== null) {
      setClassTypeSearch("");
    }
  }, [openClassIdx]);

  // Custom dropdowns tab Manual (Pilih Jam & Pilih Kelas)
  const [openManualDD, setOpenManualDD] = useState<null | "jam" | "kelas">(
    null,
  );
  const [manualDDSearch, setManualDDSearch] = useState("");
  const [openAutoTimeIndex, setOpenAutoTimeIndex] = useState<number | null>(
    null,
  );
  const [openEditTimeDD, setOpenEditTimeDD] = useState<boolean>(false);

  useEffect(() => {
    if (openManualDD !== null) {
      setManualDDSearch("");
    }
  }, [openManualDD]);

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
    if (isDeleting) return;
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
    if (isEditing) return;
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

  // Batch2: hasil penyalinan terakhir yang menetap (tidak hilang saat modal
  // notifikasi ditutup). Hanya tampilan — tidak mengubah alur di bawah.
  const [lastCopyResult, setLastCopyResult] = useState<{
    studentName: string;
    booked: number;
    failed: string[];
  } | null>(null);
  // Batch2: copy per-baris panel kesiapan (lock sendiri agar tidak berebut slot).
  const [copyingGapId, setCopyingGapId] = useState<string | null>(null);
  const [isGapOpen, setIsGapOpen] = useState(true);

  // Bulk Actions Execution
  const executeBulkDelete = async () => {
    if (!studentId || bulkDeleteConfirm.studentSchedules.length === 0) return;
    if (isSubmitting) return;

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
    if (isSubmitting) return;

    setIsSubmitting(true);
    setCopyConfirm(false);
    try {
      const res = await copyScheduleToNextMonth(
        studentId,
        currentYear,
        currentMonth,
      );
      // Batch2: catat hasil agar menetap di halaman (tidak hilang saat modal ditutup).
      const copiedName =
        students.find((s) => s.id === studentId)?.name || "Siswa";
      setLastCopyResult({
        studentName: copiedName,
        booked: res.totalBooked,
        failed: res.failedDates || [],
      });
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

  // Batch2: salin per-baris dari panel kesiapan bulan depan. Alur hasil
  // (modal + kotak menetap) sama persis seperti executeCopyToNextMonth.
  const handleGapCopy = async (gapStudentId: string, gapStudentName: string) => {
    if (copyingGapId) return;
    setCopyingGapId(gapStudentId);
    try {
      const res = await copyScheduleToNextMonth(
        gapStudentId,
        currentYear,
        currentMonth,
      );
      setLastCopyResult({
        studentName: gapStudentName,
        booked: res.totalBooked,
        failed: res.failedDates || [],
      });
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
      setCopyingGapId(null);
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
    "17:00",
  ];

  useEffect(() => {
    setIsSubmitting(false);
  }, [currentMonth, currentYear]);

  const handleMonthChange = (offset: number) => {
    // Hemat Origin: cegah push ganda saat klik panah bulan cepat.
    if (isSubmitting) return;
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
    if (isSubmitting) return;

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

      // Batch2: catat hasil agar menetap di halaman (tidak hilang saat modal ditutup).
      const autoName =
        students.find((s) => s.id === studentId)?.name || "Siswa";
      setLastCopyResult({
        studentName: autoName,
        booked: totalBooked,
        failed: allFailedDates,
      });

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
    if (isSubmitting) return;

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
  const filteredStudents = useMemo(() => {
    let result = students;

    // Filter based on search query (matches name or nickname like in Kelola Siswa)
    if (studentSearchQuery.trim()) {
      const q = studentSearchQuery.toLowerCase().trim();
      result = students.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.nickname && s.nickname.toLowerCase().includes(q)),
      );
    }

    // Urutan: siswa dengan riwayat pilihan terakhir di atas (paling baru dulu),
    // sisanya alfabetis. Tanpa riwayat, semua alfabetis seperti semula.
    return [...result].sort((a, b) => {
      const ra = recentStudentIds.indexOf(a.id);
      const rb = recentStudentIds.indexOf(b.id);
      if (ra !== -1 && rb !== -1 && ra !== rb) return ra - rb;
      if (ra !== -1 && rb === -1) return -1;
      if (ra === -1 && rb !== -1) return 1;

      const nameCompare = a.name.localeCompare(b.name, "id");
      if (nameCompare !== 0) return nameCompare;

      // If names are equal, compare nicknames
      const nickA = a.nickname || "";
      const nickB = b.nickname || "";
      return nickA.localeCompare(nickB, "id");
    });
  }, [students, studentSearchQuery, recentStudentIds]);

  // Batch2: kesiapan bulan depan — siswa aktif tanpa 1 pun booking bulan depan.
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
  const gapStudents = useMemo(() => {
    const scheduled = new Set(nextMonthScheduledIds || []);
    return students
      .filter((s) => s.status !== "INACTIVE" && !scheduled.has(s.id))
      .sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [students, nextMonthScheduledIds]);

  return (
    <>
      {isSubmitting && <LoadingSpinner usePortal={true} />}

      <div className="bg-white dark:bg-zinc-900 shadow-sm border border-slate-200 dark:border-zinc-800 rounded-2xl">
        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 flex rounded-t-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setActiveMode("auto")}
            className={`flex-1 py-4 text-sm font-semibold transition-colors cursor-pointer border-b-2 ${
              activeMode === "auto"
                ? "border-brand-600 text-brand-700 dark:text-brand-300 bg-white dark:bg-zinc-900"
                : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200"
            }`}
          >
            Otomatis (Bulanan)
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("manual")}
            className={`flex-1 py-4 text-sm font-semibold transition-colors cursor-pointer border-b-2 ${
              activeMode === "manual"
                ? "border-brand-600 text-brand-700 dark:text-brand-300 bg-white dark:bg-zinc-900"
                : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200"
            }`}
          >
            Manual (Pilih 1 Sesi)
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {/* Month Navigator */}
          {(() => {
            const prevM = currentMonth === 1 ? 12 : currentMonth - 1;
            const prevY = currentMonth === 1 ? currentYear - 1 : currentYear;
            const nextM = currentMonth === 12 ? 1 : currentMonth + 1;
            const nextY = currentMonth === 12 ? currentYear + 1 : currentYear;
            return (
              <div className="mb-6 flex items-center justify-between bg-slate-50 dark:bg-zinc-800/60 p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800">
                <a
                  href={`/scheduling?month=${prevM}&year=${prevY}`}
                  className="px-3 py-2.5 sm:px-4 rounded-xl hover:bg-white dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 transition-colors flex items-center gap-2 text-sm font-semibold min-h-11 min-w-11 justify-center active:translate-y-[1px] cursor-pointer"
                  title="Bulan Sebelumnya"
                  aria-label="Bulan sebelumnya"
                >
                  <Icons.chevronLeft className="w-5 h-5 shrink-0" />
                  <span className="hidden sm:inline">Bulan Sebelumnya</span>
                </a>
                <div className="font-bold text-base sm:text-lg text-slate-900 dark:text-white text-center px-2 select-none tabular-nums">
                  {monthNames[currentMonth - 1]} {currentYear}
                </div>
                <a
                  href={`/scheduling?month=${nextM}&year=${nextY}`}
                  className="px-3 py-2.5 sm:px-4 rounded-xl hover:bg-white dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 transition-colors flex items-center gap-2 text-sm font-semibold min-h-11 min-w-11 justify-center active:translate-y-[1px] cursor-pointer"
                  title="Bulan Berikutnya"
                  aria-label="Bulan berikutnya"
                >
                  <span className="hidden sm:inline">Bulan Berikutnya</span>
                  <Icons.chevronRight className="w-5 h-5 shrink-0" />
                </a>
              </div>
            );
          })()}

          {/* Batch2: Kesiapan bulan depan — siswa aktif tanpa 1 pun sesi bulan depan */}
          <NextMonthReadinessBanner
            copyingGapId={copyingGapId}
            currentMonth={currentMonth}
            gapStudents={gapStudents}
            handleGapCopy={handleGapCopy}
            isGapOpen={isGapOpen}
            monthNames={monthNames}
            nextMonth={nextMonth}
            nextYear={nextYear}
            setIsGapOpen={setIsGapOpen}
          />

          {/* Batch2: Hasil penyalinan terakhir (menetap sampai ditutup/ganti bulan) */}
          {lastCopyResult && (
            <div
              className={`mb-8 p-4 rounded-2xl border ${
                lastCopyResult.failed.length > 0
                  ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800/50"
                  : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-800/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p
                    className={`text-sm font-bold ${
                      lastCopyResult.failed.length > 0
                        ? "text-amber-800 dark:text-amber-300"
                        : "text-emerald-800 dark:text-emerald-300"
                    }`}
                  >
                    Hasil penyalinan: {lastCopyResult.studentName}
                  </p>
                  <p className="text-xs mt-1 leading-relaxed text-slate-600 dark:text-zinc-300">
                    {lastCopyResult.booked} sesi disalin.
                    {lastCopyResult.failed.length > 0 ? (
                      <>
                        {" "}
                        Gagal (penuh/sudah terdaftar) pada:{" "}
                        {lastCopyResult.failed
                          .map((d) => formatShortDate(d))
                          .join(", ")}
                        . Salin ulang setelah ada kursi kosong.
                      </>
                    ) : (
                      " Semua sesi berhasil."
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLastCopyResult(null)}
                  aria-label="Tutup hasil penyalinan"
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <Icons.close className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Global Student Selector */}
          <SchedulingStudentSelector
            currentMonth={currentMonth}
            filteredStudents={filteredStudents}
            handleOpenChangeLabel={handleOpenChangeLabel}
            isOpenStudentDropdown={isOpenStudentDropdown}
            monthNames={monthNames}
            rememberRecentStudent={rememberRecentStudent}
            schedules={schedules}
            selectedStudent={selectedStudent}
            setBulkDeleteConfirm={setBulkDeleteConfirm}
            setCopyConfirm={setCopyConfirm}
            setDeleteConfirm={setDeleteConfirm}
            setEditModal={setEditModal}
            setIsOpenStudentDropdown={setIsOpenStudentDropdown}
            setStudentId={setStudentId}
            setStudentSearchQuery={setStudentSearchQuery}
            studentDropdownRef={studentDropdownRef}
            studentId={studentId}
            studentSearchQuery={studentSearchQuery}
          />

          {activeMode === "auto" ? (
            <AutoBookingForm
              addAutoScheduleRow={addAutoScheduleRow}
              autoSchedules={autoSchedules}
              classes={classes}
              classTypeSearch={classTypeSearch}
              classTypeSearchRef={classTypeSearchRef}
              getRemainingSlots={getRemainingSlots}
              handleAutoSubmit={handleAutoSubmit}
              isSubmitting={isSubmitting}
              openAutoTimeIndex={openAutoTimeIndex}
              openClassIdx={openClassIdx}
              removeAutoScheduleRow={removeAutoScheduleRow}
              setClassTypeSearch={setClassTypeSearch}
              setOpenAutoTimeIndex={setOpenAutoTimeIndex}
              setOpenClassIdx={setOpenClassIdx}
              studentId={studentId}
              timeSlots={timeSlots}
              updateAutoSchedule={updateAutoSchedule}
            />
          ) : (
            <ManualBookingForm
              classes={classes}
              getRemainingSlots={getRemainingSlots}
              handleManualSubmit={handleManualSubmit}
              isSubmitting={isSubmitting}
              manualClassId={manualClassId}
              manualDate={manualDate}
              manualDDSearch={manualDDSearch}
              manualTime={manualTime}
              openManualDD={openManualDD}
              setManualClassId={setManualClassId}
              setManualDate={setManualDate}
              setManualDDSearch={setManualDDSearch}
              setManualTime={setManualTime}
              setOpenManualDD={setOpenManualDD}
              studentId={studentId}
              timeSlots={timeSlots}
            />
          )}
        </div>
      </div>

      {/* Custom Notification Modal */}
      {modalConfig.isOpen && (
        <SchedulingNotificationModal
          modalConfig={modalConfig}
          setModalConfig={setModalConfig}
        />
      )}

      {/* Edit Booking Modal */}
      {editModal.isOpen && (
        <StudentScheduleDetailModal
          classes={classes}
          editModal={editModal}
          getRemainingSlots={getRemainingSlots}
          handleEditBooking={handleEditBooking}
          isEditing={isEditing}
          openEditTimeDD={openEditTimeDD}
          setEditModal={setEditModal}
          setOpenEditTimeDD={setOpenEditTimeDD}
          timeSlots={timeSlots}
        />
      )}

      {/* Delete Booking Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-zinc-800">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/15 mb-4">
                <Icons.trash className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Hapus Jadwal Siswa?
              </h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mb-1">
                Apakah Anda yakin ingin menghapus jadwal berikut?
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                <Icons.calendar className="w-3 h-3 text-brand-600 dark:text-brand-400" />
                {deleteConfirm.label}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-zinc-800/50 px-6 py-4 flex gap-3 border-t border-slate-200 dark:border-zinc-800">
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
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700 disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteBooking}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 active:translate-y-[1px] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Delete Booking Confirmation Modal */}
      {bulkDeleteConfirm.isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-zinc-800">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/15 mb-4">
                <Icons.trash className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Hapus Semua Jadwal?
              </h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mb-1">
                Apakah Anda yakin ingin menghapus semua (
                {bulkDeleteConfirm.studentSchedules.length}) jadwal di bulan ini
                untuk siswa ini?
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-zinc-800/50 px-6 py-4 flex gap-3 border-t border-slate-200 dark:border-zinc-800">
              <button
                onClick={() =>
                  setBulkDeleteConfirm({ isOpen: false, studentSchedules: [] })
                }
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700 disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={executeBulkDelete}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 active:translate-y-[1px] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Menghapus..." : "Ya, Hapus Semua"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy To Next Month Modal */}
      {copyConfirm && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-zinc-800">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/15 mb-4">
                <Icons.calendar className="h-6 w-6 text-brand-600 dark:text-brand-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Salin Jadwal ke Bulan Depan?
              </h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mb-1">
                Apakah Anda yakin ingin menyalin pola jadwal bulan ini ke bulan
                depan?
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-zinc-800/50 px-6 py-4 flex gap-3 border-t border-slate-200 dark:border-zinc-800">
              <button
                onClick={() => setCopyConfirm(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700 disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={executeCopyToNextMonth}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 active:translate-y-[1px] transition-colors disabled:opacity-50 cursor-pointer"
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
