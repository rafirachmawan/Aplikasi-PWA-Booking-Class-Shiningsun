"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Icons } from "@/components/ui/icons";
import { createWorksheet, updateWorksheet } from "@/lib/actions";
import {
  getGDrivePreviewLink,
  getGDriveDirectLink,
  extractGDriveFileId,
} from "@/lib/gdriveUtils";
import {
  getTodayISO,
  formatShortDate,
  formatFullIndonesianDate,
  parseIndonesianDateToISO,
} from "@/lib/dateUtils";
import { getHolidayName } from "@/lib/holidays";

interface WorksheetFormModalProps {
  students: any[];
  teachers?: any[];
  templates?: any[];
  labels?: any[];
  initialData?: any;
  worksheets?: any[];
  lockedStudentId?: string; // Student ID from dashboard - if present, dropdown is locked
  currentDate?: string; // Optional: pass current date for calculation (default to today)
  onClose: () => void;
  onSuccess: () => void;
}

const parseBulletList = (text?: string): string[] => {
  if (!text || !text.trim()) return [""];
  const lines = text
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : [""];
};

function formatAnandaLine(rawLine: string): string {
  let clean = rawLine.replace(/^[-•*]\s*/, "").trim();
  if (!clean || clean === "-") return "-";
  if (/ananda/i.test(clean)) {
    return clean;
  }
  if (/siswa/i.test(clean)) {
    return clean.replace(/siswa/gi, "Ananda");
  }
  return `Ananda ${clean}`;
}

export function WorksheetFormModal({
  students,
  teachers = [],
  templates = [],
  labels = [],
  initialData,
  worksheets = [],
  lockedStudentId, // Student ID from dashboard - if present, dropdown is locked
  currentDate, // Optional: pass current date for calculation (default to today)
  onClose,
  onSuccess,
}: WorksheetFormModalProps) {
  const isEditing = !!initialData?.id;

  // Sync with parent's locked student ID
  const [effectiveLockedStudentId, setEffectiveLockedStudentId] = useState(
    lockedStudentId || "",
  );
  useEffect(() => {
    setEffectiveLockedStudentId(lockedStudentId || "");
  }, [lockedStudentId]);

  // Initialize studentId from initialData OR from lockedStudentId if new entry
  const initialStudentId =
    initialData?.student_id || (isEditing ? "" : lockedStudentId);
  const [studentId, setStudentId] = useState(initialStudentId || "");

  // Force re-init studentId when lockedStudentId changes
  useEffect(() => {
    if (!initialData && lockedStudentId && studentId !== lockedStudentId) {
      console.log("🔒 Student locked via parent, setting:", lockedStudentId);
      setStudentId(lockedStudentId);
    }
  }, [lockedStudentId]);

  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [worksheetDate, setWorksheetDate] = useState(
    initialData?.worksheet_date || getTodayISO(),
  );
  const [gdriveLink, setGdriveLink] = useState(initialData?.gdrive_link || "");
  const [materi, setMateri] = useState(initialData?.materi || "");

  // Attendance Status State ('HADIR' | 'IJIN' | 'SAKIT' | 'LIBUR' | 'LIBUR_HARI_BESAR')
  type AttendanceStatus =
    | "HADIR"
    | "IJIN"
    | "SAKIT"
    | "LIBUR"
    | "LIBUR_HARI_BESAR";
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>(
    () => {
      const t = initialData?.title || "";
      const m = initialData?.materi || "";
      if (t.includes("Ijin") || m.includes("Ijin")) return "IJIN";
      if (t.includes("Sakit") || m.includes("Sakit")) return "SAKIT";
      if (t.includes("Libur") || m.includes("Libur")) return "LIBUR_HARI_BESAR";
      return "HADIR";
    },
  );

  // Selected absence reason (from Template Penilaian dropdown)
  const [absenceReason, setAbsenceReason] = useState("");

  const isAbsent = attendanceStatus !== "HADIR";

  // Custom Student Dropdown State
  const formRef = useRef<HTMLFormElement>(null);
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const studentDropdownRef = useRef<HTMLDivElement>(null);
  const studentSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isStudentDropdownOpen) {
      setTimeout(() => {
        studentSearchInputRef.current?.focus();
      }, 50);
    }
  }, [isStudentDropdownOpen]);

  // Cleanup: Remove unused Bulan Ke dropdown state since we merged inputs

  const filteredStudents = useMemo(() => {
    const sorted = [...students].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "id", { sensitivity: "base" }),
    );
    if (!studentSearch.trim()) return sorted;
    const q = studentSearch.toLowerCase();
    return sorted.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.nickname && s.nickname.toLowerCase().includes(q)),
    );
  }, [students, studentSearch]);

  // Dynamic bullet list items for Kegiatan & Hasil Belajar
  const [kegiatanItems, setKegiatanItems] = useState<string[]>(() =>
    parseBulletList(initialData?.kegiatan),
  );
  const [hasilBelajarItems, setHasilBelajarItems] = useState<string[]>(() =>
    parseBulletList(initialData?.hasil_belajar),
  );

  const [catatanGuru, setCatatanGuru] = useState(
    initialData?.catatan_guru || "",
  );
  const [rekomendasiRumah, setRekomendasiRumah] = useState(
    initialData?.rekomendasi_rumah || "",
  );
  const [ttdGuru, setTtdGuru] = useState(initialData?.ttd_guru || "");

  // Note: bulanKe state removed - now handled by auto-calculated logic only

  // Track selected student details and allow level change
  const [selectedStudentLabel, setSelectedStudentLabel] = useState<any>(null);
  const [currentMateriLevel, setCurrentMateriLevel] = useState<string>("");

  // State for Bulan Ke - Dropdown + Manual (empty initially, auto-filled in useEffect after useMemo)
  const [bulanKe, setBulanKe] = useState<string>("");
  const [manualBulanKe, setManualBulanKe] = useState<string>("");

  // Sync manual and dropdown if one is set
  useEffect(() => {
    if (manualBulanKe && !isNaN(parseInt(manualBulanKe, 10))) {
      setBulanKe(manualBulanKe);
    } else if (!manualBulanKe && !bulanKe) {
      // Keep both empty if both are cleared
    }
  }, [manualBulanKe]);

  // Auto-fill bulan ke when student changes (triggered after component mounts)
  useEffect(() => {
    if (!isEditing) {
      const currentISO = parseIndonesianDateToISO(
        currentDate || worksheetDateInput || getTodayISO(), // Prioritize: prop > input > today
      );

      console.log("🔍 Bulan Ke Calculation:", {
        usingDateSource: currentDate
          ? "prop"
          : worksheetDateInput
            ? "input"
            : "today",
        currentDate: currentISO,
        studentId,
        worksheetsCount: worksheets?.length,
      });

      // Find worksheets for current student
      if (studentId && worksheets && worksheets.length > 0) {
        const studentWorksheets = worksheets.filter((w) => {
          return w.student_id === studentId || w.student?.id === studentId;
        });

        if (studentWorksheets.length > 0) {
          // Get the earliest worksheet with bulan_ke
          const sorted = [...studentWorksheets].sort((a, b) => {
            const dateA = parseIndonesianDateToISO(
              a.worksheet_date || a.created_at,
            );
            const dateB = parseIndonesianDateToISO(
              b.worksheet_date || b.created_at,
            );
            return dateA.localeCompare(dateB);
          });

          const firstWithBulanKe = sorted.find(
            (w) => w.bulan_ke !== null && !isNaN(parseInt(w.bulan_ke, 10)),
          );

          if (firstWithBulanKe) {
            // Student has riwayat - calculate and auto-fill
            const startMonth = parseInt(
              firstWithBulanKe.bulan_ke.toString(),
              10,
            );
            const startDate = new Date(
              parseIndonesianDateToISO(firstWithBulanKe.worksheet_date),
            );
            const calcDate = new Date(currentISO);

            // Calculate month difference
            const diffMonths =
              (calcDate.getFullYear() - startDate.getFullYear()) * 12 +
              (calcDate.getMonth() - startDate.getMonth());

            const calculated = Math.max(1, startMonth + diffMonths);

            console.log("📊 Hasil Perhitungan:", {
              startMonth,
              startDate: firstWithBulanKe.worksheet_date,
              diffMonths,
              calculated,
            });

            setTimeout(() => {
              setBulanKe(calculated <= 10 ? calculated.toString() : "");
            }, 50);
          } else {
            // Student has no riwayat bulan_ke - clear existing values FIRST, then allow manual input
            setTimeout(() => {
              setBulanKe("");
              setManualBulanKe("");
            }, 50);
          }
        } else {
          // No worksheets at all - clear existing values FIRST
          setTimeout(() => {
            setBulanKe("");
            setManualBulanKe("");
          }, 50);
        }
      } else {
        // No student selected or data not ready - always clear
        setBulanKe("");
        setManualBulanKe("");
      }
    }
  }, [studentId, isEditing]);

  // Trigger auto-fill on initial mount if lockedStudentId present and studentId already set
  useEffect(() => {
    if (isEditing) return; // Not applicable for edit mode

    // Log when calculation is triggered
    if (studentId && !bulanKe && !manualBulanKe) {
      console.log("🔔 Bulan Ke auto-calculation triggered");
      console.log({
        studentId,
        hasWorksheets: worksheets?.length > 0,
        currentDate: worksheetDateInput || getTodayISO(),
      });
    }
  }, []); // Only run once on mount - just logging

  // Custom Bulan Ke dropdown state
  const [isBulanKeDropdownOpen, setIsBulanKeDropdownOpen] = useState(false);
  const bulanKeDropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside for Bulan Ke dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        bulanKeDropdownRef.current &&
        !bulanKeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsBulanKeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const prevStudentIdRef = useRef(studentId);
  const autoCalculatedBulanKeInfo = useMemo(() => {
    const activeId = studentId || initialData?.student_id;
    if (!activeId || !worksheets || worksheets.length === 0) {
      return {
        value: "1",
        hasHistory: false,
        isAuto: false,
        reason:
          "Belum ada riwayat lembar perkembangan (Dapat diisi manual di awal, misal: Bulan ke-1, 2, atau 3).",
      };
    }

    // Filter worksheets for selected student (excluding current record if editing)
    const studentWorksheets = worksheets.filter((w) => {
      const matchStudent =
        w.student_id === activeId || w.student?.id === activeId;
      const isNotSelf = !isEditing || w.id !== initialData?.id;
      const hasDate = !!(w.worksheet_date || w.created_at);
      const hasBulanKe =
        w.bulan_ke !== null &&
        w.bulan_ke !== undefined &&
        !isNaN(parseInt(w.bulan_ke, 10));
      return matchStudent && isNotSelf && hasDate && hasBulanKe;
    });

    if (studentWorksheets.length === 0) {
      return {
        value: "1",
        hasHistory: false,
        isAuto: false,
        reason:
          "Belum ada riwayat lembar perkembangan (Dapat diisi manual di awal, misal: Bulan ke-1, 2, atau 3).",
      };
    }

    // Sort student worksheets by worksheet_date ascending (chronological)
    const sorted = [...studentWorksheets].sort((a, b) => {
      const dateA = parseIndonesianDateToISO(a.worksheet_date || a.created_at);
      const dateB = parseIndonesianDateToISO(b.worksheet_date || b.created_at);
      return dateA.localeCompare(dateB);
    });

    const earliest = sorted[0];
    const earliestIso = parseIndonesianDateToISO(
      earliest.worksheet_date || earliest.created_at,
    );
    const earliestMatch = earliestIso.match(/^(\d{4})-(\d{2})/);

    const currentIso = parseIndonesianDateToISO(worksheetDate);
    const currentMatch = currentIso.match(/^(\d{4})-(\d{2})/);

    if (!earliestMatch || !currentMatch) {
      return {
        value: "1",
        hasHistory: false,
        isAuto: false,
        reason: "Format tanggal tidak valid (Default Bulan ke-1)",
      };
    }

    const startYear = parseInt(earliestMatch[1], 10);
    const startMonth = parseInt(earliestMatch[2], 10);
    const startBulanKe = parseInt(earliest.bulan_ke.toString(), 10) || 1;

    const currentYear = parseInt(currentMatch[1], 10);
    const currentMonth = parseInt(currentMatch[2], 10);

    const totalMonthDiff =
      (currentYear - startYear) * 12 + (currentMonth - startMonth);
    const calculated = Math.max(1, startBulanKe + totalMonthDiff);

    const MONTH_NAMES_SHORT = [
      "",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    const earliestMonthName = MONTH_NAMES_SHORT[startMonth] || "";
    const earliestLabel = `${earliestMonthName} ${startYear}`;

    let diffText = "";
    if (totalMonthDiff > 0) {
      diffText = `+${totalMonthDiff} bulan dari ${earliestLabel}`;
    } else if (totalMonthDiff < 0) {
      diffText = `${totalMonthDiff} bulan dari ${earliestLabel}`;
    } else {
      diffText = `sama dengan bulan ${earliestLabel}`;
    }

    return {
      value: calculated.toString(),
      hasHistory: true,
      isAuto: true,
      reason: `Otomatis meneruskan riwayat (Awal Bulan ke-${startBulanKe} pada ${earliestLabel}, ${diffText})`,
    };
  }, [studentId, initialData, worksheets, worksheetDate, isEditing]);

  // Note: Removed isManualBulanKe useEffect since month-ke auto-calculated only

  const isBulanKeDisabled = !isEditing && autoCalculatedBulanKeInfo.hasHistory;

  // Note: Removed sync useEffect - bulanKe is now always auto-calculated

  const handleAttendanceChange = (status: AttendanceStatus) => {
    setAttendanceStatus(status);
    if (status === "IJIN") {
      const reason = ijinReasonTemplates[0]?.title || "";
      setAbsenceReason(reason);
      setMateri("Tidak Hadir (Ijin)");
      setKegiatanItems([reason || "Siswa Ijin (Tidak Mengikuti Sesi Kelas)"]);
      setHasilBelajarItems([reason || "Siswa Ijin"]);
      setCatatanGuru(
        "Ananda tidak dapat mengikuti kelas hari ini karena Ijin.",
      );
      setRekomendasiRumah(
        "Dapat mempelajari materi mandiri jika memungkinkan.",
      );
    } else if (status === "SAKIT") {
      const reason = sakitReasonTemplates[0]?.title || "";
      setAbsenceReason(reason);
      setMateri("Tidak Hadir (Sakit)");
      setKegiatanItems([reason || "Siswa Sakit (Istirahat di Rumah)"]);
      setHasilBelajarItems([reason || "Siswa Sakit"]);
      setCatatanGuru(
        "Ananda tidak dapat mengikuti kelas hari ini karena Sakit. Semoga lekas sembuh! 🌸",
      );
      setRekomendasiRumah("Istirahat yang cukup hingga kondisi fit kembali.");
    } else if (status === "LIBUR" || status === "LIBUR_HARI_BESAR") {
      const iso = parseIndonesianDateToISO(worksheetDateInput || getTodayISO());
      const holiday = iso ? getHolidayName(iso) : null;
      const reason = liburReasonTemplates[0]?.title || "";
      setAbsenceReason(reason);
      setMateri(holiday ? `Libur Hari Besar (${holiday})` : "Libur Hari Besar");
      setKegiatanItems([
        reason || (holiday ? `Kelas Diliburkan (${holiday})` : "Kelas Diliburkan"),
      ]);
      setHasilBelajarItems([
        reason || (holiday ? `Libur ${holiday}` : "Libur Hari Besar"),
      ]);
      setCatatanGuru(
        "Kelas diliburkan dalam rangka memperingati Libur Hari Besar.",
      );
      setRekomendasiRumah("Selamat berlibur bersama keluarga!");
    } else {
      setAbsenceReason("");
      if (materi.includes("Tidak Hadir") || materi.includes("Libur")) {
        setMateri("");
        setKegiatanItems([""]);
        setHasilBelajarItems([""]);
        setCatatanGuru("");
        setRekomendasiRumah("");
      }
    }
  };

  // Change absence reason via dropdown (reason is shown in Kegiatan & Hasil Belajar tables)
  const handleAbsenceReasonChange = (reason: string) => {
    setAbsenceReason(reason);
    if (reason) {
      setKegiatanItems([reason]);
      setHasilBelajarItems([reason]);
    }
  };

  // Google Drive Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isUploadingGDrive, setIsUploadingGDrive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFilePreviewUrl(URL.createObjectURL(file));
      setUploadError(null);
    }
  };

  const handleUploadToGDrive = async (fileToUpload?: File) => {
    const target = fileToUpload || selectedFile;
    if (!target) return;

    setIsUploadingGDrive(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", target);

      const res = await fetch("/api/upload-gdrive", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengunggah ke Google Drive");
      }

      if (data.gdriveLink) {
        setGdriveLink(data.gdriveLink);
      }
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Gagal mengunggah file");
    } finally {
      setIsUploadingGDrive(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const activeStudent =
    students.find(
      (s) => s.id === studentId || s.id === initialData?.student_id,
    ) || initialData?.student;
  const activeStudentName = studentId
    ? activeStudent?.name || initialData?.student_name || "Siswa"
    : "-- Pilih Siswa --";

  const fileId = extractGDriveFileId(gdriveLink);

  // Template autofill handler
  const handleSelectTemplate = (tplId: string) => {
    if (!tplId) return;
    const found = templates.find((t) => t.id === tplId);
    if (found) {
      if (found.materi) setMateri(found.materi);
      if (found.kegiatan) setKegiatanItems(parseBulletList(found.kegiatan));
      if (found.hasil_belajar)
        setHasilBelajarItems(parseBulletList(found.hasil_belajar));
    }
  };

  // Track student label changes and sync with active student
  useEffect(() => {
    if (activeStudent) {
      const lbl = activeStudent.label;
      const labelObj = Array.isArray(lbl) ? lbl[0] : lbl || null;
      setSelectedStudentLabel(labelObj);

      // Update current Materi level when student changes
      if (labelObj?.main_level && labelObj.sub_level) {
        setCurrentMateriLevel(`${labelObj.main_level} - ${labelObj.sub_level}`);
      }
    } else {
      setSelectedStudentLabel(null);
      setCurrentMateriLevel("");
    }
  }, [activeStudent]);

  // Dynamic template lists per category
  // Filter materi by selected level (or student's level)
  const activeStudentLabel = activeStudent?.label;
  const activeStudentLabelId =
    activeStudent?.label_id ||
    (Array.isArray(activeStudentLabel)
      ? activeStudentLabel[0]?.id
      : activeStudentLabel?.id) ||
    null;

  const availableLevels = useMemo(() => {
    const map = new Map<
      string,
      { id: string; main_level: string; sub_level: string; hex_color?: string }
    >();

    // 1. Incorporate all master labels if provided
    if (labels && Array.isArray(labels)) {
      labels.forEach((lbl) => {
        if (lbl && lbl.id && !map.has(lbl.id)) {
          map.set(lbl.id, {
            id: lbl.id,
            main_level: lbl.main_level || "Level",
            sub_level: lbl.sub_level || "",
            hex_color: lbl.hex_color || "#0284c7",
          });
        }
      });
    }

    // 2. Incorporate labels attached to templates
    templates.forEach((t) => {
      if (t.label_id || t.label) {
        const lbls = Array.isArray(t.label) ? t.label : [t.label];
        lbls.forEach((lbl: any) => {
          const lId = t.label_id || lbl?.id;
          if (lId && !map.has(lId)) {
            map.set(lId, {
              id: lId,
              main_level: lbl?.main_level || "Level",
              sub_level: lbl?.sub_level || "",
              hex_color: lbl?.hex_color || "#0284c7",
            });
          }
        });
      }
    });

    // 3. Incorporate active student's label if not already present
    if (activeStudentLabelId && activeStudentLabel) {
      const lbls = Array.isArray(activeStudentLabel)
        ? activeStudentLabel
        : [activeStudentLabel];
      lbls.forEach((lbl: any) => {
        if (lbl && lbl.id && !map.has(lbl.id)) {
          map.set(lbl.id, {
            id: lbl.id,
            main_level: lbl.main_level || "Level",
            sub_level: lbl.sub_level || "",
            hex_color: lbl.hex_color || "#0284c7",
          });
        }
      });
    }

    return Array.from(map.values());
  }, [templates, labels, activeStudentLabelId, activeStudentLabel]);

  const [selectedLevelId, setSelectedLevelId] = useState<string>(() => {
    if (activeStudentLabelId) return activeStudentLabelId;
    if (initialData?.id) return "ALL";
    return "";
  });

  useEffect(() => {
    if (activeStudentLabelId) {
      setSelectedLevelId(activeStudentLabelId);
    } else if (initialData?.id) {
      setSelectedLevelId((prev) => prev || "ALL");
    } else {
      setSelectedLevelId("");
    }
  }, [activeStudentLabelId, initialData?.id]);

  const selectedLevelObj = useMemo(() => {
    if (!selectedLevelId || selectedLevelId === "ALL") return null;
    return availableLevels.find((l) => l.id === selectedLevelId) || null;
  }, [availableLevels, selectedLevelId]);

  const filteredTemplatesByLevel = useMemo(() => {
    if (!selectedLevelId) return [];
    if (selectedLevelId === "ALL") return templates;
    return templates.filter((t) => {
      const tLabels = Array.isArray(t.label)
        ? t.label
        : t.label
          ? [t.label]
          : [];
      const tLabelIds = new Set<string>();
      if (t.label_id) tLabelIds.add(t.label_id);
      tLabels.forEach((l: any) => {
        if (l?.id) tLabelIds.add(l.id);
      });

      if (tLabelIds.has(selectedLevelId)) return true;

      if (selectedLevelObj) {
        return tLabels.some((l: any) => {
          if (!l) return false;
          const mainMatch =
            (l.main_level || "").trim().toLowerCase() ===
            (selectedLevelObj.main_level || "").trim().toLowerCase();
          const subMatch =
            (l.sub_level || "").trim().toLowerCase() ===
            (selectedLevelObj.sub_level || "").trim().toLowerCase();
          return mainMatch && subMatch;
        });
      }
      return false;
    });
  }, [templates, selectedLevelId, selectedLevelObj]);

  const materiTemplates = useMemo(() => {
    return filteredTemplatesByLevel.filter(
      (t) => (t.category || "materi") === "materi",
    );
  }, [filteredTemplatesByLevel]);

  // Global (not level-filtered) — same options as Template Penilaian
  const kegiatanTemplates = useMemo(() => {
    return templates.filter((t) => (t.category || "kegiatan") === "kegiatan");
  }, [templates]);

  const pemahamanTemplates = useMemo(() => {
    return templates.filter((t) => t.category === "pemahaman");
  }, [templates]);

  const rumahTemplates = useMemo(() => {
    return templates.filter((t) => t.category === "rumah");
  }, [templates]);

  const afirmasiTemplates = useMemo(() => {
    return templates.filter((t) => t.category === "afirmasi");
  }, [templates]);

  // Absence reason templates (ijin/sakit/libur) — not filtered by level
  const ijinReasonTemplates = useMemo(
    () => templates.filter((t) => t.category === "ijin"),
    [templates],
  );
  const sakitReasonTemplates = useMemo(
    () => templates.filter((t) => t.category === "sakit"),
    [templates],
  );
  const liburReasonTemplates = useMemo(
    () => templates.filter((t) => t.category === "libur"),
    [templates],
  );

  const currentReasonTemplates =
    attendanceStatus === "IJIN"
      ? ijinReasonTemplates
      : attendanceStatus === "SAKIT"
        ? sakitReasonTemplates
        : liburReasonTemplates;

  const defaultKegiatanOptions =
    kegiatanTemplates.length > 0
      ? kegiatanTemplates.map((t, idx) => ({
          id: t.id,
          num: (idx + 1).toString(),
          label: t.title,
        }))
      : [
          { id: "1", num: "1", label: "Belajar mengenal" },
          { id: "2", num: "2", label: "Mengulang" },
          { id: "3", num: "3", label: "Melanjutkan" },
        ];

  const defaultPemahamanOptions =
    pemahamanTemplates.length > 0
      ? pemahamanTemplates.map((t, idx) => ({
          id: t.id,
          num: (idx + 1).toString(),
          label: t.title,
          desc: t.materi || t.description || t.title,
        }))
      : [
          {
            id: "1",
            num: "1",
            label: "Masih bingung",
            desc: "Tetap semangat ya, sedikit demi sedikit pasti bisa",
          },
          {
            id: "2",
            num: "2",
            label: "Mulai menunjukkan ketertarikan",
            desc: "Kami senang melihat Ananda mulai penasaran, Lanjutkan rasa ingin tahu menjadi modal besar agar semakin cerdas.",
          },
          {
            id: "3",
            num: "3",
            label: "Sudah bisa beberapa dengan bantuan",
            desc: "Keren! Ananda sudah bisa beberapa materi dengan bantuan. Sedikit lagi bisa mandiri.",
          },
          {
            id: "4",
            num: "4",
            label: "Sudah bisa secara mandiri",
            desc: "Luar biasa! Sudah bisa mengerjakan mandiri. Pertahankan!",
          },
        ];

  const defaultRumahOptions =
    rumahTemplates.length > 0
      ? rumahTemplates.map((t, idx) => ({
          id: t.id,
          num: (idx + 1).toString(),
          label: t.title,
        }))
      : [
          { id: "1", num: "1", label: "Mengulang materi hari ini" },
          { id: "2", num: "2", label: "Melanjutkan materi" },
        ];

  const defaultAfirmasiOptions =
    afirmasiTemplates.length > 0
      ? afirmasiTemplates.map((t, idx) => ({
          id: t.id,
          num: (idx + 1).toString(),
          label: t.title,
          text: t.materi || t.title,
        }))
      : [
          {
            id: "1",
            num: "1",
            label: "Afirmasi 1 (Masih bingung)",
            text: "Tetap semangat ya, sedikit demi sedikit pasti bisa",
          },
          {
            id: "2",
            num: "2",
            label: "Afirmasi 2 (Mulai tertarik)",
            text: "Kami senang melihat Ananda mulai penasaran, Lanjutkan rasa ingin tahu menjadi modal besar agar semakin cerdas.",
          },
          {
            id: "3",
            num: "3",
            label: "Afirmasi 3 (Dengan bantuan)",
            text: "Keren! Ananda sudah bisa beberapa materi dengan bantuan. Sedikit lagi bisa mandiri.",
          },
          {
            id: "4",
            num: "4",
            label: "Afirmasi 4 (Mandiri)",
            text: "Luar biasa! Sudah bisa mengerjakan mandiri. Pertahankan!",
          },
        ];

  const [smartKegiatanId, setSmartKegiatanId] = useState<string>("");
  const [smartMateriText, setSmartMateriText] = useState("");
  const [smartPemahamanId, setSmartPemahamanId] = useState<string>("");
  const [smartRumahId, setSmartRumahId] = useState<string>("");
  const [smartAfirmasiId, setSmartAfirmasiId] = useState<string>("");

  // Custom Dropdown Open State ('materi' | 'kegiatan' | 'pemahaman' | 'rumah' | 'afirmasi' | 'guru' | 'level' | null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [teacherSearch, setTeacherSearch] = useState("");
  const teacherSearchInputRef = useRef<HTMLInputElement>(null);
  const [materiSearch, setMateriSearch] = useState("");
  const materiSearchInputRef = useRef<HTMLInputElement>(null);
  const [levelSearch, setLevelSearch] = useState("");
  const levelSearchInputRef = useRef<HTMLInputElement>(null);
  const [kegiatanSearch, setKegiatanSearch] = useState("");
  const kegiatanSearchInputRef = useRef<HTMLInputElement>(null);
  const [pemahamanSearch, setPemahamanSearch] = useState("");
  const pemahamanSearchInputRef = useRef<HTMLInputElement>(null);
  const [rumahSearch, setRumahSearch] = useState("");
  const rumahSearchInputRef = useRef<HTMLInputElement>(null);
  const [afirmasiSearch, setAfirmasiSearch] = useState("");
  const afirmasiSearchInputRef = useRef<HTMLInputElement>(null);
  const [alasanSearch, setAlasanSearch] = useState("");
  const alasanSearchInputRef = useRef<HTMLInputElement>(null);

  // Date Input (calendar picker only, defaults to today)
  const [worksheetDateInput, setWorksheetDateInput] = useState(
    initialData?.worksheet_date || getTodayISO(),
  );

  // Hidden date input for native calendar picker
  const [isCalendarPickerOpen, setIsCalendarPickerOpen] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const calendarPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openDropdown === "guru") {
      setTimeout(() => {
        teacherSearchInputRef.current?.focus();
      }, 50);
    } else if (openDropdown === "materi") {
      setTimeout(() => {
        materiSearchInputRef.current?.focus();
      }, 50);
    } else if (openDropdown === "level") {
      setTimeout(() => {
        levelSearchInputRef.current?.focus();
      }, 50);
    } else if (openDropdown === "kegiatan") {
      setTimeout(() => {
        kegiatanSearchInputRef.current?.focus();
      }, 50);
    } else if (openDropdown === "pemahaman") {
      setTimeout(() => {
        pemahamanSearchInputRef.current?.focus();
      }, 50);
    } else if (openDropdown === "rumah") {
      setTimeout(() => {
        rumahSearchInputRef.current?.focus();
      }, 50);
    } else if (openDropdown === "afirmasi") {
      setTimeout(() => {
        afirmasiSearchInputRef.current?.focus();
      }, 50);
    } else if (openDropdown === "alasan") {
      setTimeout(() => {
        alasanSearchInputRef.current?.focus();
      }, 50);
    } else {
      setTeacherSearch("");
      setMateriSearch("");
      setLevelSearch("");
      setKegiatanSearch("");
      setPemahamanSearch("");
      setRumahSearch("");
      setAfirmasiSearch("");
      setAlasanSearch("");
    }
  }, [openDropdown]);

  const filteredTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return teachers;
    const q = teacherSearch.toLowerCase();
    return teachers.filter((t) => t.name.toLowerCase().includes(q));
  }, [teachers, teacherSearch]);

  const filteredMateriTemplates = useMemo(() => {
    if (!materiSearch.trim()) return materiTemplates;
    const q = materiSearch.toLowerCase();
    return materiTemplates.filter((t) => t.title.toLowerCase().includes(q));
  }, [materiTemplates, materiSearch]);

  const filteredKegiatanOptions = useMemo(() => {
    if (!kegiatanSearch.trim()) return defaultKegiatanOptions;
    const q = kegiatanSearch.toLowerCase();
    return defaultKegiatanOptions.filter((o) =>
      o.label.toLowerCase().includes(q),
    );
  }, [defaultKegiatanOptions, kegiatanSearch]);

  const filteredPemahamanOptions = useMemo(() => {
    if (!pemahamanSearch.trim()) return defaultPemahamanOptions;
    const q = pemahamanSearch.toLowerCase();
    return defaultPemahamanOptions.filter((o) =>
      o.label.toLowerCase().includes(q),
    );
  }, [defaultPemahamanOptions, pemahamanSearch]);

  const filteredRumahOptions = useMemo(() => {
    if (!rumahSearch.trim()) return defaultRumahOptions;
    const q = rumahSearch.toLowerCase();
    return defaultRumahOptions.filter((o) =>
      o.label.toLowerCase().includes(q),
    );
  }, [defaultRumahOptions, rumahSearch]);

  const filteredAfirmasiOptions = useMemo(() => {
    if (!afirmasiSearch.trim()) return defaultAfirmasiOptions;
    const q = afirmasiSearch.toLowerCase();
    return defaultAfirmasiOptions.filter((o) =>
      o.label.toLowerCase().includes(q),
    );
  }, [defaultAfirmasiOptions, afirmasiSearch]);

  const filteredReasonOptions = useMemo(() => {
    if (!alasanSearch.trim()) return currentReasonTemplates;
    const q = alasanSearch.toLowerCase();
    return currentReasonTemplates.filter((t) =>
      t.title.toLowerCase().includes(q),
    );
  }, [currentReasonTemplates, alasanSearch]);

  const filteredAvailableLevels = useMemo(() => {
    if (!levelSearch.trim()) return availableLevels;
    const q = levelSearch.toLowerCase();
    return availableLevels.filter(
      (lvl) =>
        lvl.main_level.toLowerCase().includes(q) ||
        lvl.sub_level.toLowerCase().includes(q) ||
        `${lvl.main_level} ${lvl.sub_level}`.toLowerCase().includes(q),
    );
  }, [availableLevels, levelSearch]);

  // Sync worksheetDateInput with selected date display
  useEffect(() => {
    if (isEditing && initialData?.worksheet_date) {
      setWorksheetDateInput(initialData.worksheet_date);
    }
  }, [initialData, isEditing]);

  // Auto-Libur when the selected date is a national holiday (tanggal merah), not applied while editing
  useEffect(() => {
    if (isEditing) return;
    const iso = parseIndonesianDateToISO(worksheetDateInput);
    if (!iso || !getHolidayName(iso)) return;
    handleAttendanceChange("LIBUR_HARI_BESAR");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worksheetDateInput, isEditing]);

  // Handle click outside for Calendar Picker (after all state declarations)
  useEffect(() => {
    function handleCalendarClickOutside(event: MouseEvent | TouchEvent) {
      if (
        calendarPickerRef.current &&
        !calendarPickerRef.current.contains(event.target as Node)
      ) {
        setIsCalendarPickerOpen(false);
      }
    }

    const cleanup = () => {
      document.removeEventListener("mousedown", handleCalendarClickOutside);
      document.removeEventListener("touchstart", handleCalendarClickOutside);
    };

    if (isCalendarPickerOpen) {
      document.addEventListener("mousedown", handleCalendarClickOutside);
      document.addEventListener("touchstart", handleCalendarClickOutside);
    }

    return cleanup;
  }, [isCalendarPickerOpen]);

  // Focus hidden date input when calendar icon clicked
  useEffect(() => {
    if (dateInputRef.current && isCalendarPickerOpen) {
      setTimeout(() => {
        dateInputRef.current?.focus();
        dateInputRef.current?.showPicker?.();
      }, 50);
    }
  }, [isCalendarPickerOpen]);

  // Helper function to parse Indonesian date format
  const formatDateForIndonesianDisplay = (dateISO: string): string => {
    const date = new Date(dateISO);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Custom calendar date picker states
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<number>(
    new Date().getMonth(),
  );
  const [currentCalendarYear, setCurrentCalendarYear] = useState<number>(
    new Date().getFullYear(),
  );

  const workSheetDateDisplay = useMemo(() => {
    if (!worksheetDateInput.trim()) return "";

    try {
      const parsed = parseIndonesianDateToISO(worksheetDateInput);
      if (parsed && !isNaN(new Date(parsed).getTime())) {
        return formatDateForIndonesianDisplay(parsed);
      }
    } catch (e) {
      console.log("Date parsing error:", e);
    }

    // If parsing fails, show original input
    return worksheetDateInput;
  }, [worksheetDateInput]);

  // Open calendar picker synced to the currently selected date
  const openCalendarPicker = () => {
    const parsed = parseIndonesianDateToISO(worksheetDateInput);
    const base =
      parsed && !isNaN(new Date(parsed).getTime())
        ? new Date(parsed)
        : new Date();
    setCurrentCalendarMonth(base.getMonth());
    setCurrentCalendarYear(base.getFullYear());
    setIsCalendarPickerOpen(true);
  };

  // Generate calendar days
  const getCalendarDays = () => {
    const firstDayOfMonth = new Date(
      currentCalendarYear,
      currentCalendarMonth,
      1,
    );
    const lastDayOfMonth = new Date(
      currentCalendarYear,
      currentCalendarMonth + 1,
      0,
    );
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

    const days = [];

    // Empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = worksheetDateInput.match(/^\d{4}-\d{2}-\d{2}$/)
        ? `${currentCalendarYear}-${String(currentCalendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` ===
          worksheetDateInput
        : false;

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => {
            const newDate = `${currentCalendarYear}-${String(currentCalendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            setWorksheetDateInput(newDate);
            setIsCalendarPickerOpen(false);
          }}
          className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
            isSelected
              ? "bg-brand-600 text-white shadow-md"
              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
        >
          {day}
        </button>,
      );
    }

    return days;
  };

  // Month names in Indonesian
  const MONTH_NAMES = [
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

  const selectedKegiatan = defaultKegiatanOptions.find(
    (o) => o.id === smartKegiatanId,
  );
  const selectedPemahaman = defaultPemahamanOptions.find(
    (o) => o.id === smartPemahamanId,
  );
  const selectedRumah = defaultRumahOptions.find((o) => o.id === smartRumahId);
  const selectedAfirmasi = defaultAfirmasiOptions.find(
    (o) => o.id === smartAfirmasiId,
  );

  // Independently handle Pemahaman selection for Poin 3 (without altering Poin 5)
  const handlePemahamanChange = (newPemId: string) => {
    setSmartPemahamanId(newPemId);
    const pemOpt = defaultPemahamanOptions.find((o) => o.id === newPemId);
    if (pemOpt) {
      const fillText = pemOpt.desc || pemOpt.label;
      setHasilBelajarItems([fillText]);
    }
  };

  const handleAfirmasiChange = (newAfId: string) => {
    setSmartAfirmasiId(newAfId);
    const afOpt = defaultAfirmasiOptions.find((a) => a.id === newAfId);
    if (afOpt) {
      setCatatanGuru(afOpt.text);
    }
  };

  // Handlers for Kegiatan list
  const handleKegiatanChange = (idx: number, val: string) => {
    const next = [...kegiatanItems];
    next[idx] = val;
    setKegiatanItems(next);
  };
  const addKegiatanItem = () => setKegiatanItems((prev) => [...prev, ""]);
  const removeKegiatanItem = (idx: number) => {
    setKegiatanItems((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== idx) : [""],
    );
  };

  // Handlers for Hasil Belajar list
  const handleHasilChange = (idx: number, val: string) => {
    const next = [...hasilBelajarItems];
    next[idx] = val;
    setHasilBelajarItems(next);
  };
  const addHasilItem = () => setHasilBelajarItems((prev) => [...prev, ""]);
  const removeHasilItem = (idx: number) => {
    setHasilBelajarItems((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== idx) : [""],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || materi.trim() || "Laporan Perkembangan";
    const effectiveStudentId =
      studentId ||
      initialData?.student_id ||
      (students.length === 1 ? students[0].id : "");

    if (!isEditing && !effectiveStudentId) {
      setErrorMsg("Pilih siswa terlebih dahulu.");
      formRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Determine effectiveBulanKe based on user input or auto-calculation
    let effectiveBulanKe = "";

    // Priority 1: User typed in manual field
    if (manualBulanKe.trim()) {
      const num = parseInt(manualBulanKe.trim(), 10);
      if (num >= 1 && num <= 10) {
        effectiveBulanKe = manualBulanKe.trim();
      }
    }

    // Priority 2: User selected from dropdown
    else if (bulanKe.trim()) {
      const num = parseInt(bulanKe.trim(), 10);
      if (num >= 1 && num <= 10) {
        effectiveBulanKe = bulanKe.trim();
      }
    }

    // Priority 3: Auto-calculate or use existing value
    else {
      effectiveBulanKe = isEditing
        ? initialData?.bulan_ke?.toString() || "1"
        : autoCalculatedBulanKeInfo.hasHistory
          ? autoCalculatedBulanKeInfo.value
          : "1";
    }

    console.log("📅 Bulan Ke Result:", effectiveBulanKe);

    const formattedKegiatan = kegiatanItems
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => `- ${item}`)
      .join("\n");

    const formattedHasilBelajar = hasilBelajarItems
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => `- ${item}`)
      .join("\n");

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("student_id", effectiveStudentId);
      formData.append("title", finalTitle);
      formData.append("description", description.trim());
      formData.append(
        "worksheet_date",
        parseIndonesianDateToISO(worksheetDateInput || getTodayISO()),
      );
      formData.append("gdrive_link", gdriveLink.trim());
      formData.append("materi", materi.trim());
      formData.append("kegiatan", formattedKegiatan);
      formData.append("hasil_belajar", formattedHasilBelajar);
      formData.append("catatan_guru", catatanGuru.trim());
      formData.append("rekomendasi_rumah", rekomendasiRumah.trim());
      formData.append("ttd_guru", ttdGuru.trim());
      formData.append("bulan_ke", effectiveBulanKe);

      if (isEditing) {
        await updateWorksheet(initialData.id, formData);
      } else {
        await createWorksheet(formData);
      }

      onClose();
      if (onSuccess) {
        try {
          onSuccess();
        } catch (err) {
          console.error("onSuccess callback error:", err);
        }
      }
    } catch (err: any) {
      console.error("Failed to save worksheet:", err);
      setErrorMsg(err.message || "Gagal menyimpan laporan perkembangan.");
      formRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/70 animate-in fade-in duration-200"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto sm:my-8">
        {/* Header: Premium Gradient Banner with Glass Icon */}
        <div className="relative flex items-center justify-between p-4 sm:p-6 bg-linear-to-r from-brand-600 via-sky-600 to-indigo-600 text-white overflow-hidden shadow-md">
          {/* Decorative glow */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white flex items-center justify-center shadow-inner shrink-0">
              <Icons.edit className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-lg font-extrabold text-white tracking-tight leading-tight">
                {isEditing
                  ? "Edit Laporan Perkembangan"
                  : "Tambah Laporan Perkembangan"}
              </h3>
              <p className="text-[11px] sm:text-xs text-sky-100/90 font-medium mt-0.5">
                Catat materi, kegiatan, hasil belajar, dan catatan guru
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="relative z-10 p-1.5 sm:p-2 rounded-full text-white/80 hover:text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer shrink-0"
            title="Tutup"
          >
            <Icons.close className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 max-h-[82vh] sm:max-h-[75vh] overflow-y-auto overscroll-contain custom-scrollbar"
        >
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200/60 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50">
              {errorMsg}
            </div>
          )}

          {/* ── SECTION 1: Info Dasar ── */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3.5 sm:p-4 space-y-3.5 sm:space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-[11px] font-extrabold shrink-0">
                1
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Info Dasar
              </span>
            </div>

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
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700/80 cursor-pointer text-left"
                  title="Pilih dari kalender"
                >
                  <span className="font-semibold truncate">
                    {workSheetDateDisplay || "Pilih tanggal"}
                  </span>
                  <Icons.calendar className="w-4 h-4 text-slate-400 shrink-0" />
                </button>

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

          {/* ── SECTION 2: Data Perkembangan & Catatan Evaluasi Anak ── */}
          <div className="rounded-2xl border border-sky-200 dark:border-sky-900 bg-sky-50/40 dark:bg-sky-950/20 p-3.5 sm:p-4 space-y-3.5 sm:space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-1.5">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-[11px] font-extrabold shrink-0">
                  2
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  📋 Data Perkembangan & Catatan Evaluasi
                </span>
              </div>
              <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/60 px-2 py-0.5 rounded-full shrink-0">
                ⚡ Template + Isian
              </span>
            </div>

            {/* Lock Notice Banner when Absent */}
            {isAbsent && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2.5 shadow-xs animate-in fade-in zoom-in-95 duration-200">
                <span className="text-xl shrink-0">🔒</span>
                <div>
                  <span className="font-extrabold block text-xs text-amber-900 dark:text-amber-100">
                    Siswa Tidak Hadir (
                    {attendanceStatus === "IJIN"
                      ? "Ijin"
                      : attendanceStatus === "SAKIT"
                        ? "Sakit"
                        : "Libur Hari Besar"}
                    )
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-medium text-amber-700 dark:text-amber-300 block mt-0.5">
                    Materi dan penilaian perkembangan dikunci otomatis.
                  </span>
                </div>
              </div>
            )}

            {/* Absence Reason Dropdown (options from Template Penilaian) */}
            {isAbsent && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  💬 Alasan Ketidakhadiran (Template Penilaian)
                </label>
                <div className="relative">
                  <button
                    type="button"
                    disabled={currentReasonTemplates.length === 0}
                    onClick={() =>
                      setOpenDropdown(openDropdown === "alasan" ? null : "alasan")
                    }
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/50 dark:bg-slate-800 text-amber-950 dark:text-amber-200 text-xs font-semibold shadow-xs hover:border-amber-400 cursor-pointer text-left disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="truncate">
                      {absenceReason || "-- Pilih Alasan --"}
                    </span>
                    <Icons.chevronDown
                      className={`w-3.5 h-3.5 text-amber-600 shrink-0 transition-transform duration-200 ${openDropdown === "alasan" ? "rotate-180" : ""}`}
                    />
                  </button>

                  {openDropdown === "alasan" && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-800 p-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* Search input for Alasan */}
                      <div className="p-1">
                        <input
                          ref={alasanSearchInputRef}
                          type="text"
                          value={alasanSearch}
                          onChange={(e) => setAlasanSearch(e.target.value)}
                          placeholder="🔍 Cari opsi alasan..."
                          className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      </div>
                      <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {filteredReasonOptions.length === 0 ? (
                          <div className="py-4 text-center text-xs text-slate-400 italic">
                            Tidak ada opsi alasan yang cocok.
                          </div>
                        ) : (
                          filteredReasonOptions.map((t) => {
                            const isSel = absenceReason === t.title;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  handleAbsenceReasonChange(t.title);
                                  setOpenDropdown(null);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-start justify-between gap-2 cursor-pointer ${
                                  isSel
                                    ? "bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-extrabold"
                                    : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                                }`}
                              >
                                <span className="wrap-break-word whitespace-normal leading-snug">
                                  {t.title}
                                </span>
                                {isSel && (
                                  <span className="text-amber-600 shrink-0 text-xs font-bold mt-0.5">
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
                {currentReasonTemplates.length === 0 && (
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 block">
                    Belum ada opsi alasan untuk kategori ini — tambahkan di menu
                    Template Penilaian (kategori Alasan Ijin / Sakit / Libur).
                  </span>
                )}
              </div>
            )}

            <div
              className={`space-y-3.5 sm:space-y-4 transition-opacity duration-200 ${isAbsent ? "opacity-50 pointer-events-none" : ""}`}
            >
              {/* 1. Materi yang Diajarkan (Unified Dropdown + Input) */}
              <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-sky-200/90 dark:border-slate-800 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>1. Materi yang Diajarkan</span>
                  </label>
                  {selectedLevelObj && (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      style={{
                        borderColor: `${selectedLevelObj.hex_color || "#0284c7"}80`,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0 border border-black/10"
                        style={{
                          backgroundColor:
                            selectedLevelObj.hex_color || "#0284c7",
                        }}
                      />
                      Level: {selectedLevelObj.main_level}{" "}
                      {selectedLevelObj.sub_level}
                    </span>
                  )}

                  {/* Current Student Level Indicator */}
                  {selectedStudentLabel && (
                    <div className="text-xs">
                      <span className="font-semibold text-slate-600 dark:text-slate-400">
                        📚 Siswa Level:
                      </span>{" "}
                      <span className="font-bold text-sky-700 dark:text-sky-400">
                        {selectedStudentLabel.main_level} -{" "}
                        {selectedStudentLabel.sub_level}
                      </span>
                    </div>
                  )}
                </div>

                {/* Level Filter Selector Bar (Custom Color Dropdown) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-sky-50/80 dark:bg-slate-800/80 p-2.5 rounded-xl border border-sky-200/80 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900 dark:text-sky-200">
                    <span>🎯 Pilih Level Materi:</span>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      disabled={isAbsent}
                      onClick={() =>
                        setOpenDropdown(
                          openDropdown === "level" ? null : "level",
                        )
                      }
                      className="w-full sm:w-auto flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl border border-sky-300 dark:border-sky-700 bg-white dark:bg-slate-900 text-xs font-extrabold shadow-xs hover:border-sky-400 cursor-pointer min-w-52.5 text-left"
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        {selectedLevelObj ? (
                          <>
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-black/10"
                              style={{
                                backgroundColor:
                                  selectedLevelObj.hex_color || "#0284c7",
                              }}
                            />
                            <span className="text-slate-900 dark:text-slate-100 font-extrabold truncate">
                              {selectedLevelObj.main_level}{" "}
                              {selectedLevelObj.sub_level}
                            </span>
                          </>
                        ) : selectedLevelId === "ALL" ? (
                          <>
                            <span className="w-3 h-3 rounded-full shrink-0 bg-sky-500 shadow-xs" />
                            <span className="text-sky-900 dark:text-sky-200 font-extrabold">
                              🌐 Semua Level
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-amber-400 animate-pulse shadow-xs" />
                            <span className="text-amber-800 dark:text-amber-300 font-extrabold italic">
                              -- Pilih Level Materi --
                            </span>
                          </>
                        )}
                      </div>
                      <Icons.chevronDown
                        className={`w-3.5 h-3.5 text-sky-600 shrink-0 transition-transform duration-200 ${
                          openDropdown === "level" ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {openDropdown === "level" && (
                      <div className="absolute top-full right-0 mt-1.5 z-50 w-full sm:w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-sky-200 dark:border-sky-800 p-2 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                        {/* Search input for Level */}
                        <div className="p-1">
                          <input
                            ref={levelSearchInputRef}
                            type="text"
                            value={levelSearch}
                            onChange={(e) => setLevelSearch(e.target.value)}
                            placeholder="🔍 Cari level..."
                            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        </div>

                        {/* Scrollable Container showing ~8-10 items */}
                        <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                          {/* Option: Semua Level */}
                          {(!levelSearch.trim() ||
                            "semua level".includes(
                              levelSearch.toLowerCase(),
                            )) && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLevelId("ALL");
                                setOpenDropdown(null);
                                setLevelSearch("");
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                                selectedLevelId === "ALL"
                                  ? "bg-sky-50 dark:bg-sky-950/70 text-sky-900 dark:text-sky-200 font-extrabold border border-sky-200 dark:border-sky-800"
                                  : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-sky-500 shadow-xs flex items-center justify-center text-[9px] text-white">
                                  🌐
                                </span>
                                Semua Level
                              </span>
                              {selectedLevelId === "ALL" && (
                                <span className="text-sky-600 font-extrabold">
                                  ✓
                                </span>
                              )}
                            </button>
                          )}

                          {/* Available Levels List with Hex Colors */}
                          {filteredAvailableLevels.length === 0 ? (
                            <div className="py-3 text-center text-xs text-slate-400 italic">
                              Level tidak ditemukan.
                            </div>
                          ) : (
                            filteredAvailableLevels.map((lvl) => {
                              const isSel = selectedLevelId === lvl.id;
                              const color = lvl.hex_color || "#0284c7";
                              return (
                                <button
                                  key={lvl.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedLevelId(lvl.id);
                                    setOpenDropdown(null);
                                    setLevelSearch("");
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                                    isSel
                                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold border border-slate-300 dark:border-slate-700 shadow-2xs"
                                      : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                                  }`}
                                >
                                  <span className="flex items-center gap-2.5 min-w-0">
                                    <span
                                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-black/10"
                                      style={{ backgroundColor: color }}
                                    />
                                    <span className="truncate font-extrabold text-slate-900 dark:text-slate-100">
                                      {lvl.main_level} {lvl.sub_level}
                                    </span>
                                  </span>
                                  {isSel && (
                                    <span className="font-extrabold text-xs text-sky-600 dark:text-sky-400">
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
                </div>

                {/* Dropdown Template Materi (Hanya muncul saat Level sudah dipilih) */}
                {!selectedLevelId ? (
                  <div className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-2.5 shadow-2xs">
                    <span className="text-base shrink-0">💡</span>
                    <span>
                      Silakan <strong>Pilih Level Materi</strong> terlebih
                      dahulu di atas untuk menampilkan pilihan materi/soal yang
                      sesuai.
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      disabled={isAbsent}
                      onClick={() =>
                        setOpenDropdown(
                          openDropdown === "materi" ? null : "materi",
                        )
                      }
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50/60 dark:bg-slate-800 text-sky-950 dark:text-sky-200 text-xs font-semibold shadow-xs hover:border-sky-400 cursor-pointer text-left"
                    >
                      <span className="truncate">
                        {smartMateriText
                          ? `📚 ${smartMateriText}`
                          : "-- Pilih Materi --"}
                      </span>
                      <Icons.chevronDown
                        className={`w-3.5 h-3.5 text-sky-600 shrink-0 transition-transform duration-200 ${openDropdown === "materi" ? "rotate-180" : ""}`}
                      />
                    </button>

                    {openDropdown === "materi" && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-sky-200 dark:border-sky-800 p-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                        {/* Search input for Materi */}
                        <div className="p-1">
                          <input
                            ref={materiSearchInputRef}
                            type="text"
                            value={materiSearch}
                            onChange={(e) => setMateriSearch(e.target.value)}
                            placeholder="🔍 Cari template materi..."
                            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        </div>

                        <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                          {filteredMateriTemplates.length === 0 ? (
                            <div className="py-4 text-center text-xs text-slate-400 italic space-y-1">
                              <div>Tidak ada materi untuk level ini.</div>
                              <button
                                type="button"
                                onClick={() => setSelectedLevelId("ALL")}
                                className="text-sky-600 dark:text-sky-400 font-bold underline cursor-pointer hover:text-sky-700"
                              >
                                Tampilkan Semua Level
                              </button>
                            </div>
                          ) : (
                            filteredMateriTemplates.map((t) => {
                              const isSel = smartMateriText === t.title;
                              const tplLabel = Array.isArray(t.label)
                                ? t.label[0]
                                : t.label;
                              const shouldSwitchLevel =
                                selectedStudentLabel &&
                                tplLabel &&
                                tplLabel.id !== selectedStudentLabel.id;

                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => {
                                    setSmartMateriText(t.title);
                                    setMateri(t.title);
                                    setOpenDropdown(null);

                                    // If student level differs from material level, ask to switch
                                    if (
                                      shouldSwitchLevel &&
                                      selectedStudentLabel &&
                                      tplLabel
                                    ) {
                                      if (
                                        confirm(
                                          `Materi ini untuk level ${tplLabel.main_level} - ${tplLabel.sub_level}, ` +
                                            `tetapi siswa berada di level ${selectedStudentLabel.main_level} - ${selectedStudentLabel.sub_level}. ` +
                                            `Ganti level materi ke level siswa?`,
                                        )
                                      ) {
                                        setSelectedLevelId(
                                          selectedStudentLabel.id,
                                        );
                                      }
                                    }
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-start justify-between gap-2 cursor-pointer ${
                                    isSel
                                      ? "bg-sky-100 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200 font-extrabold"
                                      : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                                  }`}
                                >
                                  <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                                    <span className="wrap-break-word whitespace-normal leading-snug">
                                      📚 {t.title}
                                    </span>
                                    {tplLabel && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                                        <span
                                          className="w-2 h-2 rounded-full shrink-0 border border-black/10"
                                          style={{
                                            backgroundColor:
                                              tplLabel.hex_color || "#0284c7",
                                          }}
                                        />
                                        Level: {tplLabel.main_level}{" "}
                                        {tplLabel.sub_level}
                                      </span>
                                    )}
                                    {shouldSwitchLevel && (
                                      <div className="mt-1 flex items-center gap-1 text-[10px]">
                                        <span className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-bold">
                                          👉 Switch to:
                                        </span>
                                        <span className="font-bold text-sky-700 dark:text-sky-400">
                                          {selectedStudentLabel.main_level} -{" "}
                                          {selectedStudentLabel.sub_level}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  {isSel && (
                                    <span className="text-sky-600 shrink-0 text-xs font-bold mt-0.5">
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
                )}

                {/* Direct Text Input for Materi */}
                <input
                  type="text"
                  value={materi}
                  disabled={isAbsent}
                  onChange={(e) => {
                    setMateri(e.target.value);
                    setSmartMateriText(e.target.value);
                  }}
                  placeholder="Atau tulis materi manual di sini..."
                  className={`w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:text-slate-400 ${
                    isAbsent
                      ? "bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-bold cursor-not-allowed"
                      : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  }`}
                />
              </div>

              {/* 2. Hari ini Ananda... (Kegiatan di Kelas) */}
              <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    2. Hari ini Ananda (Kegiatan di Kelas)
                  </label>
                  {!isAbsent && (
                    <button
                      type="button"
                      onClick={addKegiatanItem}
                      className="text-[11px] sm:text-xs font-bold text-sky-700 dark:text-sky-300 hover:text-sky-900 flex items-center gap-1 bg-sky-100 dark:bg-sky-900/60 hover:bg-sky-200 px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      <Icons.add className="w-3.5 h-3.5 shrink-0" />
                      <span className="whitespace-nowrap">Isi Manual +</span>
                    </button>
                  )}
                </div>

                {/* Dropdown Pilihan Jenis Kegiatan */}
                <div className="relative">
                  <button
                    type="button"
                    disabled={isAbsent}
                    onClick={() =>
                      setOpenDropdown(
                        openDropdown === "kegiatan" ? null : "kegiatan",
                      )
                    }
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold shadow-xs hover:border-slate-400 cursor-pointer text-left"
                  >
                    <span className="line-clamp-1 leading-snug">
                      {selectedKegiatan
                        ? `${selectedKegiatan.num}. ${selectedKegiatan.label.replace(/^(1|2|3|4)\.\s*/, "")}`
                        : "-- Pilih Kegiatan --"}
                    </span>
                    <Icons.chevronDown
                      className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform duration-200 ${openDropdown === "kegiatan" ? "rotate-180" : ""}`}
                    />
                  </button>

                  {openDropdown === "kegiatan" && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* Search input for Kegiatan */}
                      <div className="p-1">
                        <input
                          ref={kegiatanSearchInputRef}
                          type="text"
                          value={kegiatanSearch}
                          onChange={(e) => setKegiatanSearch(e.target.value)}
                          placeholder="🔍 Cari opsi kegiatan..."
                          className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      </div>
                      <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {filteredKegiatanOptions.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-400 italic">
                          Tidak ada opsi kegiatan yang cocok.
                        </div>
                      ) : (
                      filteredKegiatanOptions.map((opt) => {
                        const isSel = smartKegiatanId === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setSmartKegiatanId(opt.id);
                              const cleanLabel = opt.label.replace(
                                /^(1|2|3|4)\.\s*/,
                                "",
                              );
                              const currentMateri =
                                materi || smartMateriText || "";
                              const newItem = currentMateri
                                ? `${cleanLabel} ${currentMateri}`
                                : cleanLabel;
                              setKegiatanItems([newItem]);
                              setOpenDropdown(null);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-start justify-between gap-2 cursor-pointer ${
                              isSel
                                ? "bg-brand-50 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300 font-extrabold"
                                : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                            }`}
                          >
                            <span className="wrap-break-word whitespace-normal leading-snug">
                              {opt.num}.{" "}
                              {opt.label.replace(/^(1|2|3|4)\.\s*/, "")}
                            </span>
                            {isSel && (
                              <span className="text-brand-600 shrink-0 text-xs font-bold mt-0.5">
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

                {/* Points List Input */}
                <div className="space-y-2 pt-0.5">
                  {kegiatanItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-sky-600 dark:text-sky-400 font-bold text-sm shrink-0 w-3.5 text-center">
                        •
                      </span>
                      <input
                        type="text"
                        value={item}
                        disabled={isAbsent}
                        onChange={(e) =>
                          handleKegiatanChange(idx, e.target.value)
                        }
                        placeholder={`Poin ${idx + 1}: Cth: Menulis angka`}
                        className={`flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:text-slate-400 ${
                          isAbsent
                            ? "bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-medium cursor-not-allowed"
                            : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        }`}
                      />
                      {!isAbsent && kegiatanItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeKegiatanItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Hapus Poin"
                        >
                          <Icons.close className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Pemahaman & Hasil Belajar Ananda */}
              <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-emerald-200/90 dark:border-slate-800 shadow-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    3. Pemahaman & Hasil Belajar Anak
                  </label>
                  {!isAbsent && (
                    <button
                      type="button"
                      onClick={addHasilItem}
                      className="text-[11px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/60 hover:bg-emerald-200 px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      <Icons.add className="w-3.5 h-3.5 shrink-0" />
                      <span className="whitespace-nowrap">Isi Manual +</span>
                    </button>
                  )}
                </div>

                {/* Dropdown Pemahaman / Hasil Evaluasi 1/2/3/4 */}
                <div className="relative">
                  <button
                    type="button"
                    disabled={isAbsent}
                    onClick={() =>
                      setOpenDropdown(
                        openDropdown === "pemahaman" ? null : "pemahaman",
                      )
                    }
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-slate-800 text-emerald-950 dark:text-emerald-200 text-xs font-semibold shadow-xs hover:border-emerald-400 cursor-pointer text-left"
                  >
                    <span className="line-clamp-1 leading-snug">
                      {selectedPemahaman
                        ? `${selectedPemahaman.num}. ${selectedPemahaman.label.replace(/^(1|2|3|4)\.\s*/, "")}`
                        : "-- Pilih Pemahaman --"}
                    </span>
                    <Icons.chevronDown
                      className={`w-3.5 h-3.5 text-emerald-600 shrink-0 transition-transform duration-200 ${openDropdown === "pemahaman" ? "rotate-180" : ""}`}
                    />
                  </button>

                  {openDropdown === "pemahaman" && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-emerald-200 dark:border-emerald-800 p-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* Search input for Pemahaman */}
                      <div className="p-1">
                        <input
                          ref={pemahamanSearchInputRef}
                          type="text"
                          value={pemahamanSearch}
                          onChange={(e) => setPemahamanSearch(e.target.value)}
                          placeholder="🔍 Cari opsi pemahaman..."
                          className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      </div>
                      <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {filteredPemahamanOptions.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-400 italic">
                          Tidak ada opsi pemahaman yang cocok.
                        </div>
                      ) : (
                      filteredPemahamanOptions.map((opt) => {
                        const isSel = smartPemahamanId === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              handlePemahamanChange(opt.id);
                              setOpenDropdown(null);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-start justify-between gap-2 cursor-pointer ${
                              isSel
                                ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-extrabold"
                                : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                            }`}
                          >
                            <span className="wrap-break-word whitespace-normal leading-snug">
                              {opt.num}.{" "}
                              {opt.label.replace(/^(1|2|3|4)\.\s*/, "")}
                            </span>
                            {isSel && (
                              <span className="text-emerald-600 shrink-0 text-xs font-bold mt-0.5">
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

                {/* Points List Input for Hasil Belajar */}
                <div className="space-y-2 pt-0.5">
                  {hasilBelajarItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm shrink-0 w-3.5 text-center">
                        •
                      </span>
                      <input
                        type="text"
                        value={item}
                        disabled={isAbsent}
                        onChange={(e) => handleHasilChange(idx, e.target.value)}
                        placeholder={`Poin ${idx + 1}: Cth: Sudah bisa menghitung mandiri`}
                        className={`flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400 ${
                          isAbsent
                            ? "bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-medium cursor-not-allowed"
                            : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        }`}
                      />
                      {!isAbsent && hasilBelajarItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeHasilItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Hapus Poin"
                        >
                          <Icons.close className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Rekomendasi Kegiatan di Rumah */}
              <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-amber-200/90 dark:border-slate-800 shadow-xs space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  4. Rekomendasi Kegiatan di Rumah
                </label>

                {/* Dropdown Rekomendasi Rumah */}
                <div className="relative">
                  <button
                    type="button"
                    disabled={isAbsent}
                    onClick={() =>
                      setOpenDropdown(openDropdown === "rumah" ? null : "rumah")
                    }
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/50 dark:bg-slate-800 text-amber-950 dark:text-amber-200 text-xs font-semibold shadow-xs hover:border-amber-400 cursor-pointer text-left"
                  >
                    <span className="line-clamp-1 leading-snug">
                      {selectedRumah
                        ? `${selectedRumah.num}. ${selectedRumah.label.replace(/^(1|2|3|4)\.\s*/, "")}`
                        : "-- Pilih Rekomendasi --"}
                    </span>
                    <Icons.chevronDown
                      className={`w-3.5 h-3.5 text-amber-600 shrink-0 transition-transform duration-200 ${openDropdown === "rumah" ? "rotate-180" : ""}`}
                    />
                  </button>

                  {openDropdown === "rumah" && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-800 p-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* Search input for Rekomendasi Rumah */}
                      <div className="p-1">
                        <input
                          ref={rumahSearchInputRef}
                          type="text"
                          value={rumahSearch}
                          onChange={(e) => setRumahSearch(e.target.value)}
                          placeholder="🔍 Cari opsi rekomendasi..."
                          className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      </div>
                      <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {filteredRumahOptions.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-400 italic">
                          Tidak ada opsi rekomendasi yang cocok.
                        </div>
                      ) : (
                      filteredRumahOptions.map((opt) => {
                        const isSel = smartRumahId === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setSmartRumahId(opt.id);
                              const cleanLabel = opt.label.replace(
                                /^(1|2|3|4)\.\s*/,
                                "",
                              );
                              setRekomendasiRumah(
                                `Untuk di rumah Ananda bisa ${cleanLabel.toLowerCase()}`,
                              );
                              setOpenDropdown(null);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-start justify-between gap-2 cursor-pointer ${
                              isSel
                                ? "bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-extrabold"
                                : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                            }`}
                          >
                            <span className="wrap-break-word whitespace-normal leading-snug">
                              {opt.num}.{" "}
                              {opt.label.replace(/^(1|2|3|4)\.\s*/, "")}
                            </span>
                            {isSel && (
                              <span className="text-amber-600 shrink-0 text-xs font-bold mt-0.5">
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

                {/* Direct Text Input for Rumah */}
                <input
                  type="text"
                  value={rekomendasiRumah}
                  disabled={isAbsent}
                  onChange={(e) => setRekomendasiRumah(e.target.value)}
                  placeholder="Contoh: Mengulang materi hari ini di rumah"
                  className={`w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400 ${
                    isAbsent
                      ? "bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-medium cursor-not-allowed"
                      : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  }`}
                />
              </div>

              {/* 5. Afirmasi Positif & Catatan Guru */}
              <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-sky-200/90 dark:border-slate-800 shadow-xs space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  5. Afirmasi Positif & Catatan Guru untuk Orang Tua
                </label>

                {/* Dropdown Afirmasi Positif */}
                <div className="relative">
                  <button
                    type="button"
                    disabled={isAbsent}
                    onClick={() =>
                      setOpenDropdown(
                        openDropdown === "afirmasi" ? null : "afirmasi",
                      )
                    }
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-sky-300 dark:border-sky-800/80 bg-sky-50/50 dark:bg-slate-800 text-sky-950 dark:text-sky-200 text-xs font-semibold shadow-xs hover:border-sky-400 cursor-pointer text-left"
                  >
                    <span className="line-clamp-1 leading-snug">
                      {selectedAfirmasi
                        ? `${selectedAfirmasi.num}. ${selectedAfirmasi.label.replace(/^(1|2|3|4)\.\s*/, "")}`
                        : "-- Pilih Afirmasi --"}
                    </span>
                    <Icons.chevronDown
                      className={`w-3.5 h-3.5 text-sky-600 shrink-0 transition-transform duration-200 ${openDropdown === "afirmasi" ? "rotate-180" : ""}`}
                    />
                  </button>

                  {openDropdown === "afirmasi" && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-sky-200 dark:border-sky-800 p-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* Search input for Afirmasi */}
                      <div className="p-1">
                        <input
                          ref={afirmasiSearchInputRef}
                          type="text"
                          value={afirmasiSearch}
                          onChange={(e) => setAfirmasiSearch(e.target.value)}
                          placeholder="🔍 Cari opsi afirmasi..."
                          className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      </div>
                      <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {filteredAfirmasiOptions.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-400 italic">
                          Tidak ada opsi afirmasi yang cocok.
                        </div>
                      ) : (
                      filteredAfirmasiOptions.map((opt) => {
                        const isSel = smartAfirmasiId === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              handleAfirmasiChange(opt.id);
                              setOpenDropdown(null);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-start justify-between gap-2 cursor-pointer ${
                              isSel
                                ? "bg-sky-100 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200 font-extrabold"
                                : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                            }`}
                          >
                            <span className="wrap-break-word whitespace-normal leading-snug">
                              {opt.num}.{" "}
                              {opt.label.replace(/^(1|2|3|4)\.\s*/, "")}
                            </span>
                            {isSel && (
                              <span className="text-sky-600 shrink-0 text-xs font-bold mt-0.5">
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

                {/* Direct Textarea Input for Catatan Guru */}
                <textarea
                  rows={2}
                  value={catatanGuru}
                  disabled={isAbsent}
                  onChange={(e) => setCatatanGuru(e.target.value)}
                  placeholder="Tuliskan apresiasi, saran, atau pesan untuk orang tua..."
                  className={`w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:text-slate-400 ${
                    isAbsent
                      ? "bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-medium cursor-not-allowed"
                      : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* ── SECTION 4: Lampiran (Opsional) ── */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-500 text-white text-[11px] font-extrabold shrink-0">
                4
              </span>
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  📎 Lampiran
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Opsional
                </span>
              </div>
            </div>

            {/* Upload File Foto ke Google Drive */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                📸 Upload Foto Hasil Belajar (Otomatis ke Google Drive):
              </label>

              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  {/* Input 1: Galeri / File */}
                  <input
                    type="file"
                    accept="image/*"
                    id="gdrive-file-input-gallery"
                    className="hidden"
                    onChange={(e) => {
                      handleFileChange(e);
                      if (e.target.files?.[0]) {
                        handleUploadToGDrive(e.target.files[0]);
                      }
                    }}
                  />

                  {/* Input 2: Kamera Langsung */}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    id="gdrive-file-input-camera"
                    className="hidden"
                    onChange={(e) => {
                      handleFileChange(e);
                      if (e.target.files?.[0]) {
                        handleUploadToGDrive(e.target.files[0]);
                      }
                    }}
                  />

                  {/* Tombol Kamera */}
                  <label
                    htmlFor="gdrive-file-input-camera"
                    className="px-3.5 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-brand-200 dark:border-brand-800 shadow-xs active:scale-95 flex-1"
                  >
                    <span className="text-sm">📷</span>
                    <span>Ambil Foto (Kamera)</span>
                  </label>

                  {/* Tombol Galeri */}
                  <label
                    htmlFor="gdrive-file-input-gallery"
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-300 dark:border-slate-700 shadow-xs active:scale-95 flex-1"
                  >
                    <span className="text-sm">🖼️</span>
                    <span>Pilih dari Galeri</span>
                  </label>
                </div>

                {isUploadingGDrive && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400 animate-pulse pt-1">
                    <span className="w-3.5 h-3.5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></span>
                    <span>Mengunggah ke Google Drive...</span>
                  </div>
                )}
              </div>

              {/* Preview Image */}
              {filePreviewUrl && (
                <div className="relative inline-block mt-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm max-w-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={filePreviewUrl}
                    alt="Preview Lampiran"
                    className="w-full h-32 object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setFilePreviewUrl(null);
                      setGdriveLink("");
                    }}
                    className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md cursor-pointer"
                    title="Hapus Foto"
                  >
                    <Icons.close className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {uploadError && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-[11px] text-red-600 dark:text-red-400">
                  ⚠️ {uploadError}
                </div>
              )}
            </div>

            {/* Google Drive Link */}
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                <span>
                  Link Google Drive (Otomatis terisi saat upload atau paste
                  manual):
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                  🟢 Free Tier Safe
                </span>
              </label>
              <input
                type="url"
                value={gdriveLink}
                onChange={(e) => setGdriveLink(e.target.value)}
                placeholder="https://drive.google.com/file/d/.../view"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-400 font-mono"
              />
              {fileId ? (
                <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center justify-between gap-2">
                  <span className="truncate">
                    ✓ Format valid! ID: <strong>{fileId}</strong>
                  </span>
                  <a
                    href={getGDriveDirectLink(gdriveLink)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline shrink-0 hover:text-emerald-900"
                  >
                    Tes Unduh
                  </a>
                </div>
              ) : gdriveLink ? (
                <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                  ⚠️ Pastikan link bisa diakses publik.
                </p>
              ) : null}
            </div>
          </div>

          {/* ── SECTION 5: Live Preview Tampilan Portal Orang Tua ── */}
          <div className="rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/80 bg-indigo-50/40 dark:bg-indigo-950/20 p-3 sm:p-4 space-y-2 sm:space-y-3">
            {/* Preview mengalir natural — scroll ditangani form induk agar scroll touch lancar */}
            <div className="rounded-xl border border-indigo-200/50 dark:border-indigo-900/50 px-2 sm:px-3 pt-2 sm:pt-3 pb-2 sm:pb-3 space-y-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-extrabold shrink-0">
                      5
                    </span>
                    <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                      👁️ Preview Tampilan Portal Orang Tua
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 shrink-0">
                    Live Preview
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium pl-8">
                  Tampilan persis yang akan dilihat oleh Orang Tua (
                  {activeStudentName})
                </p>
              </div>

              {/* Container Matching DailyWorksheetSessionItem */}
              <div
                className={`rounded-2xl border-2 overflow-hidden shadow-sm space-y-0 ${
                  attendanceStatus === "SAKIT"
                    ? "bg-red-50/40 dark:bg-red-950/20 border-red-500/80 dark:border-red-600"
                    : attendanceStatus === "IJIN"
                      ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-400 dark:border-amber-700"
                      : attendanceStatus === "LIBUR_HARI_BESAR"
                        ? "bg-purple-50/40 dark:bg-purple-950/20 border-purple-400 dark:border-purple-700"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                }`}
              >
                {/* Header Bar */}
                <div
                  className={`px-4 py-3 border-b ${
                    attendanceStatus === "SAKIT"
                      ? "bg-red-100 dark:bg-red-950/90 border-red-200 dark:border-red-900/60"
                      : attendanceStatus === "IJIN"
                        ? "bg-amber-100 dark:bg-amber-950/90 border-amber-200 dark:border-amber-900/60"
                        : attendanceStatus === "LIBUR_HARI_BESAR"
                          ? "bg-purple-100 dark:bg-purple-950/90 border-purple-200 dark:border-purple-900/60"
                          : "bg-slate-100/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 text-xs font-medium flex-1">
                      <div className="grid grid-cols-[90px_auto_1fr] gap-x-1.5 items-baseline">
                        <span className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">
                          Hari/tgl
                        </span>
                        <span className="font-extrabold text-slate-700">:</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {formatShortDate(worksheetDate)}
                        </span>
                      </div>

                      <div className="grid grid-cols-[90px_auto_1fr] gap-x-1.5 items-baseline">
                        <span className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">
                          Materi
                        </span>
                        <span className="font-extrabold text-slate-700">:</span>
                        <span className="font-bold text-brand-600 dark:text-brand-400">
                          {materi || title || "-"}
                        </span>
                      </div>

                      <div className="grid grid-cols-[90px_auto_1fr] gap-x-1.5 items-baseline">
                        <span className="font-bold uppercase text-[10px] text-slate-500 tracking-wider">
                          Pembimbing
                        </span>
                        <span className="font-extrabold text-slate-700">:</span>
                        <span className="font-extrabold italic text-slate-900 dark:text-white">
                          {ttdGuru || "-"}
                        </span>
                      </div>
                    </div>

                    {/* Status Badges */}
                    {attendanceStatus === "SAKIT" && (
                      <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-black tracking-wider shadow-xs shrink-0 flex items-center gap-1.5">
                        🤒 SAKIT
                      </span>
                    )}
                    {attendanceStatus === "IJIN" && (
                      <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-black tracking-wider shadow-xs shrink-0 flex items-center gap-1.5">
                        📩 IJIN
                      </span>
                    )}
                    {attendanceStatus === "LIBUR_HARI_BESAR" && (
                      <span className="px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-black tracking-wider shadow-xs shrink-0 flex items-center gap-1.5">
                        🎉 LIBUR
                      </span>
                    )}
                  </div>
                </div>

                {/* 2-Column Table */}
                <div className="overflow-x-auto touch-pan-x">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr
                        className={
                          attendanceStatus === "SAKIT"
                            ? "bg-red-600 text-white font-extrabold uppercase tracking-wider text-center"
                            : attendanceStatus === "IJIN"
                              ? "bg-amber-500 text-white font-extrabold uppercase tracking-wider text-center"
                              : attendanceStatus === "LIBUR_HARI_BESAR"
                                ? "bg-purple-600 text-white font-extrabold uppercase tracking-wider text-center"
                                : "bg-[#00A3E0] dark:bg-sky-700 text-white font-extrabold uppercase tracking-wider text-center"
                        }
                      >
                        <th className="py-2.5 px-4 min-w-32.5 border-r border-white/20 text-left">
                          Kegiatan
                        </th>
                        <th className="py-2.5 px-4 min-w-32.5 text-left">
                          Hasil belajar
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        <td className="py-3 px-4 font-medium border-r border-slate-200 dark:border-slate-800 align-top">
                          {kegiatanItems.filter((i) => i.trim()).length > 0 ? (
                            kegiatanItems
                              .filter((i) => i.trim())
                              .map((line, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-1.5 leading-relaxed"
                                >
                                  <span className="text-sky-500 font-bold shrink-0 mt-0.5">
                                    -
                                  </span>
                                  <span>{formatAnandaLine(line)}</span>
                                </div>
                              ))
                          ) : (
                            <span className="text-slate-400 italic">
                              - Belum diisi -
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium align-top">
                          {hasilBelajarItems.filter((i) => i.trim()).length >
                          0 ? (
                            hasilBelajarItems
                              .filter((i) => i.trim())
                              .map((line, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-1.5 leading-relaxed"
                                >
                                  <span className="text-sky-500 font-bold shrink-0 mt-0.5">
                                    -
                                  </span>
                                  <span>{formatAnandaLine(line)}</span>
                                </div>
                              ))
                          ) : (
                            <span className="text-slate-400 italic">
                              - Belum diisi -
                            </span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Action Bar (File link if present) */}
                {gdriveLink && (
                  <div className="flex items-center justify-between px-4 py-2 border-t bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold shadow-2xs">
                        📄 Lihat File
                      </span>
                    </div>
                  </div>
                )}

                {/* Rekomendasi di Rumah (if filled) */}
                {rekomendasiRumah && (
                  <div className="p-3 border-t text-xs bg-amber-50/70 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40">
                    <span className="font-extrabold mr-2 text-amber-800 dark:text-amber-300">
                      🏡 Rekomendasi di Rumah:
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {rekomendasiRumah}
                    </span>
                  </div>
                )}

                {/* Catatan Guru (if filled) */}
                {catatanGuru && (
                  <div className="p-3 border-t text-xs bg-sky-50/70 dark:bg-sky-950/30 border-sky-100 dark:border-sky-900/40">
                    <span className="font-extrabold mr-2 text-sky-800 dark:text-sky-300">
                      ✍️ Catatan Guru:
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {catatanGuru}
                    </span>
                  </div>
                )}

                {/* Box Saran Ortu */}
                <div className="p-3.5 border-t-2 bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <span>💬 SARAN :</span>
                      <span className="text-[11px] font-normal lowercase text-emerald-600 dark:text-emerald-400">
                        (masukan / tanggapan orang tua)
                      </span>
                    </span>
                  </div>
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-white/90 dark:bg-slate-900/90 border border-emerald-300 dark:border-emerald-800/60 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5">
                    <span>+ Tambah Saran / Masukan</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200/60 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50 flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 active:scale-[0.99] transition-all shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              {isSubmitting
                ? "Memproses..."
                : isEditing
                  ? "✓ Simpan Perubahan"
                  : "✓ Simpan Laporan Perkembangan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
