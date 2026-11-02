"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icons } from "@/components/ui/icons";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { DatePickerInput } from "@/components/ui/DatePickerInput";

interface Label {
  id: string;
  main_level: string;
  sub_level: string;
  hex_color: string;
}

interface ClassOption {
  id: string;
  name: string;
  max_quota?: number;
}

interface StudentRegistrationFormProps {
  onClose: () => void;
  labels: Label[];
  classes?: ClassOption[];
  onSuccess: () => void;
  initialData?: any;
}

// Opsi jam sesi CG — sama dengan daftar jam di halaman Jadwal.
const SESSION_TIME_GROUPS: Array<{ label: string; times: string[] }> = [
  { label: "Pagi", times: ["08:00", "09:00", "10:00", "11:00"] },
  { label: "Sore", times: ["13:00", "14:00", "15:00", "16:00", "17:00"] },
];

/**
 * Ambil jam dari teks bebas WhatsApp.
 * Contoh: "kelas pagi jam 10 pagi" -> 10:00, "jam 4 sore" -> 16:00, "16:00" -> 16:00.
 */
function parseSessionTime(value: string): string | null {
  const lower = value.toLowerCase();
  const explicit = lower.match(/(\d{1,2})\s*[:.]\s*(\d{2})/);

  let hour: number | null = null;
  let minute = 0;

  if (explicit) {
    hour = parseInt(explicit[1], 10);
    minute = parseInt(explicit[2], 10);
  } else {
    const withPeriod = lower.match(/(\d{1,2})\s*(pagi|siang|sore|malam)/);
    const withJam = lower.match(/jam\s*(\d{1,2})/);
    if (withPeriod) hour = parseInt(withPeriod[1], 10);
    else if (withJam) hour = parseInt(withJam[1], 10);
  }

  if (hour === null || isNaN(hour)) return null;

  const period = lower.match(/(pagi|siang|sore|malam)/)?.[1];
  if (period === "sore" || period === "malam") {
    if (hour < 12) hour += 12;
  } else if (period === "siang" && hour < 11) {
    hour += 12;
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseIndonesianDate(dateStr: string) {
  if (!dateStr) return "";
  const cleaned = dateStr.trim();
  if (!cleaned) return "";

  // 1. Direct YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // 2. Numeric DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const numMatch = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (numMatch) {
    const day = numMatch[1].padStart(2, "0");
    const month = numMatch[2].padStart(2, "0");
    const year = numMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 2b. Numeric date dengan prefix hari, mis. "Senin, 02/11/2026"
  const embeddedNumMatch = cleaned.match(
    /(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})/,
  );
  if (embeddedNumMatch) {
    const day = embeddedNumMatch[1].padStart(2, "0");
    const month = embeddedNumMatch[2].padStart(2, "0");
    const year = embeddedNumMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 3. Textual dates e.g. "Senin, 15 Januari 2024" or "15 Jan 2024"
  const months: Record<string, string> = {
    januari: "01",
    jan: "01",
    februari: "02",
    feb: "02",
    maret: "03",
    mar: "03",
    april: "04",
    apr: "04",
    mei: "05",
    juni: "06",
    jun: "06",
    juli: "07",
    jul: "07",
    agustus: "08",
    agu: "08",
    agus: "08",
    september: "09",
    sep: "09",
    sept: "09",
    oktober: "10",
    okt: "10",
    november: "11",
    nov: "11",
    desember: "12",
    des: "12",
  };

  const parts = cleaned
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/[\/\-\.]/g, " ")
    .split(/\s+/);

  let day = "",
    month = "",
    year = "";

  for (const part of parts) {
    if (
      !isNaN(parseInt(part)) &&
      part.length <= 2 &&
      parseInt(part) >= 1 &&
      parseInt(part) <= 31
    ) {
      if (!day) day = part.padStart(2, "0");
    } else if (!isNaN(parseInt(part)) && part.length === 4) {
      year = part;
    } else if (months[part]) {
      month = months[part];
    }
  }

  if (day && month && year) {
    return `${year}-${month}-${day}`;
  }
  return "";
}

export function StudentRegistrationForm({
  onClose,
  labels,
  classes = [],
  onSuccess,
  initialData,
}: StudentRegistrationFormProps) {
  const [name, setName] = useState(initialData ? initialData.name : "");
  const [nickname, setNickname] = useState(initialData?.nickname || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [address, setAddress] = useState(initialData?.address || "");
  const [school, setSchool] = useState(initialData?.school || "");
  const [registrationDate, setRegistrationDate] = useState(
    initialData?.registration_date || new Date().toISOString().split("T")[0],
  );
  const [dob, setDob] = useState(initialData ? initialData.date_of_birth : "");
  const [status, setStatus] = useState(initialData ? initialData.status : "CG");
  const [gender, setGender] = useState(initialData?.gender || "");
  const [labelId, setLabelId] = useState(
    initialData?.label_id ? initialData.label_id : "",
  );

  // Jadwal sesi CG (hanya untuk pendaftaran baru berstatus CG)
  const [cgDate, setCgDate] = useState("");
  const [cgClassId, setCgClassId] = useState("");
  const [cgTime, setCgTime] = useState("");
  const [isCgClassOpen, setIsCgClassOpen] = useState(false);
  const [isCgTimeOpen, setIsCgTimeOpen] = useState(false);

  const [isLevelOpen, setIsLevelOpen] = useState(false);
  const [showWaAutofill, setShowWaAutofill] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cgFieldsRef = useRef<HTMLDivElement>(null);

  const [formError, setFormError] = useState("");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsLevelOpen(false);
      }
      if (
        cgFieldsRef.current &&
        !cgFieldsRef.current.contains(event.target as Node)
      ) {
        setIsCgClassOpen(false);
        setIsCgTimeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const [calculatedAge, setCalculatedAge] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto calculate age
  useEffect(() => {
    if (!dob) {
      setCalculatedAge("");
      return;
    }

    const birthDate = new Date(dob);
    const today = new Date();

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();

    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
      months += 12;
    }

    if (today.getDate() < birthDate.getDate()) {
      months--;
      if (months < 0) {
        months += 12;
      }
    }

    if (years === 0 && months === 0) {
      setCalculatedAge("Baru lahir");
    } else {
      setCalculatedAge(`${years} Tahun ${months} Bulan`);
    }
  }, [dob]);

  const isCgRegistration = status === "CG" && !initialData;

  const cgDayName = (() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cgDate)) return "";
    const [y, m, d] = cgDate.split("-").map(Number);
    if (!y || !m || !d) return "";
    return (
      ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][
        new Date(y, m - 1, d).getDay()
      ] || ""
    );
  })();

  // Tambahkan jam hasil autofill bila di luar daftar standar.
  const sessionTimeGroups = SESSION_TIME_GROUPS.map((group) => ({
    ...group,
    times: [...group.times],
  }));
  if (cgTime && !sessionTimeGroups.some((g) => g.times.includes(cgTime))) {
    const hour = parseInt(cgTime.split(":")[0], 10);
    const target = hour < 12 ? sessionTimeGroups[0] : sessionTimeGroups[1];
    target.times.push(cgTime);
    target.times.sort();
  }

  const selectedClass = classes.find((cls) => cls.id === cgClassId);

  const [cgDateSchedules, setCgDateSchedules] = useState<any[]>([]);
  const [isLoadingCgSchedules, setIsLoadingCgSchedules] = useState(false);

  useEffect(() => {
    if (!isCgRegistration || !/^\d{4}-\d{2}-\d{2}$/.test(cgDate)) {
      setCgDateSchedules([]);
      return;
    }
    let cancelled = false;
    setIsLoadingCgSchedules(true);
    import("@/lib/actions")
      .then(({ getSchedulesByDate }) => getSchedulesByDate(cgDate))
      .then((slots) => {
        if (!cancelled) setCgDateSchedules(slots || []);
      })
      .catch(() => {
        if (!cancelled) setCgDateSchedules([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCgSchedules(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isCgRegistration, cgDate]);

  const getCgRemainingSlots = (
    timeStr: string,
    classId: string,
  ): number | null => {
    if (!cgDate || !timeStr || !classId) return null;
    const cls = classes.find((c) => c.id === classId);
    const maxQuota = cls?.max_quota || 4;
    const normTime = timeStr.substring(0, 5);
    const slot = cgDateSchedules.find(
      (s) =>
        String(s.date || "").split("T")[0] === cgDate &&
        String(s.time || "").substring(0, 5) === normTime &&
        s.class_id === classId,
    );
    if (!slot) return maxQuota;
    return Math.max(0, maxQuota - (slot.bookings ? slot.bookings.length : 0));
  };

  const selectedSlotRemaining =
    cgDate && cgClassId && cgTime
      ? getCgRemainingSlots(cgTime, cgClassId)
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (isCgRegistration && !(cgDate && cgClassId && cgTime)) {
      setFormError("Jadwal CG wajib dipilih: tanggal sesi, kelas, dan jam.");
      return;
    }

    if (
      isCgRegistration &&
      !isLoadingCgSchedules &&
      selectedSlotRemaining !== null &&
      selectedSlotRemaining <= 0
    ) {
      setFormError(
        "Kuota kelas pada tanggal dan jam yang dipilih sudah penuh. Silakan pilih jam atau kelas lain.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("nickname", nickname);
      formData.append("phone", phone);
      formData.append("address", address);
      formData.append("school", school);
      formData.append("registration_date", registrationDate);
      formData.append("date_of_birth", dob);
      formData.append("status", status);
      formData.append("gender", gender);

      // Jadwal CG hanya dikirim saat pendaftaran baru berstatus CG.
      if (isCgRegistration) {
        formData.append("cg_date", cgDate);
        formData.append("cg_class_id", cgClassId);
        formData.append("cg_time", cgTime);
      }

      // If status is CG, we set label_id to empty/null to clear previous label
      if (status === "REGISTERED" && labelId) {
        formData.append("label_id", labelId);
      } else {
        formData.append("label_id", "");
      }

      if (initialData) {
        const { updateStudent } = await import("@/lib/actions");
        await updateStudent(initialData.id, formData);
      } else {
        const { createStudent } = await import("@/lib/actions");
        await createStudent(formData);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      setFormError(
        `Gagal menyimpan data siswa: ${error?.message || "Silakan coba lagi."}`,
      );
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cocokkan teks kelas dari WhatsApp ke nama kelas di Master Data.
  // Hanya memilih otomatis jika kandidatnya tunggal (hindari salah kelas).
  const matchClassIdByText = (value: string) => {
    const v = value.toLowerCase();
    const exactMatches = classes.filter(
      (cls) => cls.name && v.includes(cls.name.toLowerCase()),
    );
    if (exactMatches.length === 1) return exactMatches[0].id;

    // Fallback: "kelas pagi"/"kelas sore" -> kelas yang namanya mengandung kata tersebut.
    const keyword = ["pagi", "siang", "sore"].find((k) => v.includes(k));
    if (keyword) {
      const keywordMatches = classes.filter((cls) =>
        cls.name.toLowerCase().includes(keyword),
      );
      if (keywordMatches.length === 1) return keywordMatches[0].id;
    }
    return "";
  };

  const handlePasteWA = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (!text) return;

    // Detect status from header text (Form Coba Gratis/Trial vs Reguler)
    const textLower = text.toLowerCase();
    const isCGText =
      textLower.includes("coba gratis") ||
      textLower.includes("trial") ||
      textLower.includes("cg");
    if (isCGText) {
      setStatus("CG");
    } else if (textLower.includes("reguler") || textLower.includes("regular")) {
      setStatus("REGISTERED");
    }

    // Process line by line, removing WhatsApp formatting marks like asterisks and underscores
    const lines = text.split("\n").map((l) => l.replace(/[\*\_]/g, "").trim());

    for (const line of lines) {
      if (!line || !line.includes(":")) continue;

      const colonIdx = line.indexOf(":");
      const key = line.substring(0, colonIdx).trim().toLowerCase();
      const val = line.substring(colonIdx + 1).trim();

      if (!val) continue;

      // 1. Nama panggilan (harus dicek sebelum nama lengkap)
      if (key.includes("panggilan")) {
        setNickname(val);
      }
      // 2. Nama Lengkap anak
      else if (
        key.includes("nama lengkap") ||
        (key.startsWith("nama") && !key.includes("panggilan"))
      ) {
        setName(val);
      }
      // 3. Tanggal lahir anak (harus dicek sebelum tanggal jadwal)
      else if (
        key.includes("lahir") ||
        key.includes("dob") ||
        key.includes("tgl lahir")
      ) {
        const parsedDate = parseIndonesianDate(val);
        if (parsedDate) setDob(parsedDate);
      }
      // 4. Jenis Kelamin
      else if (
        key.includes("kelamin") ||
        key.includes("gender") ||
        key === "jk"
      ) {
        const vLower = val.toLowerCase();
        if (
          vLower.includes("perempuan") ||
          vLower.includes("wanita") ||
          vLower === "p" ||
          vLower.includes("female")
        ) {
          setGender("Perempuan");
        } else if (
          vLower.includes("laki") ||
          vLower.includes("pria") ||
          vLower === "l" ||
          vLower.includes("male")
        ) {
          setGender("Laki-laki");
        }
      }
      // 5. No HP
      else if (
        key.includes("hp") ||
        key.includes("wa") ||
        key.includes("telepon") ||
        key.includes("tlp") ||
        key.includes("phone")
      ) {
        const cleanPhone = val.replace(/[^0-9\+]/g, "");
        if (cleanPhone) setPhone(cleanPhone);
      }
      // 6. Alamat
      else if (key.includes("alamat")) {
        setAddress(val);
      }
      // 7. Sekolah
      else if (key.includes("sekolah")) {
        setSchool(val);
      }
      // 8. Kelas & jam sesi CG, mis. "Kelas Pagi/Sore (Jam): kelas pagi jam 10 pagi"
      else if (
        key.includes("kelas") ||
        key.includes("jam") ||
        key.includes("sesi")
      ) {
        if (!isCGText) continue;
        const parsedTime = parseSessionTime(val);
        if (parsedTime) setCgTime(parsedTime);
        const matchedClassId = matchClassIdByText(val);
        if (matchedClassId) setCgClassId(matchedClassId);
      }
      // 9. Usia dihitung otomatis; cabang mengikuti cabang login.
      else if (
        key.includes("usia") ||
        key.includes("umur") ||
        key.includes("cabang")
      ) {
        continue;
      }
      // 10. Tanggal pendaftaran eksplisit (kapan siswa mendaftar)
      else if (key.includes("pendaftaran")) {
        const parsedDate = parseIndonesianDate(val);
        if (parsedDate) setRegistrationDate(parsedDate);
      }
      // 11. "Hari & Tanggal": tanggal sesi CG untuk CG, tanggal daftar untuk reguler.
      else if (key.includes("hari") || key.includes("tanggal")) {
        const parsedDate = parseIndonesianDate(val);
        if (!parsedDate) continue;
        if (isCGText) setCgDate(parsedDate);
        else setRegistrationDate(parsedDate);
      }
    }
  };

  return createPortal(
    <>
      {isSubmitting && <LoadingSpinner usePortal={true} />}

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
        <div className="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl pointer-events-auto flex flex-col animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900 sm:rounded-t-2xl">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="p-1.5 bg-brand-50 dark:bg-brand-500/10 rounded-lg text-brand-600 dark:text-brand-400">
                  <Icons.users className="w-5 h-5" />
                </span>
                {initialData ? "Edit Data Siswa" : "Pendaftaran Siswa Baru"}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-500 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Icons.close className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body - Scrollable */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {formError && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-300 animate-in fade-in duration-200">
                ⚠️ {formError}
              </div>
            )}
            {/* WhatsApp Auto-Fill Panel */}
            {!initialData && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowWaAutofill(!showWaAutofill)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5 text-emerald-500"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.817 9.817 0 0 0 12.04 2zm0 1.63c4.56 0 8.27 3.71 8.27 8.28 0 2.21-.58 4.31-1.68 6.13l-.37.59 1.1 4.02-4.11-1.08-.57.34a8.196 8.196 0 0 1-4.64 1.41c-4.56 0-8.27-3.71-8.27-8.28 0-2.21.58-4.31 1.68-6.13l.37-.59-1.1-4.02 4.11 1.08.57-.34a8.196 8.196 0 0 1 4.64-1.41zm-1.89 3.26c-.22 0-.46.08-.66.3-.2.22-.76.74-.76 1.81 0 1.07.78 2.11.89 2.26.11.15 1.53 2.34 3.71 3.28.52.22.92.36 1.24.46.52.16 1 .14 1.37.09.42-.06 1.28-.52 1.46-1.03.18-.51.18-.94.13-1.03-.05-.09-.18-.15-.38-.25-.2-.1-1.19-.59-1.37-.66-.18-.07-.31-.1-.44.1-.13.2-.49.62-.6 1-.11.13-.22.15-.42.05-.2-.1-.85-.31-1.62-1-.6-.53-1.01-1.19-1.12-1.39-.11-.2-.01-.31.09-.41.09-.09.2-.22.3-.33.1-.11.13-.2.2-.33.07-.13.03-.25-.02-.35-.05-.1-.44-1.07-.61-1.47-.16-.39-.33-.34-.46-.34z" />
                    </svg>
                    Autofill / Isi Otomatis WA
                  </span>
                  <svg
                    className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${showWaAutofill ? "rotate-185" : ""}`}
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
                <div
                  className={`transition-all duration-300 ${showWaAutofill ? "max-h-150 opacity-100 p-4 border-t border-slate-200 dark:border-slate-800" : "max-h-0 opacity-0 pointer-events-none overflow-hidden"}`}
                >
                  <textarea
                    rows={8}
                    onChange={handlePasteWA}
                    className="block w-full min-h-45 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 text-xs sm:text-sm placeholder:text-slate-400 font-mono leading-relaxed"
                    placeholder="Tempel (paste) format teks pendaftaran dari WhatsApp di sini..."
                  />
                </div>
              </div>
            )}

            <form
              id="student-form"
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* Section 1: Data Akademik / Pendaftaran */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Informasi Pendaftaran
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tanggal Pendaftaran */}
                  <div>
                    <label
                      htmlFor="registrationDate"
                      className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
                    >
                      Tanggal Pendaftaran
                    </label>
                    <DatePickerInput
                      id="registrationDate"
                      required
                      value={registrationDate}
                      onChange={(e) => setRegistrationDate(e.target.value)}
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Status Pendaftaran
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setStatus("CG")}
                        className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                          status === "CG"
                            ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 ring-1 ring-amber-500"
                            : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900"
                        }`}
                      >
                        Coba Gratis (CG)
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus("REGISTERED")}
                        className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                          status === "REGISTERED"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 ring-1 ring-emerald-500"
                            : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900"
                        }`}
                      >
                        Reguler
                      </button>
                    </div>
                  </div>
                </div>

                {/* Level Dropdown (Only show if Regular) */}
                {status === "REGISTERED" && (
                  <div className="animate-in fade-in duration-200">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Tingkat Level / Kelas
                    </label>
                    <div className="relative" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsLevelOpen(!isLevelOpen)}
                        className="flex items-center justify-between w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-slate-900 dark:text-white text-left text-sm cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                          {labelId === ""
                            ? "-- Pilih Level --"
                            : (() => {
                                const selectedLabel = labels.find(
                                  (l) => l.id === labelId,
                                );
                                return selectedLabel
                                  ? `${selectedLabel.main_level} - ${selectedLabel.sub_level}`
                                  : "-- Pilih Level --";
                              })()}
                        </span>
                        <svg
                          className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${isLevelOpen ? "rotate-180" : ""}`}
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

                      {isLevelOpen && (
                        <div className="absolute z-50 mt-1 w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg max-h-40 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1 duration-100">
                          <button
                            type="button"
                            onClick={() => {
                              setLabelId("");
                              setIsLevelOpen(false);
                            }}
                            className={`w-full px-4 py-2 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                              labelId === ""
                                ? "font-bold text-brand-600 bg-brand-50/50 dark:bg-brand-950/20"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            -- Pilih Level --
                          </button>
                          {labels.map((lbl) => (
                            <button
                              key={lbl.id}
                              type="button"
                              onClick={() => {
                                setLabelId(lbl.id);
                                setIsLevelOpen(false);
                              }}
                              className={`w-full px-4 py-2 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 ${
                                labelId === lbl.id
                                  ? "font-bold text-brand-600 bg-brand-50/50 dark:bg-brand-950/20"
                                  : "text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: lbl.hex_color }}
                              ></span>
                              {lbl.main_level} - {lbl.sub_level}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Jadwal Sesi CG (pendaftaran baru saja) */}
                {status === "CG" && !initialData && (
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
                )}
              </div>

              {/* Section 2: Data Anak */}
              <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-4 shadow-sm bg-white dark:bg-slate-900/20">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Identitas Anak
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nama Lengkap */}
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
                    >
                      Nama Lengkap Anak
                    </label>
                    <input
                      type="text"
                      id="name"
                      autoComplete="off"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm"
                      placeholder="Contoh: Rafi Rachmawan"
                    />
                  </div>

                  {/* Nama Panggilan */}
                  <div>
                    <label
                      htmlFor="nickname"
                      className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
                    >
                      Nama Panggilan
                    </label>
                    <input
                      type="text"
                      id="nickname"
                      autoComplete="off"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm"
                      placeholder="Contoh: Rafi"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Jenis Kelamin */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Jenis Kelamin
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setGender(gender === "Laki-laki" ? "" : "Laki-laki")
                        }
                        className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                          gender === "Laki-laki"
                            ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 ring-1 ring-blue-500"
                            : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <span>👦</span> Laki-laki
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setGender(gender === "Perempuan" ? "" : "Perempuan")
                        }
                        className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                          gender === "Perempuan"
                            ? "border-pink-500 bg-pink-50 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400 ring-1 ring-pink-500"
                            : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <span>👧</span> Perempuan
                      </button>
                    </div>
                  </div>

                  {/* Tanggal Lahir & Kalkulasi Usia */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label
                        htmlFor="dob"
                        className="block text-xs font-semibold text-slate-500 dark:text-slate-400"
                      >
                        Tanggal Lahir
                      </label>
                      {calculatedAge && (
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          ⏳ {calculatedAge}
                        </span>
                      )}
                    </div>
                    <DatePickerInput
                      id="dob"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Kontak & Alamat */}
              <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-4 shadow-sm bg-white dark:bg-slate-900/20">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Kontak & Alamat
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* No HP */}
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
                    >
                      No. HP (WhatsApp Orang Tua)
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      autoComplete="off"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm"
                      placeholder="Contoh: 081234567890"
                    />
                  </div>

                  {/* Sekolah */}
                  <div>
                    <label
                      htmlFor="school"
                      className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
                    >
                      Sekolah Asal (TK / PAUD)
                    </label>
                    <input
                      type="text"
                      id="school"
                      autoComplete="off"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm"
                      placeholder="Contoh: TK Shining Sun"
                    />
                  </div>
                </div>

                {/* Alamat */}
                <div>
                  <label
                    htmlFor="address"
                    className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
                  >
                    Alamat Domisili
                  </label>
                  <textarea
                    id="address"
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm placeholder:text-slate-400"
                    placeholder="Masukkan alamat tinggal anak saat ini..."
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 sm:rounded-b-2xl shrink-0">
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto flex justify-center items-center py-2.5 px-5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                form="student-form"
                disabled={isSubmitting}
                className="w-full sm:w-auto flex justify-center items-center py-2.5 px-6 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Menyimpan...
                  </>
                ) : initialData ? (
                  "Simpan Perubahan"
                ) : (
                  "Simpan & Daftarkan Siswa"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
