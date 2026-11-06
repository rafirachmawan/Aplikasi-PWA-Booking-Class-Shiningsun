"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Icons } from "@/components/ui/icons";
import {
  createWorksheet,
  updateWorksheet,
  getAssessmentTemplates,
} from "@/lib/actions";
import { extractGDriveFileId } from "@/lib/gdriveUtils";
import { getTodayISO, formatShortDate, parseIndonesianDateToISO } from "@/lib/dateUtils";
import { getHolidayName } from "@/lib/holidays";
import { normalizeClientTime, normalizeClientDate, parseBulletList, compressImage } from "./worksheetFormUtils";
import { WorksheetLivePreviewSection } from "./form-parts/WorksheetLivePreviewSection";
import { WorksheetMediaUploader } from "./form-parts/WorksheetMediaUploader";
import { WorksheetAssessmentSection } from "./form-parts/WorksheetAssessmentSection";
import { WorksheetBasicInfoSection } from "./form-parts/WorksheetBasicInfoSection";

interface WorksheetFormModalProps {
  students: any[];
  teachers?: any[];
  templates?: any[];
  labels?: any[];
  initialData?: any;
  worksheets?: any[];
  lockedStudentId?: string; // Student ID from dashboard - if present, dropdown is locked
  currentDate?: string; // Optional: pass current date for calculation (default to today)
  // Konteks jadwal (opsional, untuk cegah double per jam — tidak mengubah flow lama jika kosong)
  scheduleSlotId?: string;
  scheduleTime?: string; // "HH:MM" / "HH:MM:SS"
  scheduleClassName?: string;
  // Mode baca dari dashboard: tampilkan laporan yang sudah ada apa adanya,
  // tidak bisa diubah/disimpan (ubah tetap dari halaman Laporan Perkembangan).
  readOnly?: boolean;
  onClose: () => void;
  onSuccess: (message?: string) => void;
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
  scheduleSlotId,
  scheduleTime,
  scheduleClassName,
  readOnly = false,
  onClose,
  onSuccess,
}: WorksheetFormModalProps) {
  const isEditing = !!initialData?.id;
  // Mode baca hanya valid bila ada baris laporan yang dimuat (ada id).
  const isReadOnly = readOnly && isEditing;

  // Ambil template terbaru sesuai cabang aktif setiap kali modal dibuka,
  // agar dropdown tidak memakai data lama dari cabang lain.
  const [templateList, setTemplateList] = useState<any[]>(templates);
  useEffect(() => {
    let active = true;
    getAssessmentTemplates().then((fresh) => {
      if (active && Array.isArray(fresh)) setTemplateList(fresh);
    });
    return () => {
      active = false;
    };
  }, []);

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
      setStudentId(lockedStudentId);
    }
  }, [lockedStudentId]);

  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [worksheetDate, setWorksheetDate] = useState(
    initialData?.worksheet_date ||
      (!initialData?.id && currentDate ? currentDate : getTodayISO()),
  );
  const [gdriveLink, setGdriveLink] = useState(initialData?.gdrive_link || "");
  const [materi, setMateri] = useState(initialData?.materi || "");
  const [manualScheduleTime, setManualScheduleTime] = useState(
    initialData?.schedule_time || "",
  );

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
  // Saat memuat baris yang sudah ada (mode edit/baca), ambil dari baris
  // pertama kegiatan agar dropdown alasan tampil benar.
  const [absenceReason, setAbsenceReason] = useState(() => {
    const t0 = initialData?.title || "";
    const m0 = initialData?.materi || "";
    const isAbs =
      t0.includes("Ijin") ||
      m0.includes("Ijin") ||
      t0.includes("Sakit") ||
      m0.includes("Sakit");
    if (!isAbs) return "";
    const lines = parseBulletList(initialData?.kegiatan);
    const first = (lines[0] || "").trim();
    return first && first !== "-" ? first : "";
  });

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

  // State for Bulan Ke - Dropdown + Manual (mode edit langsung terisi dari data tersebut)
  const [bulanKe, setBulanKe] = useState<string>(() =>
    initialData?.bulan_ke != null ? String(initialData.bulan_ke) : "",
  );
  const [manualBulanKe, setManualBulanKe] = useState<string>("");

  // Mode Edit: otomatis tampilkan Bulan ke- berdasarkan data tersebut (tidak mengubah logika tambah baru)
  useEffect(() => {
    if (isEditing && initialData?.bulan_ke != null) {
      setBulanKe(String(initialData.bulan_ke));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, initialData?.id]);

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

            setTimeout(() => {
              setBulanKe(calculated.toString());
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
      setKegiatanItems([reason || "Ijin (Tidak Mengikuti Sesi Kelas)"]);
      setHasilBelajarItems([reason || "Ijin"]);
      setCatatanGuru(
        "Tidak dapat mengikuti kelas hari ini karena Ijin.",
      );
      setRekomendasiRumah(
        "Dapat mempelajari materi mandiri jika memungkinkan.",
      );
    } else if (status === "SAKIT") {
      const reason = sakitReasonTemplates[0]?.title || "";
      setAbsenceReason(reason);
      setMateri("Tidak Hadir (Sakit)");
      setKegiatanItems([reason || "Sakit (Istirahat di Rumah)"]);
      setHasilBelajarItems([reason || "Sakit"]);
      setCatatanGuru(
        "Tidak dapat mengikuti kelas hari ini karena Sakit. Semoga lekas sembuh! 🌸",
      );
      setRekomendasiRumah("Istirahat yang cukup hingga kondisi fit kembali.");
    } else if (status === "LIBUR" || status === "LIBUR_HARI_BESAR") {
      const iso = parseIndonesianDateToISO(worksheetDateInput || getTodayISO());
      const holiday = iso ? getHolidayName(iso) : null;
      const reason = liburReasonTemplates[0]?.title || "";
      setAbsenceReason(reason);
      setMateri(holiday ? `Libur Hari Besar (${holiday})` : "Libur Hari Besar");
      // Kegiatan & hasil belajar mengikuti libur global (nama hari besar),
      // bukan dari template libur cabang.
      const liburLine = holiday
        ? `Hari ini belajar di rumah dikarenakan Libur Hari Besar (${holiday})`
        : "Hari ini belajar di rumah dikarenakan Libur Hari Besar";
      setKegiatanItems([liburLine]);
      setHasilBelajarItems([liburLine]);
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
      // Guard pra-upload: file raksasa (>15MB) hampir pasti timeout/OOM saat
      // kompresi — tolak di awal dengan pesan jelas (bukan ubah alur sukses).
      if (file.size > 15 * 1024 * 1024) {
        setSelectedFile(null);
        setFilePreviewUrl(null);
        setUploadError(
          "File terlalu besar (maks 15 MB). Kecilkan dulu sebelum memilih.",
        );
        return;
      }
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

    // Refresh sesi di browser secara proaktif jika token hampir habis / idle
    try {
      const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (sbUrl && sbKey) {
        const sb = createBrowserClient(sbUrl, sbKey);
        const { data: sessionData } = await sb.auth.getSession();
        const exp = sessionData.session?.expires_at ?? 0;
        if (!sessionData.session || (exp > 0 && exp * 1000 - Date.now() < 10 * 60 * 1000)) {
          await sb.auth.refreshSession();
        }
      }
    } catch {
      // Abaikan jika gagal cek awal, lanjut mencoba
    }

    // Kompresi sekali di awal — tidak diulang per retry (hemat 2-5 dtk per attempt).
    let compressedFile: File;
    try {
      compressedFile = target.type?.startsWith("image/")
        ? await compressImage(target)
        : target;
    } catch {
      compressedFile = target;
    }

    // Guard pasca-kompresi: hasil >5MB pasti bikin Origin spike/timeout —
    // gagalkan cepat dengan pesan jelas (alur sukses tidak berubah).
    if (compressedFile.size > 5 * 1024 * 1024) {
      setUploadError(
        "File masih lebih dari 5 MB setelah kompresi. Kecilkan file lalu coba lagi.",
      );
      setIsUploadingGDrive(false);
      return;
    }

    // Upload terpisah dari Simpan: gagal upload tidak boleh blokir Simpan.
    const uploadOnce = async (signal: AbortSignal) => {
      const formData = new FormData();
      formData.append("file", compressedFile);

      const res = await fetch("/api/upload-gdrive", {
        method: "POST",
        body: formData,
        signal,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err: any = new Error(data.error || "Gagal mengunggah ke Google Drive");
        err.status = res.status;
        err.code = data.code;
        throw err;
      }
      return data;
    };

    try {
      let lastErr: any = null;
      const TIMEOUTS = [30000, 40000, 50000];
      for (let attempt = 1; attempt <= 3; attempt++) {
        // Jeda antar retry (attempt 2: 1 dtk, attempt 3: 2 dtk)
        if (attempt > 1) {
          await new Promise((r) => setTimeout(r, (attempt - 1) * 1000));
        }
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), TIMEOUTS[attempt - 1]);
        try {
          const data = await uploadOnce(ctrl.signal);
          clearTimeout(timer);
          if (data.gdriveLink) {
            setGdriveLink(data.gdriveLink);
          }
          lastErr = null;
          break;
        } catch (e: any) {
          clearTimeout(timer);
          lastErr = e;

          // Jika 401 Unauthorized / Sesi berakhir:
          if (e?.status === 401 || e?.code === "UNAUTHORIZED" || /unauthorized|sesi login/i.test(e?.message || "")) {
            // Coba perbarui sesi di browser 1x
            try {
              const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
              const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
              if (sbUrl && sbKey) {
                const sb = createBrowserClient(sbUrl, sbKey);
                const refreshResult = await sb.auth.refreshSession();
                if (refreshResult.data?.session) {
                  // Berhasil refresh, coba upload 1x lagi
                  const retryCtrl = new AbortController();
                  const retryTimer = setTimeout(() => retryCtrl.abort(), 30000);
                  try {
                    const retryData = await uploadOnce(retryCtrl.signal);
                    clearTimeout(retryTimer);
                    if (retryData.gdriveLink) {
                      setGdriveLink(retryData.gdriveLink);
                    }
                    lastErr = null;
                    break;
                  } catch (reErr: any) {
                    clearTimeout(retryTimer);
                    lastErr = reErr;
                  }
                }
              }
            } catch {}

            // Jika masih gagal setelah dicoba refresh, STOP retry loop seketika!
            if (lastErr) {
              setUploadError(lastErr.message || "Sesi login Anda telah berakhir. Silakan login ulang.");
              break;
            }
          }

          if (e?.name === "AbortError") {
            setUploadError(
              attempt < 3
                ? `Upload timeout, mencoba ulang (${attempt}/3)...`
                : "Upload timeout. Laporan tetap bisa Disimpan dulu tanpa foto.",
            );
          } else if (e?.message === "Failed to fetch" || e?.name === "TypeError") {
            setUploadError(
              attempt < 3
                ? `Koneksi terputus, mencoba ulang (${attempt}/3)...`
                : "Koneksi gagal. Laporan tetap bisa Disimpan dulu tanpa foto.",
            );
          }
          if (attempt === 3) throw e;
        }
      }
      if (lastErr) throw lastErr;
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(
        err?.name === "AbortError"
          ? "Upload timeout. Laporan tetap bisa Disimpan dulu tanpa foto."
          : err?.message === "Failed to fetch" || err?.name === "TypeError"
            ? "Koneksi gagal. Laporan tetap bisa Disimpan dulu tanpa foto."
            : err.message || "Gagal mengunggah file",
      );
    } finally {
      setIsUploadingGDrive(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  // Guard anti double-click/double-submit (tidak mengubah logika simpan lain).
  const submittedRef = useRef(false);

  // Catatan: duplicateInfo ("sudah terisi") dideklarasikan setelah
  // worksheetDateInput agar tidak membaca state sebelum deklarasi.

  // --- Anti-kehilangan data: deteksi form kotor (hanya ketikan user) ---
  // studentId sengaja TIDAK dihitung agar form terkunci yang baru dibuka
  // tidak dianggap kotor dan tidak memicu draft kosong.
  const isDirty = useMemo(() => {
    const hasText =
      (title || "").trim() !== "" ||
      (materi || "").trim() !== "" ||
      (description || "").trim() !== "" ||
      (catatanGuru || "").trim() !== "" ||
      (rekomendasiRumah || "").trim() !== "" ||
      (ttdGuru || "").trim() !== "" ||
      (gdriveLink || "").trim() !== "" ||
      (manualBulanKe || "").trim() !== "" ||
      (bulanKe || "").trim() !== "";
    const hasItems =
      (kegiatanItems || []).some((x) => (x || "").trim() !== "") ||
      (hasilBelajarItems || []).some((x) => (x || "").trim() !== "");
    return hasText || hasItems;
  }, [
    title,
    materi,
    description,
    catatanGuru,
    rekomendasiRumah,
    ttdGuru,
    gdriveLink,
    manualBulanKe,
    bulanKe,
    kegiatanItems,
    hasilBelajarItems,
  ]);

  // Draft diperketat: per siswa + per jadwal (slot/jam + tanggal).
  // Besok ada jadwal lagi di siswa yang sama -> key beda -> tidak ngikut draft kemarin.
  // Jalur umum tanpa lockedStudentId -> draft DIMATIKAN (return null).
  const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari
  const getDraftContext = () => {
    const slotPart = (
      (scheduleSlotId || initialData?.schedule_slot_id || "").toString().trim() ||
      normalizeClientTime(scheduleTime || initialData?.schedule_time) ||
      "nonslot"
    )
      .replace(/[^a-zA-Z0-9:-]/g, "")
      .slice(0, 40) || "nonslot";
    let datePart = "";
    try {
      datePart = normalizeClientDate(
        parseIndonesianDateToISO(
          currentDate || initialData?.worksheet_date || getTodayISO(),
        ) || currentDate ||
          initialData?.worksheet_date ||
          getTodayISO(),
      );
    } catch {
      datePart = normalizeClientDate(
        (currentDate || initialData?.worksheet_date || getTodayISO()) as string,
      );
    }
    if (!datePart) datePart = normalizeClientDate(getTodayISO());
    return { slotPart, datePart };
  };

  const getDraftKey = (): string | null => {
    // Mode edit: tidak pakai draft (efek restore/autosave sudah skip isEditing),
    // kembalikan key edit agar penghapusan saat sukses tetap aman.
    if (initialData?.id) return `ws-draft-v1:edit-${initialData.id}`;
    // Jalur umum (tambah baru tanpa kunci siswa): draft dimatikan.
    if (!lockedStudentId) return null;
    const { slotPart, datePart } = getDraftContext();
    return `ws-draft-v1:new-${lockedStudentId}:${slotPart}:${datePart}`;
  };

  const handleSafeClose = () => {
    if (isSubmitting) return;
    // Mode baca: tidak ada yang bisa berubah, tutup langsung tanpa konfirmasi.
    if (isReadOnly) {
      onClose();
      return;
    }
    if (!isDirty) {
      onClose();
      return;
    }
    const dk = getDraftKey();
    if (
      !window.confirm(
        dk
          ? "Form belum disimpan. Tutup dan simpan sebagai draft khusus siswa + jadwal ini di HP (otomatis hilang 7 hari)?"
          : "Form belum disimpan. Tutup tanpa menyimpan?",
      )
    ) {
      return;
    }
    onClose();
  };

  // Restore draft sekali saat modal dibuka (hanya entri baru, tidak merubah data lama)
  // Catatan: tanggal dipulihkan di efek terpisah setelah worksheetDateInput dideklarasikan
  useEffect(() => {
    if (isEditing || draftRestored) return;
    try {
      const dk = getDraftKey();
      // Jalur umum: draft dimatikan + bersihkan sisa draft umum lama bila ada.
      if (!dk) {
        try {
          localStorage.removeItem("ws-draft-v1:new-all");
        } catch {
          // abaikan
        }
        setDraftRestored(true);
        return;
      }
      // Bersihkan key legacy format lama (per-siswa tanpa jadwal) agar tidak
      // membingungkan setelah rilis perketat ini.
      try {
        const legacy = `ws-draft-v1:new-${lockedStudentId}`;
        if (legacy !== dk) localStorage.removeItem(legacy);
        localStorage.removeItem("ws-draft-v1:new-all");
      } catch {
        // abaikan
      }
      const raw = localStorage.getItem(dk);
      if (!raw) {
        setDraftRestored(true);
        return;
      }
      const d = JSON.parse(raw);
      // Expiry 7 hari: draft basi diabaikan + dihapus.
      try {
        if (d.savedAt) {
          const age = Date.now() - new Date(d.savedAt).getTime();
          if (!Number.isNaN(age) && age > DRAFT_TTL_MS) {
            try {
              localStorage.removeItem(dk);
            } catch {
              // abaikan
            }
            setDraftRestored(true);
            return;
          }
        }
      } catch {
        // abaikan, lanjut validasi identitas
      }
      // Guard identitas penuh: draft hanya untuk siswa + jadwal ini.
      // Beda siswa / slot / tanggal -> buang, jangan restore field apa pun.
      const { slotPart, datePart } = getDraftContext();
      if (d.studentId && d.studentId !== lockedStudentId) {
        setDraftRestored(true);
        return;
      }
      if (d.slotId && d.slotId !== slotPart) {
        setDraftRestored(true);
        return;
      }
      if (d.scheduleDate && d.scheduleDate !== datePart) {
        setDraftRestored(true);
        return;
      }
      if (d.title) setTitle(d.title);
      if (d.description) setDescription(d.description);
      if (d.materi) setMateri(d.materi);
      if (Array.isArray(d.kegiatanItems) && d.kegiatanItems.length)
        setKegiatanItems(d.kegiatanItems);
      if (Array.isArray(d.hasilBelajarItems) && d.hasilBelajarItems.length)
        setHasilBelajarItems(d.hasilBelajarItems);
      if (d.catatanGuru) setCatatanGuru(d.catatanGuru);
      if (d.rekomendasiRumah) setRekomendasiRumah(d.rekomendasiRumah);
      if (d.ttdGuru) setTtdGuru(d.ttdGuru);
      if (d.bulanKe) setBulanKe(d.bulanKe);
      if (d.manualBulanKe) setManualBulanKe(d.manualBulanKe);
      if (d.gdriveLink) setGdriveLink(d.gdriveLink);
      // Status kehadiran ikut draft agar buka draft Ijin/Sakit tidak reset ke Hadir.
      if (
        d.attendanceStatus === "HADIR" ||
        d.attendanceStatus === "IJIN" ||
        d.attendanceStatus === "SAKIT" ||
        d.attendanceStatus === "LIBUR" ||
        d.attendanceStatus === "LIBUR_HARI_BESAR"
      ) {
        setAttendanceStatus(d.attendanceStatus);
      }
      if (typeof d.absenceReason === "string" && d.absenceReason.trim()) {
        setAbsenceReason(d.absenceReason);
      }
    } catch {
      // abaikan draft rusak
    } finally {
      setDraftRestored(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave draft tiap 2 detik jika kotor (hanya entri baru terkunci, lokal saja)
  // Tanggal disimpan di efek terpisah setelah worksheetDateInput dideklarasikan
  useEffect(() => {
    if (isEditing || !draftRestored) return;
    if (!isDirty) return;
    const dk = getDraftKey();
    if (!dk) return; // jalur umum: draft dimatikan
    const { slotPart, datePart } = getDraftContext();
    const t = setTimeout(() => {
      try {
        const prevRaw = localStorage.getItem(dk);
        const prev = prevRaw ? JSON.parse(prevRaw) : {};
        localStorage.setItem(
          dk,
          JSON.stringify({
            ...prev,
            studentId: lockedStudentId || studentId,
            slotId: slotPart,
            scheduleDate: datePart,
            title,
            description,
            materi,
            kegiatanItems,
            hasilBelajarItems,
            catatanGuru,
            rekomendasiRumah,
            ttdGuru,
            bulanKe,
            manualBulanKe,
            gdriveLink,
            attendanceStatus,
            absenceReason,
            savedAt: new Date().toISOString(),
          }),
        );
      } catch {
        // storage penuh / private mode -> abaikan
      }
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    studentId,
    title,
    description,
    materi,
    kegiatanItems,
    hasilBelajarItems,
    catatanGuru,
    rekomendasiRumah,
    ttdGuru,
    bulanKe,
    manualBulanKe,
    gdriveLink,
    attendanceStatus,
    absenceReason,
    isDirty,
    draftRestored,
  ]);

  // Trap tombol Back Android / swipe saat modal terbuka (tanpa merubah navigasi utama)
  useEffect(() => {
    try {
      window.history.pushState({ wsModal: true }, "");
    } catch {
      // abaikan webview ketat
    }
    const onPop = () => {
      // Jika form kotor, tahan di halaman dan minta konfirmasi via handleSafeClose
      if (isDirty && !isSubmitting) {
        try {
          window.history.pushState({ wsModal: true }, "");
        } catch {
          // abaikan
        }
        handleSafeClose();
      } else {
        // Form bersih -> biarkan Back menutup modal saja, jangan pindah ke /dashboard
        onClose();
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, isSubmitting]);

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
    const found = templateList.find((t) => t.id === tplId);
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
    templateList.forEach((t) => {
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
  }, [templateList, labels, activeStudentLabelId, activeStudentLabel]);

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
    if (selectedLevelId === "ALL") return templateList;
    return templateList.filter((t) => {
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
  }, [templateList, selectedLevelId, selectedLevelObj]);

  const materiTemplates = useMemo(() => {
    return filteredTemplatesByLevel.filter(
      (t) => (t.category || "materi") === "materi",
    );
  }, [filteredTemplatesByLevel]);

  // Global (not level-filtered) — same options as Template Penilaian
  const kegiatanTemplates = useMemo(() => {
    return templateList.filter(
      (t) => (t.category || "kegiatan") === "kegiatan",
    );
  }, [templateList]);

  const pemahamanTemplates = useMemo(() => {
    return templateList.filter((t) => t.category === "pemahaman");
  }, [templateList]);

  const rumahTemplates = useMemo(() => {
    return templateList.filter((t) => t.category === "rumah");
  }, [templateList]);

  const afirmasiTemplates = useMemo(() => {
    return templateList.filter((t) => t.category === "afirmasi");
  }, [templateList]);

  // Absence reason templates (ijin/sakit/libur) — not filtered by level
  const ijinReasonTemplates = useMemo(
    () => templateList.filter((t) => t.category === "ijin"),
    [templateList],
  );
  const sakitReasonTemplates = useMemo(
    () => templateList.filter((t) => t.category === "sakit"),
    [templateList],
  );
  const liburReasonTemplates = useMemo(
    () => templateList.filter((t) => t.category === "libur"),
    [templateList],
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

  // Date Input (calendar picker only, defaults to today —
  // khusus dari Laporan Terlewat otomatis pakai tanggal terlewatnya)
  const [worksheetDateInput, setWorksheetDateInput] = useState(
    initialData?.worksheet_date ||
      (!initialData?.id && currentDate ? currentDate : getTodayISO()),
  );

  // Sinkron tanggal dengan draft (terpisah agar tidak dipakai sebelum deklarasi)
  // Hanya untuk draft jadwal yang sama (sudah divalidasi di efek restore utama).
  useEffect(() => {
    if (isEditing || !draftRestored) return;
    try {
      const dk = getDraftKey();
      if (!dk) return;
      const raw = localStorage.getItem(dk);
      if (!raw) return;
      const d = JSON.parse(raw);
      const { slotPart, datePart } = getDraftContext();
      if (d.studentId && d.studentId !== lockedStudentId) return;
      if (d.slotId && d.slotId !== slotPart) return;
      if (d.scheduleDate && d.scheduleDate !== datePart) return;
      try {
        if (d.savedAt) {
          const age = Date.now() - new Date(d.savedAt).getTime();
          if (!Number.isNaN(age) && age > DRAFT_TTL_MS) return;
        }
      } catch {
        // abaikan, lanjut restore tanggal
      }
      if (d.worksheetDateInput) {
        setWorksheetDateInput(d.worksheetDateInput);
        setWorksheetDate(d.worksheetDateInput);
      }
    } catch {
      // abaikan
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftRestored]);

  useEffect(() => {
    if (isEditing || !draftRestored || !isDirty) return;
    const dk = getDraftKey();
    if (!dk) return;
    const t = setTimeout(() => {
      try {
        const prevRaw = localStorage.getItem(dk);
        const prev = prevRaw ? JSON.parse(prevRaw) : {};
        localStorage.setItem(
          dk,
          JSON.stringify({ ...prev, worksheetDateInput }),
        );
      } catch {
        // abaikan
      }
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worksheetDateInput, draftRestored, isDirty]);

  // Hidden date input for native calendar picker
  const [isCalendarPickerOpen, setIsCalendarPickerOpen] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const calendarPickerRef = useRef<HTMLDivElement>(null);

  // --- Cegah double: deteksi "sudah terisi" per siswa+tanggal+jam/slot ---
  // Aturan sama persis dengan server (createWorksheet). Data lama tanpa kolom
  // jadwal tetap terdeteksi via fallback tanggal saja. Mode edit dikecualikan.
  const duplicateInfo = useMemo(() => {
    const empty = { isDuplicate: false as const, matched: null as any };
    if (isEditing) return empty;
    // Identitas sama dengan saat submit agar cek duplikat tidak memeriksa siswa yang salah.
    const effStudent =
      lockedStudentId ||
      initialData?.student_id ||
      (students.length === 1 ? students[0]?.id : "") ||
      studentId;
    if (!effStudent) return empty;
    let effDate = "";
    try {
      effDate = normalizeClientDate(
        parseIndonesianDateToISO(worksheetDateInput || getTodayISO()),
      );
    } catch {
      effDate = "";
    }
    if (!effDate) return empty;
    const effSlot =
      (scheduleSlotId || initialData?.schedule_slot_id || "")
        .toString()
        .trim() || null;
    const effTime =
      normalizeClientTime(
        scheduleTime || manualScheduleTime || initialData?.schedule_time,
      ) || null;
    const list = Array.isArray(worksheets) ? worksheets : [];
    const matched =
      list.find((w: any) => {
        const wStudent = w.student_id || w.student?.id;
        if (wStudent !== effStudent) return false;
        if (normalizeClientDate(w.worksheet_date || w.created_at) !== effDate)
          return false;
        const wSlot = (w.schedule_slot_id || "").toString().trim();
        const wTime = normalizeClientTime(w.schedule_time);

        // 1. Jika keduanya memiliki slot_id: tabrakan hanya jika slot-nya sama
        if (effSlot && wSlot) {
          return wSlot === effSlot;
        }

        // 2. Jika keduanya memiliki jam sesi: tabrakan hanya jika jam-nya sama
        if (effTime && wTime) {
          return wTime === effTime;
        }

        // 3. Jika keduanya sama-sama tidak memiliki slot & tidak memiliki jam
        // (laporan umum tanggal yang sama tanpa konteks jam)
        if (!effSlot && !effTime && !wSlot && !wTime) {
          return true;
        }

        // Sesi dengan jam berbeda tidak dianggap duplikat (siswa boleh les 2 sesi sehari)
        return false;
      }) || null;
    return { isDuplicate: !!matched, matched };
  }, [
    isEditing,
    studentId,
    initialData,
    students,
    worksheetDateInput,
    worksheets,
    scheduleSlotId,
    scheduleTime,
    manualScheduleTime,
  ]);

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
    return defaultRumahOptions.filter((o) => o.label.toLowerCase().includes(q));
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

  // Khusus Laporan Terlewat: saat modal dibuka dengan currentDate (missedDate),
  // otomatiskan Tanggal ke tanggal terlewat tersebut (hanya untuk entri baru).
  useEffect(() => {
    if (!isEditing && currentDate) {
      setWorksheetDateInput(currentDate);
      setWorksheetDate(currentDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

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
    } catch {
      // Abaikan error parsing — tampilkan input asli di bawah
    }

    // If parsing fails, show original input
    return worksheetDateInput;
  }, [worksheetDateInput]);

  // Batch2: tanggal laporan SELALU dikunci (tidak bisa diganti) di semua alur:
  // - dari slot/jadwal & overdue: mengikuti tanggal jadwal (sudah benar sejak dibuka),
  // - umum: mengikuti tanggal default (hari ini).
  // Isi susulan tanggal lampau tetap bisa lewat tombol "Isi" pada jadwal/overdue-nya.
  const isDateLocked = true;

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
    // Guard anti double-submit (klik 2x / Enter cepat) — selain isSubmitting.
    if (isSubmitting || submittedRef.current) return;
    const finalTitle = title.trim() || materi.trim() || "Laporan Perkembangan";
    // Prioritas identitas terkunci agar draft/state basi tidak bisa
    // mengalihkan simpanan ke siswa lain. Hasil sama untuk alur tidak terkunci.
    const effectiveStudentId =
      lockedStudentId ||
      initialData?.student_id ||
      (students.length === 1 ? students[0].id : "") ||
      studentId;

    if (!isEditing && !effectiveStudentId) {
      setErrorMsg("Pilih siswa terlebih dahulu.");
      formRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!worksheetDateInput || !worksheetDateInput.trim()) {
      setErrorMsg("Pilih tanggal laporan terlebih dahulu.");
      formRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Blokir sejak awal jika terdeteksi sudah terisi (tanpa menyentuh server).
    if (!isEditing && duplicateInfo.isDuplicate) {
      setErrorMsg(
        "Laporan perkembangan siswa ini pada jadwal (tanggal & jam) tersebut sudah terisi. Tidak bisa isi 2x.",
      );
      formRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Batch2: tolak jam manual yang mustahil (mis. 02:00) sejak awal.
    // Hanya untuk entri baru tanpa konteks slot yang mengisi kolom opsional.
    // Jika siswa tak punya sesi tanggal itu (sesi tambahan), tetap diizinkan
    // seperti perilaku lama. Gagal cek (offline?) juga diizinkan.
    if (!isEditing && !scheduleTime) {
      const manualTimeNorm = normalizeClientTime(manualScheduleTime);
      if (manualTimeNorm) {
        try {
          const { getStudentSessionTimes } = await import("@/lib/actions");
          const effISO = parseIndonesianDateToISO(
            worksheetDateInput || getTodayISO(),
          );
          const sessionTimes =
            effectiveStudentId && effISO
              ? await getStudentSessionTimes(effectiveStudentId, effISO)
              : [];
          if (
            sessionTimes.length > 0 &&
            !sessionTimes.includes(manualTimeNorm)
          ) {
            const timeStudent =
              (students || []).find(
                (s: any) => s?.id === effectiveStudentId,
              ) || null;
            const timeName =
              timeStudent?.nickname || timeStudent?.name || "siswa ini";
            setErrorMsg(
              `Jam ${manualTimeNorm} tidak cocok dengan sesi ${timeName} pada tanggal tersebut (${sessionTimes.join(", ")}). Kosongkan kolom Jam Sesi jika hari ini hanya 1 sesi, atau pilih jam yang benar (format 24 jam, mis. 14:00 untuk jam 2 siang).`,
            );
            formRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }
        } catch {
          // abaikan, lanjut simpan seperti perilaku lama
        }
      }
    }

    // Determine effectiveBulanKe based on user input or auto-calculation
    let effectiveBulanKe = "";

    // Priority 1: User typed in manual field (bebas, tidak dibatasi 10)
    if (manualBulanKe.trim()) {
      const num = parseInt(manualBulanKe.trim(), 10);
      if (num >= 1) {
        effectiveBulanKe = manualBulanKe.trim();
      }
    }

    // Priority 2: User selected from dropdown (nilai auto-fill > 10 juga lolos)
    else if (bulanKe.trim()) {
      const num = parseInt(bulanKe.trim(), 10);
      if (num >= 1) {
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

    submittedRef.current = true;
    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const formData = new FormData();
      formData.append("student_id", effectiveStudentId);
      formData.append("title", finalTitle);
      formData.append(
        "description",
        description.trim(),
      );
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
      // Konteks jadwal untuk kunci duplikat per jam (opsional, aman jika kosong).
      const effSlotId = (
        scheduleSlotId ||
        initialData?.schedule_slot_id ||
        ""
      )
        .toString()
        .trim();
      const effTime =
        normalizeClientTime(
          scheduleTime || manualScheduleTime || initialData?.schedule_time,
        ) || "";
      if (!isEditing) {
        if (effSlotId) formData.append("schedule_slot_id", effSlotId);
        if (effTime) formData.append("schedule_time", effTime);
      } else {
        // Mode edit: kirim juga agar server bisa validasi tabrakan dengan
        // laporan lain (server mengecualikan diri sendiri).
        if (effSlotId) formData.append("schedule_slot_id", effSlotId);
        if (effTime) formData.append("schedule_time", effTime);
      }

      // Pastikan cookie sesi segar di browser sebelum mengirim Server Action
      // (mencegah gagal simpan setelah layar HP sempat mati / pindah aplikasi > 1 jam).
      const getBrowserSupabase = () => {
        const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!sbUrl || !sbKey) return null;
        return createBrowserClient(sbUrl, sbKey);
      };

      try {
        const sb = getBrowserSupabase();
        if (sb) {
          const { data: sessionData } = await sb.auth.getSession();
          const exp = sessionData.session?.expires_at ?? 0;
          // Jika sesi sudah kedaluwarsa atau sisa < 10 menit, perbarui dulu di browser
          if (!sessionData.session || (exp > 0 && exp * 1000 - Date.now() < 10 * 60 * 1000)) {
            await sb.auth.refreshSession();
          }
        }
      } catch {
        // Abaikan jika gagal cek awal, lanjut panggil Server Action
      }

      const runSaveAction = async () => {
        if (isEditing) {
          await updateWorksheet(initialData.id, formData);
        } else {
          await createWorksheet(formData);
        }
      };

      try {
        await runSaveAction();
      } catch (firstErr: any) {
        const firstMsg = String(firstErr?.message || "");
        if (
          /sesi login kedaluwarsa|auth session missing|jwt expired|invalid jwt|refresh token|not authenticated/i.test(
            firstMsg,
          )
        ) {
          // Auto-retry 1x setelah refresh sesi di browser
          try {
            const sb = getBrowserSupabase();
            if (sb) {
              await sb.auth.refreshSession();
            }
          } catch {
            // abaikan
          }
          await runSaveAction();
        } else {
          throw firstErr;
        }
      }

      // Sukses: hapus draft lokal jadwal ini (tidak menyentuh data server selain insert/update di atas)
      try {
        const dk = getDraftKey();
        if (dk) localStorage.removeItem(dk);
      } catch {
        // abaikan
      }
      // Notifikasi berhasil (hijau) + tutup otomatis agar user yakin tersimpan
      // dan tidak menekan Simpan 2x. Pesan dibuat eksplisit (nama+tanggal)
      // agar guru langsung yakin tanpa membuka ulang daftar.
      let okMsg = isEditing
        ? "✓ Perubahan laporan berhasil disimpan."
        : "✓ Laporan perkembangan berhasil disimpan.";
      try {
        const savedStudent =
          (students || []).find((s: any) => s?.id === effectiveStudentId) ||
          ((students || []).length === 1 ? students[0] : null);
        const savedName =
          savedStudent?.nickname || savedStudent?.name || "";
        const savedIso = parseIndonesianDateToISO(
          worksheetDateInput || getTodayISO(),
        );
        const savedDateLabel = savedIso ? formatShortDate(savedIso) : "";
        if (savedName || savedDateLabel) {
          const who = savedName ? ` ${savedName}` : "";
          const when = savedDateLabel ? ` (${savedDateLabel})` : "";
          okMsg = isEditing
            ? `✓ Perubahan laporan${who}${when} berhasil disimpan.`
            : `✓ Laporan${who}${when} sudah tersimpan — daftar diperbarui.`;
        }
      } catch {
        // abaikan, pakai pesan generik di atas
      }
      setSuccessMsg(okMsg);
      formRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      const done = () => {
        onClose();
        if (onSuccess) {
          try {
            onSuccess(okMsg);
          } catch (err) {
            console.error("onSuccess callback error:", err);
          }
        }
      };
      setTimeout(done, 1200);
    } catch (err: any) {
      console.error("Failed to save worksheet:", err);
      submittedRef.current = false;
      const raw = (err?.message || "").toString();
      // Terjemahkan error teknis menjadi pesan ramah tanpa merubah logika simpan
      let friendly = raw || "Gagal menyimpan laporan perkembangan.";
      if (/LAPORAN_SUDAH_TERISI/i.test(raw)) {
        friendly =
          "Laporan perkembangan siswa ini pada jadwal (tanggal & jam) tersebut sudah terisi. Tidak bisa isi 2x.";
      } else if (/unexpected response|failed to fetch|network|load failed/i.test(raw)) {
        friendly = getDraftKey()
          ? "Koneksi/server terputus saat menyimpan. Data Anda tetap aman sebagai draft khusus jadwal ini — coba tekan Simpan lagi. Jika masih gagal, refresh halaman lalu buka form jadwal yang sama (draft akan kembali)."
          : "Koneksi/server terputus saat menyimpan. Coba tekan Simpan lagi.";
      } else if (/auth session missing|jwt expired|invalid jwt|refresh token|not authenticated|user.*null/i.test(raw)) {
        friendly = getDraftKey()
          ? "Sesi login kedaluwarsa. Refresh halaman / login ulang, lalu buka form jadwal yang sama — draft Anda tersimpan otomatis di HP ini."
          : "Sesi login kedaluwarsa. Refresh halaman / login ulang, lalu coba simpan lagi.";
      } else if (/row-level security|policy|permission denied|42501/i.test(raw)) {
        friendly = getDraftKey()
          ? "Izin database menolak penyimpanan. Hubungi admin (jangan logout dulu) — draft jadwal ini tersimpan otomatis."
          : "Izin database menolak penyimpanan. Hubungi admin.";
      }
      setErrorMsg(friendly);
      formRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      // Saat sukses submittedRef tetap true -> tombol terkunci selama jeda
      // toast 1.2 detik. Saat gagal submittedRef sudah di-reset -> buka kunci.
      if (!submittedRef.current) setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/70 animate-in fade-in duration-200"
        onClick={handleSafeClose}
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
                {isReadOnly
                  ? "Lihat Laporan Perkembangan"
                  : isEditing
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
            onClick={handleSafeClose}
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
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50 flex items-center gap-2">
              <span>✅</span>
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200/60 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50">
              {errorMsg}
            </div>
          )}
          {!isEditing && duplicateInfo.isDuplicate && (
            <div className="p-3 rounded-xl bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/50 flex items-center gap-2">
              <span>⚠️</span>
              <span>
                Laporan untuk jadwal (tanggal & jam) ini sudah terisi — tidak
                bisa isi 2x.
                {(scheduleTime || initialData?.schedule_time) && (
                  <>
                    {" "}
                    Jam:{" "}
                    <strong>
                      {normalizeClientTime(
                        scheduleTime || initialData?.schedule_time,
                      )}
                    </strong>
                  </>
                )}
                {scheduleClassName && (
                  <>
                    {" "}• Kelas: <strong>{scheduleClassName}</strong>
                  </>
                )}
              </span>
            </div>
          )}
          {!isEditing && isDirty && !!lockedStudentId && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50">
              <span>💾 Draft khusus jadwal ini tersimpan di HP (7 hari)</span>
              <button
                type="button"
                onClick={() => {
                  try {
                    const dk = getDraftKey();
                    if (dk) localStorage.removeItem(dk);
                  } catch {
                    // abaikan
                  }
                  onClose();
                }}
                className="underline underline-offset-2 hover:opacity-80 shrink-0"
              >
                Buang draft
              </button>
            </div>
          )}

          {isReadOnly && (
            <div className="p-3 rounded-xl bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200/70 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-900/50 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span>🔒</span>
                <span>
                  Sudah terisi — mengikuti Laporan Perkembangan. Ubah tetap
                  dari sana.
                </span>
              </span>
              <a
                href={`/worksheets?student_id=${lockedStudentId || initialData?.student_id || ""}`}
                className="underline underline-offset-2 hover:opacity-80 shrink-0"
              >
                Buka Laporan
              </a>
            </div>
          )}

          {/* Mode baca: fieldset disabled mengunci semua input tanpa mengubah layout.
              Footer Simpan di luar fieldset agar tombol Batal tetap aktif. */}
          <fieldset
            disabled={isReadOnly}
            className="border-0 m-0 p-0 min-w-0 space-y-4 sm:space-y-5"
          >
          {/* ── SECTION 1: Info Dasar ── */}
          <WorksheetBasicInfoSection
            activeStudent={activeStudent}
            activeStudentName={activeStudentName}
            attendanceStatus={attendanceStatus}
            bulanKe={bulanKe}
            bulanKeDropdownRef={bulanKeDropdownRef}
            calendarPickerRef={calendarPickerRef}
            currentCalendarMonth={currentCalendarMonth}
            currentCalendarYear={currentCalendarYear}
            effectiveLockedStudentId={effectiveLockedStudentId}
            filteredStudents={filteredStudents}
            filteredTeachers={filteredTeachers}
            getCalendarDays={getCalendarDays}
            handleAttendanceChange={handleAttendanceChange}
            initialData={initialData}
            isAbsent={isAbsent}
            isBulanKeDropdownOpen={isBulanKeDropdownOpen}
            isCalendarPickerOpen={isCalendarPickerOpen}
            isDateLocked={isDateLocked}
            isEditing={isEditing}
            isStudentDropdownOpen={isStudentDropdownOpen}
            manualBulanKe={manualBulanKe}
            manualScheduleTime={manualScheduleTime}
            MONTH_NAMES={MONTH_NAMES}
            openCalendarPicker={openCalendarPicker}
            openDropdown={openDropdown}
            scheduleClassName={scheduleClassName}
            scheduleSlotId={scheduleSlotId}
            scheduleTime={scheduleTime}
            setBulanKe={setBulanKe}
            setCurrentCalendarMonth={setCurrentCalendarMonth}
            setCurrentCalendarYear={setCurrentCalendarYear}
            setIsBulanKeDropdownOpen={setIsBulanKeDropdownOpen}
            setIsStudentDropdownOpen={setIsStudentDropdownOpen}
            setManualBulanKe={setManualBulanKe}
            setManualScheduleTime={setManualScheduleTime}
            setOpenDropdown={setOpenDropdown}
            setStudentId={setStudentId}
            setStudentSearch={setStudentSearch}
            setTeacherSearch={setTeacherSearch}
            setTtdGuru={setTtdGuru}
            studentDropdownRef={studentDropdownRef}
            studentId={studentId}
            studentSearch={studentSearch}
            studentSearchInputRef={studentSearchInputRef}
            teachers={teachers}
            teacherSearch={teacherSearch}
            teacherSearchInputRef={teacherSearchInputRef}
            ttdGuru={ttdGuru}
            workSheetDateDisplay={workSheetDateDisplay}
          />

          {/* ── SECTION 2: Data Perkembangan & Catatan Evaluasi Anak ── */}
          <WorksheetAssessmentSection
            absenceReason={absenceReason}
            addHasilItem={addHasilItem}
            addKegiatanItem={addKegiatanItem}
            afirmasiSearch={afirmasiSearch}
            afirmasiSearchInputRef={afirmasiSearchInputRef}
            alasanSearch={alasanSearch}
            alasanSearchInputRef={alasanSearchInputRef}
            attendanceStatus={attendanceStatus}
            catatanGuru={catatanGuru}
            currentReasonTemplates={currentReasonTemplates}
            filteredAfirmasiOptions={filteredAfirmasiOptions}
            filteredAvailableLevels={filteredAvailableLevels}
            filteredKegiatanOptions={filteredKegiatanOptions}
            filteredMateriTemplates={filteredMateriTemplates}
            filteredPemahamanOptions={filteredPemahamanOptions}
            filteredReasonOptions={filteredReasonOptions}
            filteredRumahOptions={filteredRumahOptions}
            handleAbsenceReasonChange={handleAbsenceReasonChange}
            handleAfirmasiChange={handleAfirmasiChange}
            handleHasilChange={handleHasilChange}
            handleKegiatanChange={handleKegiatanChange}
            handlePemahamanChange={handlePemahamanChange}
            hasilBelajarItems={hasilBelajarItems}
            isAbsent={isAbsent}
            kegiatanItems={kegiatanItems}
            kegiatanSearch={kegiatanSearch}
            kegiatanSearchInputRef={kegiatanSearchInputRef}
            levelSearch={levelSearch}
            levelSearchInputRef={levelSearchInputRef}
            materi={materi}
            materiSearch={materiSearch}
            materiSearchInputRef={materiSearchInputRef}
            openDropdown={openDropdown}
            pemahamanSearch={pemahamanSearch}
            pemahamanSearchInputRef={pemahamanSearchInputRef}
            rekomendasiRumah={rekomendasiRumah}
            removeHasilItem={removeHasilItem}
            removeKegiatanItem={removeKegiatanItem}
            rumahSearch={rumahSearch}
            rumahSearchInputRef={rumahSearchInputRef}
            selectedAfirmasi={selectedAfirmasi}
            selectedKegiatan={selectedKegiatan}
            selectedLevelId={selectedLevelId}
            selectedLevelObj={selectedLevelObj}
            selectedPemahaman={selectedPemahaman}
            selectedRumah={selectedRumah}
            selectedStudentLabel={selectedStudentLabel}
            setAfirmasiSearch={setAfirmasiSearch}
            setAlasanSearch={setAlasanSearch}
            setCatatanGuru={setCatatanGuru}
            setKegiatanItems={setKegiatanItems}
            setKegiatanSearch={setKegiatanSearch}
            setLevelSearch={setLevelSearch}
            setMateri={setMateri}
            setMateriSearch={setMateriSearch}
            setOpenDropdown={setOpenDropdown}
            setPemahamanSearch={setPemahamanSearch}
            setRekomendasiRumah={setRekomendasiRumah}
            setRumahSearch={setRumahSearch}
            setSelectedLevelId={setSelectedLevelId}
            setSmartKegiatanId={setSmartKegiatanId}
            setSmartMateriText={setSmartMateriText}
            setSmartRumahId={setSmartRumahId}
            smartAfirmasiId={smartAfirmasiId}
            smartKegiatanId={smartKegiatanId}
            smartMateriText={smartMateriText}
            smartPemahamanId={smartPemahamanId}
            smartRumahId={smartRumahId}
          />

          {/* ── SECTION 4: Lampiran (Opsional) ── */}
          <WorksheetMediaUploader
            fileId={fileId}
            filePreviewUrl={filePreviewUrl}
            gdriveLink={gdriveLink}
            handleFileChange={handleFileChange}
            handleUploadToGDrive={handleUploadToGDrive}
            initialData={initialData}
            isEditing={isEditing}
            isUploadingGDrive={isUploadingGDrive}
            selectedFile={selectedFile}
            setFilePreviewUrl={setFilePreviewUrl}
            setGdriveLink={setGdriveLink}
            setSelectedFile={setSelectedFile}
            setUploadError={setUploadError}
            uploadError={uploadError}
          />

          {/* ── SECTION 5: Live Preview Tampilan Portal Orang Tua ── */}
          <WorksheetLivePreviewSection
            activeStudentName={activeStudentName}
            attendanceStatus={attendanceStatus}
            catatanGuru={catatanGuru}
            gdriveLink={gdriveLink}
            hasilBelajarItems={hasilBelajarItems}
            isAbsent={isAbsent}
            kegiatanItems={kegiatanItems}
            materi={materi}
            rekomendasiRumah={rekomendasiRumah}
            title={title}
            ttdGuru={ttdGuru}
            worksheetDate={worksheetDate}
          />

          </fieldset>

          {/* Submit Actions */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200/60 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50 flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50 flex items-center gap-2">
              <span>✅</span>
              <span>{successMsg}</span>
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleSafeClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Batal
            </button>
            {!isReadOnly && (
            <button
              type="submit"
              disabled={isSubmitting || (!isEditing && duplicateInfo.isDuplicate)}
              className="flex-1 px-6 py-3 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 active:scale-[0.99] transition-all shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting || successMsg
                ? successMsg || "Memproses..."
                : !isEditing && duplicateInfo.isDuplicate
                  ? "Sudah Terisi ✓"
                  : isEditing
                    ? "✓ Simpan Perubahan"
                    : "✓ Simpan Laporan Perkembangan"}
            </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
