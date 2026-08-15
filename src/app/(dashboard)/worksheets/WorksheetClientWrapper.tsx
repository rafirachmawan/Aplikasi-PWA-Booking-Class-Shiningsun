"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import { WorksheetFormModal } from "@/components/features/worksheets/WorksheetFormModal";
import { StudentWorksheetTable } from "@/components/features/worksheets/StudentWorksheetTable";
import { deleteWorksheet, deleteWorksheetMonth, updateStudentAccessPin, getModuleLockPasswords } from "@/lib/actions";
import { formatNumericDate, formatShortDate } from "@/lib/dateUtils";
import { getGDrivePreviewLink, getGDriveDirectLink } from "@/lib/gdriveUtils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface WorksheetClientWrapperProps {
  initialWorksheets: any[];
  students: any[];
  labels: any[];
  activeBranchName?: string | null;
  teachers?: any[];
  templates?: any[];
}

export function WorksheetClientWrapper({
  initialWorksheets,
  students,
  labels,
  activeBranchName,
  teachers = [],
  templates = [],
}: WorksheetClientWrapperProps) {
  const router = useRouter();
  const [selectedStudentId, setSelectedStudentId] = useState("__none__");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorksheet, setEditingWorksheet] = useState<any>(null);

  // Date Range Filter & Single PDF Export State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  // Custom dropdown state for Student Filter (always opens downwards)
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [studentDropdownFilter, setStudentDropdownFilter] = useState("");
  const studentDropdownRef = useRef<HTMLDivElement>(null);
  const studentSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isStudentDropdownOpen) {
      setTimeout(() => {
        studentSearchInputRef.current?.focus();
      }, 50);
    }
  }, [isStudentDropdownOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        studentDropdownRef.current &&
        !studentDropdownRef.current.contains(event.target as Node)
      ) {
        setIsStudentDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Sync URL searchParam student_id on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const studentIdParam = urlParams.get("student_id");
      if (studentIdParam) {
        setSelectedStudentId(studentIdParam);
      }
    }
  }, []);

  const selectedStudentObj = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  const filteredDropdownStudents = useMemo(() => {
    if (!studentDropdownFilter.trim()) return students;
    const query = studentDropdownFilter.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        (s.nickname && s.nickname.toLowerCase().includes(query))
    );
  }, [students, studentDropdownFilter]);

  // Delete confirm modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "row" | "sheet";
    id?: string;
    studentId?: string;
    bulanKe?: number | null;
    studentName?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === "sheet" && deleteTarget.studentId) {
        await deleteWorksheetMonth(deleteTarget.studentId, deleteTarget.bulanKe ?? null);
      } else if (deleteTarget.type === "row" && deleteTarget.id) {
        await deleteWorksheet(deleteTarget.id);
      }
      setDeleteTarget(null);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Gagal menghapus.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Protection state for direct URL access
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [lockChecked, setLockChecked] = useState(false);
  const [lockPassword, setLockPassword] = useState("");
  const [lockError, setLockError] = useState("");

  useEffect(() => {
    async function checkLock() {
      if (typeof window !== "undefined") {
        try {
          const passwords = await getModuleLockPasswords();
          const expected = passwords["/worksheets"];
          if (expected === "") {
            setIsUnlocked(true);
          } else {
            const unlocked = sessionStorage.getItem("worksheets_unlocked") === "true";
            setIsUnlocked(unlocked);
          }
        } catch {
          const unlocked = sessionStorage.getItem("worksheets_unlocked") === "true";
          setIsUnlocked(unlocked);
        }
        setLockChecked(true);
      }
    }
    checkLock();
  }, []);

  // PIN modal state
  const [pinModalStudent, setPinModalStudent] = useState<any>(null);
  const [newPin, setNewPin] = useState("");
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinCopiedWa, setPinCopiedWa] = useState(false);
  const [pinMsg, setPinMsg] = useState({ error: "", success: "" });
  const [isPinUpdating, setIsPinUpdating] = useState(false);

  const handleCopyWaInfo = () => {
    if (!pinModalStudent) return;
    const studentName = pinModalStudent.name;
    const currentPin = pinModalStudent.access_pin || "123456";
    const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/portal-ortu` : "https://app.shiningsun.id/portal-ortu";

    const text = `Halo Bapak/Ibu, berikut informasi akses Portal Mandiri Orang Tua ShiningSun untuk siswa *${studentName}*:\n\n🌐 Link Portal: ${portalUrl}\n👤 Nama Siswa: ${studentName}\n🔑 PIN Akses: ${currentPin}\n\nSilakan gunakan Nama & PIN di atas untuk memantau laporan perkembangan dan jadwal kelas anak. Terima kasih!`;

    navigator.clipboard.writeText(text);
    setPinCopiedWa(true);
    setTimeout(() => setPinCopiedWa(false), 3000);
  };

  const handleGenerateRandomPin = () => {
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    setNewPin(randomPin);
  };

  // Filter worksheets by student AND date range
  const filteredWorksheets = useMemo(() => {
    return initialWorksheets.filter((w) => {
      const matchStudent =
        selectedStudentId === "" ||
        selectedStudentId === "__none__" ||
        w.student_id === selectedStudentId;
      if (!matchStudent) return false;

      if (!startDate && !endDate) return true;
      const rawDate = w.worksheet_date || w.created_at;
      if (!rawDate) return true;
      const dateOnly = String(rawDate).split("T")[0];
      if (startDate && dateOnly < startDate) return false;
      if (endDate && dateOnly > endDate) return false;
      return true;
    });
  }, [initialWorksheets, selectedStudentId, startDate, endDate]);

  const handleDownloadPdf = async () => {
    const cardEl = printableRef.current;
    if (!cardEl) return;

    const origWidth = cardEl.style.width;
    const origMinWidth = cardEl.style.minWidth;
    const origMaxWidth = cardEl.style.maxWidth;

    const actionElements = cardEl.querySelectorAll(".no-print-action");
    actionElements.forEach((el) => {
      (el as HTMLElement).style.setProperty("display", "none", "important");
    });

    const scrollContainers = cardEl.querySelectorAll(".overflow-x-auto");
    const origOverflows: string[] = [];
    scrollContainers.forEach((sc, i) => {
      origOverflows[i] = (sc as HTMLElement).style.overflow;
      (sc as HTMLElement).style.setProperty("overflow", "visible", "important");
    });

    cardEl.style.setProperty("width", "850px", "important");
    cardEl.style.setProperty("min-width", "850px", "important");
    cardEl.style.setProperty("max-width", "none", "important");

    try {
      setIsDownloadingPdf(true);

      if (!(window as any).htmlToImage) {
        const script1 = document.createElement("script");
        script1.src =
          "https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js";
        document.head.appendChild(script1);
        await new Promise((r) => (script1.onload = r));
      }

      if (!(window as any).jspdf) {
        const script2 = document.createElement("script");
        script2.src =
          "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        document.head.appendChild(script2);
        await new Promise((r) => (script2.onload = r));
      }

      await new Promise((r) => setTimeout(r, 200));

      const dataUrl = await (window as any).htmlToImage.toPng(cardEl, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        width: 850,
      });

      const { jsPDF } = (window as any).jspdf;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(dataUrl);

      const margin = 10;
      let imgWidth = pdfWidth - margin * 2;
      let imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      if (imgHeight > pdfHeight - margin * 2) {
        imgHeight = pdfHeight - margin * 2;
        imgWidth = (imgProps.width * imgHeight) / imgProps.height;
      }

      const xOffset = margin + (pdfWidth - margin * 2 - imgWidth) / 2;
      const yOffset = margin;

      pdf.addImage(dataUrl, "PNG", xOffset, yOffset, imgWidth, imgHeight);

      const safeFileName = (selectedStudentObj?.name || "Laporan_Perkembangan")
        .replace(/[^a-zA-Z0-9]/g, "_")
        .replace(/_+/g, "_");

      const dateRangeStr =
        startDate || endDate ? `_${startDate || "Awal"}_sd_${endDate || "Akhir"}` : "";
      pdf.save(`Laporan_Perkembangan_${safeFileName}${dateRangeStr}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Gagal mendownload PDF. Silakan coba lagi.");
    } finally {
      cardEl.style.width = origWidth;
      cardEl.style.minWidth = origMinWidth;
      cardEl.style.maxWidth = origMaxWidth;

      scrollContainers.forEach((sc, i) => {
        (sc as HTMLElement).style.overflow = origOverflows[i] || "";
      });

      actionElements.forEach((el) => {
        (el as HTMLElement).style.removeProperty("display");
      });
      setIsDownloadingPdf(false);
    }
  };

  // Group worksheets by student_id + bulan_ke (each month = separate card/table)
  const groupedWorksheets = useMemo(() => {
    const map = new Map<string, { student: any; bulanKe: number | null; worksheets: any[] }>();

    filteredWorksheets.forEach((w) => {
      const sId = w.student_id;
      const bk = w.bulan_ke ?? null;
      const groupKey = `${sId}_${bk ?? 'none'}`;

      if (!map.has(groupKey)) {
        const fullStudent = students.find((s) => s.id === sId);
        const studentObj = {
          ...(fullStudent || {}),
          ...(w.student || {}),
          date_of_birth: w.student?.date_of_birth || fullStudent?.date_of_birth || null,
        };
        map.set(groupKey, { student: studentObj, bulanKe: bk, worksheets: [] });
      }

      map.get(groupKey)!.worksheets.push(w);
    });

    // If specific student selected in filter and has 0 filtered worksheets, still render their empty table
    if (selectedStudentId && selectedStudentId !== "" && selectedStudentId !== "__none__" && !Array.from(map.values()).some(g => g.student.id === selectedStudentId)) {
      const studentObj = students.find((s) => s.id === selectedStudentId);
      if (studentObj) {
        map.set(`${selectedStudentId}_none`, { student: studentObj, bulanKe: null, worksheets: [] });
      }
    }

    // Sort: by student name, then by bulan_ke ascending
    return Array.from(map.values()).sort((a, b) => {
      const nameA = a.student?.name || "";
      const nameB = b.student?.name || "";
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      return (a.bulanKe ?? 0) - (b.bulanKe ?? 0);
    });
  }, [filteredWorksheets, selectedStudentId, students]);

  const handleUnlockPage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const passwords = await getModuleLockPasswords();
      const expectedPassword = passwords["/worksheets"] ?? "123";
      if (lockPassword === expectedPassword) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("worksheets_unlocked", "true");
        }
        setIsUnlocked(true);
      } else {
        setLockError("Password salah! Silakan periksa kembali atau hubungi SuperAdmin.");
      }
    } catch {
      if (lockPassword === "123") {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("worksheets_unlocked", "true");
        }
        setIsUnlocked(true);
      } else {
        setLockError("Password salah! Silakan periksa kembali atau hubungi SuperAdmin.");
      }
    }
  };

  if (!lockChecked) {
    return null;
  }

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] p-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-3xl shadow-sm">
            🔒
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Modul Laporan Perkembangan Dikunci
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Fitur Laporan Perkembangan Siswa ini masih dalam tahap prarilis. Silakan masukkan password akses untuk membuka modul ini.
            </p>
          </div>

          <form onSubmit={handleUnlockPage} className="space-y-4 pt-2">
            <div>
              <input
                type="password"
                required
                value={lockPassword}
                onChange={(e) => {
                  setLockPassword(e.target.value);
                  setLockError("");
                }}
                placeholder="Masukkan password (default: 123)"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
              {lockError && (
                <p className="text-xs text-red-500 font-semibold mt-2 animate-in fade-in">{lockError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md transition-all active:scale-95"
            >
              Buka Akses Laporan Perkembangan
            </button>
          </form>
        </div>
      </div>
    );
  }

  const handleUpdatePin = async () => {
    if (!pinModalStudent || !newPin) return;
    setPinMsg({ error: "", success: "" });
    setIsPinUpdating(true);
    try {
      await updateStudentAccessPin(pinModalStudent.id, newPin);
      pinModalStudent.access_pin = newPin.trim();
      setPinMsg({ error: "", success: "PIN Akses Orang Tua berhasil diperbarui!" });
      setTimeout(() => {
        setPinModalStudent(null);
        setNewPin("");
        setPinMsg({ error: "", success: "" });
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setPinMsg({ error: err.message || "Gagal mengubah PIN.", success: "" });
    } finally {
      setIsPinUpdating(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Access PIN Manager Modal */}
      {pinModalStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setPinModalStudent(null)}
          />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 animate-in zoom-in-95 duration-200 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shrink-0 border border-amber-200 dark:border-amber-800/50">
                  🔑
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                    PIN Portal Orang Tua
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    Siswa: <span className="text-brand-600 dark:text-brand-400 font-bold">{pinModalStudent.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPinModalStudent(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Icons.close className="w-5 h-5" />
              </button>
            </div>

            {/* Current Active PIN Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    PIN Aktif Saat Ini
                  </span>
                  <span className="font-mono text-2xl font-black text-slate-900 dark:text-white tracking-widest block mt-0.5">
                    {pinModalStudent.access_pin || "123456"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyWaInfo}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50 transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                >
                  <span>{pinCopiedWa ? "✅ Info Tersalin!" : "📋 Salin Info WA"}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Digunakan Orang Tua untuk masuk ke portal <strong className="text-slate-700 dark:text-slate-300">/portal-ortu</strong> menggunakan Nama Siswa.
              </p>
            </div>

            {/* Feedback Messages */}
            {pinMsg.error && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-200 dark:border-red-800 font-semibold animate-in fade-in">
                ⚠️ {pinMsg.error}
              </div>
            )}
            {pinMsg.success && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 font-semibold animate-in fade-in">
                ✅ {pinMsg.success}
              </div>
            )}

            {/* Form Input New PIN */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Ubah PIN Akses Baru
              </label>

              <div className="relative flex items-center">
                <input
                  type={showPinModal ? "text" : "password"}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="Misal: 123456"
                  className="w-full px-4 py-2.5 pr-10 border rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-base font-bold tracking-widest border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPinModal(!showPinModal)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                  title={showPinModal ? "Sembunyikan PIN" : "Tampilkan PIN"}
                >
                  {showPinModal ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Quick Generator Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGenerateRandomPin}
                  className="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>🎲 Generate PIN Acak</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewPin("123456")}
                  className="py-1.5 px-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  🔄 Reset Default (123456)
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPinModalStudent(null)}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleUpdatePin}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-brand-600 text-white hover:bg-brand-700 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Simpan PIN Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-3xl bg-brand-600 p-6 sm:p-10 shadow-lg relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-400 opacity-20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight flex flex-wrap items-center gap-x-2">
              <span>Laporan Perkembangan Siswa</span>
              {activeBranchName && (
                <span className="text-brand-100 font-normal text-lg sm:text-xl lg:text-2xl whitespace-nowrap">
                  ({activeBranchName})
                </span>
              )}
            </h2>
            <p className="text-brand-100 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
              Catat laporan perkembangan, tugas, dan tautan file Google Drive yang dapat diakses oleh Orang Tua.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingWorksheet(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-x-2 rounded-xl bg-white text-brand-700 px-5 py-3 text-sm font-bold shadow-md hover:bg-brand-50 focus-visible:outline-none shrink-0 w-full sm:w-auto justify-center transition-all active:scale-95 cursor-pointer"
            style={{ color: '#1d4ed8', backgroundColor: 'white' }}
          >
            <Icons.add className="-ml-0.5 h-5 w-5" />
            Tambah Laporan Perkembangan
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
        {/* Custom Student Select Filter (Opens Downward Always) */}
        <div className="relative w-full" ref={studentDropdownRef}>
          <button
            type="button"
            onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
            className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-3 pl-10 pr-3.5 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-brand-600 focus:outline-none shadow-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/80 cursor-pointer"
          >
            <span className="truncate">
              {selectedStudentId === "__none__"
                ? "👤 Pilih Siswa..."
                : selectedStudentObj
                  ? `👤 ${selectedStudentObj.name} ${selectedStudentObj.nickname ? `(${selectedStudentObj.nickname})` : ""}`
                  : `✨ Semua Siswa (${students.length})`}
            </span>
            <Icons.chevronDown
              className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                isStudentDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Icons.users className="h-5 w-5 text-slate-400" />
          </div>

            {/* Dropdown Menu (Always Opens Downwards) */}
            {isStudentDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 animate-in fade-in slide-in-from-top-2 duration-150 space-y-1.5">
                {/* Quick Search inside dropdown */}
                <div className="p-1">
                  <input
                    ref={studentSearchInputRef}
                    type="text"
                    value={studentDropdownFilter}
                    onChange={(e) => setStudentDropdownFilter(e.target.value)}
                    placeholder="🔍 Cari nama siswa..."
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-500 focus:outline-none font-medium"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudentId("");
                      setIsStudentDropdownOpen(false);
                      setStudentDropdownFilter("");
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                      selectedStudentId === ""
                        ? "bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-bold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>✨ Semua Siswa ({students.length})</span>
                    {selectedStudentId === "" && <span>✓</span>}
                  </button>

                  {filteredDropdownStudents.length === 0 ? (
                    <div className="py-3 text-center text-xs text-slate-400 italic">
                      Tidak ada siswa yang cocok.
                    </div>
                  ) : (
                    filteredDropdownStudents.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentId(s.id);
                          setIsStudentDropdownOpen(false);
                          setStudentDropdownFilter("");
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between cursor-pointer ${
                          selectedStudentId === s.id
                            ? "bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-bold"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                        }`}
                      >
                        <span className="truncate">
                          👤 {s.name} {s.nickname ? `(${s.nickname})` : ""}
                        </span>
                        {selectedStudentId === s.id && <span className="font-bold">✓</span>}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Date Range Filter & Single Download PDF Control Panel (Same as Portal Ortu) */}
      {selectedStudentId !== "__none__" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                📄 Filter & Download Laporan PDF
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Filter berdasarkan tanggal dan unduh file PDF resmi.
              </p>
            </div>
            <span className="shrink-0 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              {filteredWorksheets.length} Sesi
            </span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Mulai Tanggal
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:outline-none transition-all cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:outline-none transition-all cursor-pointer"
                />
              </div>
            </div>

            {(startDate || endDate) && (
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer"
                >
                  Reset Filter Tanggal
                </button>
              </div>
            )}

            {/* SINGLE Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf || filteredWorksheets.length === 0}
              className="w-full py-2.5 sm:py-3 rounded-xl text-xs font-extrabold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 active:scale-98 transition-all shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isDownloadingPdf ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
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
                  <span>Memproses PDF...</span>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                  <span>
                    Download PDF ({filteredWorksheets.length} Sesi)
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Worksheets Grid / List Grouped By Student Table Document */}
      <div ref={printableRef} className="space-y-6">
        {selectedStudentId === "__none__" ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-2xl">
              👤
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Pilih Siswa Terlebih Dahulu</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Silakan pilih siswa dari dropdown di atas untuk melihat atau menambahkan laporan perkembangan.
            </p>
          </div>
        ) : groupedWorksheets.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Icons.edit className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Belum Ada Laporan Perkembangan Siswa</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Klik tombol &quot;Tambah Laporan Perkembangan&quot; untuk mulai mencatat evaluasi perkembangan siswa.
            </p>
          </div>
        ) : (
          groupedWorksheets.map(({ student, bulanKe, worksheets: studentWsList }) => (
            <StudentWorksheetTable
              key={`${student.id}_${bulanKe ?? 'none'}`}
              student={student}
              worksheets={studentWsList}
              bulanKe={bulanKe}
              hideDownloadBtn={true}
              onAddRow={(studentId, bk) => {
                setEditingWorksheet({ student_id: studentId, bulan_ke: bk });
                setIsModalOpen(true);
              }}
              onEditRow={(ws) => {
                setEditingWorksheet(ws);
                setIsModalOpen(true);
              }}
              onDeleteRow={(wsId) => setDeleteTarget({ type: "row", id: wsId })}
              onDeleteSheet={(sId, bk, sName) =>
                setDeleteTarget({
                  type: "sheet",
                  studentId: sId,
                  bulanKe: bk,
                  studentName: sName,
                })
              }
              onSetPin={(s) => {
                setPinModalStudent(s);
                setNewPin(s.access_pin || "123456");
              }}
            />
          ))
        )}
      </div>

      {/* Form Modal */}
      {(isModalOpen || editingWorksheet) && (
        <WorksheetFormModal
          students={students}
          teachers={teachers}
          templates={templates}
          initialData={editingWorksheet}
          onClose={() => {
            setIsModalOpen(false);
            setEditingWorksheet(null);
          }}
          onSuccess={() => {
            setIsModalOpen(false);
            setEditingWorksheet(null);
            router.refresh();
          }}
        />
      )}

      {/* Modern Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4 animate-in zoom-in-95 duration-200">
            {/* Red Warning Badge */}
            <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200/80 dark:border-red-900/50 flex items-center justify-center mx-auto shadow-inner">
              <Icons.trash className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                {deleteTarget.type === "sheet"
                  ? "Hapus Laporan Perkembangan?"
                  : "Hapus Baris Evaluasi?"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {deleteTarget.type === "sheet" ? (
                  <>
                    Apakah Anda yakin ingin menghapus{" "}
                    <strong className="text-slate-800 dark:text-slate-200">
                      Laporan Perkembangan {deleteTarget.bulanKe != null ? `Bulan ke-${deleteTarget.bulanKe}` : ""}
                    </strong>{" "}
                    untuk siswa{" "}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {deleteTarget.studentName}
                    </strong>
                    ? Seluruh baris data evaluasi pada laporan ini akan dihapus secara permanen.
                  </>
                ) : (
                  <>
                    Apakah Anda yakin ingin menghapus baris evaluasi perkembangan ini? Data yang dihapus tidak dapat dikembalikan.
                  </>
                )}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-md shadow-red-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Icons.trash className="w-4 h-4" />
                    <span>Ya, Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
