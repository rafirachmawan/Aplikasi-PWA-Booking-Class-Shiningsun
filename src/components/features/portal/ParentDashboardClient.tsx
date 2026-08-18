"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { StudentScheduleCard } from "./StudentScheduleCard";
import { StudentWorksheetTable } from "@/components/features/worksheets/StudentWorksheetTable";
import {
  clearParentSession,
  updateStudentPhotoUrl,
  updateStudentAccessPin,
} from "@/lib/actions";
import { formatShortDate, calculateStudentPoints } from "@/lib/dateUtils";
import { getGDriveDirectLink } from "@/lib/gdriveUtils";
import { PdfViewerModal } from "@/components/ui/PdfViewerModal";

interface ParentDashboardClientProps {
  student: any;
  upcomingSchedules: any[];
  scheduleHistory: any[];
  worksheets: any[];
  redemptions?: any[];
  rulesDocuments?: {
    id: string;
    file_url: string;
    file_name: string;
    uploaded_at: string;
  }[];
}

export function ParentDashboardClient({
  student,
  upcomingSchedules,
  scheduleHistory,
  worksheets,
  redemptions = [],
  rulesDocuments = [],
}: ParentDashboardClientProps) {
  const router = useRouter();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  // Viewer PDF hanya-lihat (tanpa download)
  const [previewDoc, setPreviewDoc] = useState<
    NonNullable<ParentDashboardClientProps["rulesDocuments"]>[number] | null
  >(null);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Deterministic DOB & Age calculation (Prevents SSR / Client hydration mismatch)
  const dobInfo = useMemo(() => {
    if (!student?.date_of_birth) return null;
    try {
      const parts = String(student.date_of_birth).split("T")[0].split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const monthsIndo = [
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
        const formatted = `${day} ${monthsIndo[month] || ""} ${year}`;

        const today = new Date();
        let age = today.getFullYear() - year;
        const mDiff = today.getMonth() - month;
        if (mDiff < 0 || (mDiff === 0 && today.getDate() < day)) age--;
        return { formatted, age: age > 0 ? age : 0 };
      }
    } catch (e) {}
    return null;
  }, [student?.date_of_birth]);

  // Date Range Filtering for Worksheets & PDF Download
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  // Profile Photo Upload & Interactive Crop Modal State
  const [photoUrl, setPhotoUrl] = useState<string>(student?.photo_url || "");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Crop Modal States
  const [showCropModal, setShowCropModal] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string>("");
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [cropOffset, setCropOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // Change PIN modal state
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);
  const [pinErrorMsg, setPinErrorMsg] = useState("");
  const [pinSuccessMsg, setPinSuccessMsg] = useState("");
  const [showPinText, setShowPinText] = useState(false);

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinErrorMsg("");
    setPinSuccessMsg("");

    const cleanNew = newPin.trim();
    if (!cleanNew || cleanNew.length < 4) {
      setPinErrorMsg("PIN Akses minimal 4 karakter / angka.");
      return;
    }
    if (cleanNew !== confirmPin.trim()) {
      setPinErrorMsg("Konfirmasi PIN tidak sesuai dengan PIN baru.");
      return;
    }

    setIsSubmittingPin(true);
    try {
      await updateStudentAccessPin(student.id, cleanNew);
      setPinSuccessMsg(
        "PIN Akses berhasil diperbarui! Admin juga telah mendapatkan PIN terbaru ini.",
      );
      setTimeout(() => {
        setShowChangePinModal(false);
        setNewPin("");
        setConfirmPin("");
        setPinSuccessMsg("");
      }, 1500);
    } catch (err: any) {
      setPinErrorMsg(err?.message || "Gagal memperbarui PIN Akses.");
    } finally {
      setIsSubmittingPin(false);
    }
  };

  // Sync photo with localStorage on mount & when student changes
  useEffect(() => {
    if (student?.photo_url) {
      setPhotoUrl(student.photo_url);
      if (typeof window !== "undefined" && student?.id) {
        try {
          localStorage.setItem(
            `student_photo_${student.id}`,
            student.photo_url,
          );
        } catch (e) {}
      }
    } else if (typeof window !== "undefined" && student?.id) {
      try {
        const localPhoto = localStorage.getItem(`student_photo_${student.id}`);
        if (localPhoto) {
          setPhotoUrl(localPhoto);
        }
      } catch (e) {}
    }
  }, [student?.id, student?.photo_url]);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Harap pilih file gambar (JPG, PNG, WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setRawImageSrc(event.target.result as string);
        setCropZoom(1);
        setCropOffset({ x: 0, y: 0 });
        setShowCropModal(true);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const dx = clientX - dragStart.x;
    const dy = clientY - dragStart.y;
    setCropOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    setDragStart({ x: clientX, y: clientY });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleSaveCrop = async () => {
    if (!rawImageSrc) return;
    setIsUploadingPhoto(true);

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      const OUTPUT_SIZE = 400;
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        const minDim = Math.min(img.width, img.height);
        const cropWidth = minDim / cropZoom;
        const cropHeight = minDim / cropZoom;

        let centerX = img.width / 2;
        let centerY = img.height / 2;

        const scaleFactor = minDim / 260; // 260px is preview size
        centerX -= (cropOffset.x * scaleFactor) / cropZoom;
        centerY -= (cropOffset.y * scaleFactor) / cropZoom;

        let sourceX = centerX - cropWidth / 2;
        let sourceY = centerY - cropHeight / 2;

        sourceX = Math.max(0, Math.min(img.width - cropWidth, sourceX));
        sourceY = Math.max(0, Math.min(img.height - cropHeight, sourceY));

        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          cropWidth,
          cropHeight,
          0,
          0,
          OUTPUT_SIZE,
          OUTPUT_SIZE,
        );

        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.88);
        setPhotoUrl(compressedBase64);

        if (typeof window !== "undefined" && student?.id) {
          try {
            localStorage.setItem(
              `student_photo_${student.id}`,
              compressedBase64,
            );
          } catch (e) {}
        }

        await updateStudentPhotoUrl(student.id, compressedBase64);
      }

      setIsUploadingPhoto(false);
      setShowCropModal(false);
    };
    img.src = rawImageSrc;
  };

  const filteredWorksheets = useMemo(() => {
    if (!startDate && !endDate) return worksheets;
    return worksheets.filter((w) => {
      const rawDate = w.worksheet_date || w.created_at;
      if (!rawDate) return true;
      const dateOnly = String(rawDate).split("T")[0];
      if (startDate && dateOnly < startDate) return false;
      if (endDate && dateOnly > endDate) return false;
      return true;
    });
  }, [worksheets, startDate, endDate]);

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

      const safeFileName = (student?.name || "Siswa")
        .replace(/[^a-zA-Z0-9]/g, "_")
        .replace(/_+/g, "_");

      const dateRangeStr =
        startDate || endDate
          ? `_${startDate || "Awal"}_sd_${endDate || "Akhir"}`
          : "";
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

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await clearParentSession();
      router.push("/portal-ortu");
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // ── Browser Back Button Interception (Mobile Hardware Back) ──
  const handleBackConfirmLogout = useCallback(async () => {
    setShowBackConfirm(false);
    await handleLogout();
  }, []);

  const handleBackCancel = useCallback(() => {
    setShowBackConfirm(false);
    // Re-push state so back button is trapped again
    window.history.pushState({ portalGuard: true }, "");
  }, []);

  useEffect(() => {
    // Push a dummy history entry so pressing back doesn't leave the page
    window.history.pushState({ portalGuard: true }, "");

    const onPopState = (e: PopStateEvent) => {
      // Show confirmation instead of navigating away
      setShowBackConfirm(true);
      // Immediately push state again to prevent actual navigation
      window.history.pushState({ portalGuard: true }, "");
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const firstLetter = student?.name
    ? student.name.charAt(0).toUpperCase()
    : "S";
  const grossPoints =
    student?.gross_points ?? calculateStudentPoints(worksheets);
  const redeemedPoints = student?.redeemed_points ?? 0;
  const netPoints =
    student?.points ?? Math.max(0, grossPoints - redeemedPoints);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-12">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-white rounded-2xl shadow-xs border border-slate-100 p-1 shrink-0">
              <Image
                src="/logo.png"
                alt="ShiningSun Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
                Portal Orang Tua & Siswa
              </h1>
              <p className="text-[11px] text-brand-600 dark:text-brand-400 font-bold mt-0.5">
                ShiningSun Preschool & Academy
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <span>🚪</span>
            <span className="hidden sm:inline">
              {isLoggingOut ? "Keluar..." : "Keluar / Ganti Akses"}
            </span>
            <span className="sm:hidden">{isLoggingOut ? "..." : "Keluar"}</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8 space-y-6">
        {/* Student Profile Card (Clean Brand Blue Banner) */}
        <div className="rounded-3xl bg-brand-600 dark:bg-brand-700 border border-brand-500/40 p-5 sm:p-7 text-white shadow-xl space-y-4">
          {/* Top: Photo + Name + Nickname + Branch */}
          <div className="flex items-center gap-3.5 sm:gap-5">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoChange}
              accept="image/*"
              className="hidden"
            />

            {/* Student Photo / Logo Box (Interactive Upload) */}
            <button
              type="button"
              onClick={handlePhotoClick}
              disabled={isUploadingPhoto}
              title="Klik untuk mengubah foto profil anak"
              className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-1 shrink-0 flex items-center justify-center shadow-md border-2 border-white/80 overflow-hidden cursor-pointer hover:opacity-95 active:scale-95 transition-all"
            >
              {photoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={photoUrl}
                  alt={student.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <Image
                  src="/logo.png"
                  alt="ShiningSun Logo"
                  width={64}
                  height={64}
                  className="w-full h-full object-contain p-1"
                  priority
                />
              )}

              {/* Camera Overlay Icon */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white rounded-xl">
                <span className="text-base sm:text-lg">📷</span>
                <span className="text-[9px] font-bold uppercase tracking-tighter">
                  Ubah
                </span>
              </div>

              {/* Mobile Camera Indicator Badge */}
              <div className="absolute bottom-0 right-0 bg-brand-700 text-white w-5 h-5 rounded-tl-lg flex items-center justify-center text-[10px] shadow-xs sm:hidden">
                📷
              </div>

              {/* Uploading Spinner */}
              {isUploadingPhoto && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white rounded-xl">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>

            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight truncate">
                {student.name}
              </h2>
              <div className="flex items-center gap-1.5 flex-wrap text-xs mt-0.5">
                {student.nickname && (
                  <span className="font-medium text-brand-100">
                    Panggilan:{" "}
                    <strong className="text-white font-bold">
                      &quot;{student.nickname}&quot;
                    </strong>
                  </span>
                )}
                {student.branch?.name && (
                  <>
                    {student.nickname && (
                      <span className="text-brand-300/60">•</span>
                    )}
                    <span className="font-semibold text-brand-100">
                      📍 {student.branch.name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Middle: Info Grid — DOB, Usia, Jadwal */}
          {(student.date_of_birth || student.schedule_detail) && (
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 shadow-md border border-white divide-y divide-slate-100 sm:divide-y-0 sm:divide-x sm:divide-slate-100">
              {student.date_of_birth && dobInfo && (
                <div className="flex items-start gap-2.5 text-[12px] pb-2 sm:pb-0">
                  <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center text-base shrink-0 mt-0.5">
                    🎂
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Tanggal Lahir
                    </span>
                    <span
                      className="font-bold text-slate-800 leading-snug block"
                      suppressHydrationWarning
                    >
                      {dobInfo.formatted}
                      <span
                        className="text-slate-400 font-semibold ml-1.5 inline-block"
                        suppressHydrationWarning
                      >
                        ({dobInfo.age} thn)
                      </span>
                    </span>
                  </div>
                </div>
              )}
              {student.schedule_detail && (
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(true)}
                  title="Klik untuk melihat rincian jadwal kelas"
                  className="flex items-start gap-2.5 text-[12px] pt-2.5 sm:pt-0 sm:pl-3 text-left w-full cursor-pointer hover:bg-slate-50/80 p-2 rounded-xl transition-all group"
                >
                  <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center text-base shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    📅
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Jadwal Kelas
                      </span>
                      <span className="text-[10px] font-extrabold text-brand-600 dark:text-brand-400 group-hover:underline flex items-center gap-0.5">
                        Lihat ↗
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {student.schedule_detail
                        .split(", ")
                        .map((item: string, idx: number) => {
                          const spaceIdx = item.indexOf(" ");
                          const dayName =
                            spaceIdx !== -1
                              ? item.substring(0, spaceIdx)
                              : item;
                          const timeStr =
                            spaceIdx !== -1 ? item.substring(spaceIdx + 1) : "";
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-xs font-bold text-slate-800"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                              <span className="w-16 shrink-0 text-slate-700">
                                {dayName}
                              </span>
                              {timeStr && (
                                <span className="text-[11px] font-bold text-brand-700 bg-brand-50/80 px-2 py-0.5 rounded-md border border-brand-100/80 font-mono tracking-tight">
                                  {timeStr}
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* Bottom: Level Badge + Status Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* PROMINENT LEVEL PILL */}
            <div className="bg-white text-slate-900 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md border border-white flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: student.label?.hex_color || "#16a34a",
                }}
              />
              <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                Level:
              </span>
              <span className="font-black text-brand-700 uppercase tracking-wide">
                {student.label
                  ? `${student.label.main_level} ${student.label.sub_level}`
                  : "Belum Diatur"}
              </span>
            </div>

            {/* STATUS BADGE */}
            <span className="bg-white text-emerald-700 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md border border-white inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span>
                {student.status === "REGISTERED"
                  ? "Siswa Reguler"
                  : student.status === "CG"
                    ? "Coba Gratis"
                    : "Nonaktif"}
              </span>
            </span>
          </div>

          {/* Points Display — Inside Card with White Background (Clickable to view Point History) */}
          <button
            type="button"
            onClick={() => setShowPointsModal(true)}
            title="Klik untuk melihat riwayat poin"
            className="w-full bg-white rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-md border border-white text-slate-900 cursor-pointer hover:bg-amber-50/60 active:scale-[0.99] transition-all group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center text-xl font-black shrink-0 shadow-sm border border-amber-300 group-hover:scale-105 transition-transform">
                ⭐
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="block text-[10px] font-extrabold text-amber-600 uppercase tracking-wider">
                    Poin Kehadiran Siswa
                  </span>
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md group-hover:bg-amber-200 transition-colors">
                    Lihat Riwayat ↗
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {netPoints}
                  </span>
                  <span className="text-sm font-extrabold text-slate-600">
                    Poin
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(student.redeemed_points || 0) > 0 && (
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 shrink-0">
                  Ditukar:{" "}
                  <strong className="text-rose-600 font-extrabold">
                    {student.redeemed_points}
                  </strong>
                </span>
              )}
              <svg
                className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition-colors shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>
        </div>

        {/* Peraturan Siswa — semua dokumen PDF yang diunggah admin */}
        {rulesDocuments.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  📖 Informasi Bimba
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Dokumen PDF dari admin — terbaru di atas.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {rulesDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                      {doc.file_name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Diunggah {formatShortDate(doc.uploaded_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-brand-600 hover:bg-brand-700 active:scale-98 transition-all shadow-md shadow-brand-500/20 cursor-pointer"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    Lihat PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Penting — Red Card */}
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
          <div className="text-lg shrink-0">⚠️</div>
          <div className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
            <strong>Info Poin Kehadiran:</strong> Siswa mendapatkan{" "}
            <strong>+1 Poin</strong> setiap kali masuk kelas. Hadiah dapat
            ditukarkan langsung melalui Admin/Tutor di tempat les.
          </div>
        </div>

        {/* Ganti PIN Akses — Standalone Card */}
        <button
          type="button"
          onClick={() => {
            setShowChangePinModal(true);
            setNewPin("");
            setConfirmPin("");
            setPinErrorMsg("");
            setPinSuccessMsg("");
            setShowPinText(false);
          }}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800/80 active:scale-[0.98] transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-lg shrink-0 group-hover:bg-brand-100 dark:group-hover:bg-brand-500/20 transition-colors">
            🔑
          </div>
          <div className="flex-1 text-left">
            <span className="block text-sm font-bold text-slate-900 dark:text-white">
              Ganti PIN Akses
            </span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Ubah PIN login Portal Orang Tua. Perubahan langsung berlaku.
            </span>
          </div>
          <svg
            className="w-5 h-5 text-slate-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        {/* Rapor & Laporan Content — Always Visible */}
        <div className="space-y-4">
          {/* Header & Date Range Download Control Panel */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
            {/* Header Title & Badge */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  📄 Laporan Perkembangan Siswa
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Filter berdasarkan tanggal dan unduh file PDF resmi.
                </p>
              </div>
              <span className="shrink-0 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                {filteredWorksheets.length} Sesi
              </span>
            </div>

            {/* Date Filter & Action Button Grid */}
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
                    <span>Download PDF ({filteredWorksheets.length} Sesi)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Printable Container for PDF Export */}
          <div ref={printableRef} className="space-y-6">
            {filteredWorksheets.length === 0 ? (
              <div className="py-12 text-center text-slate-400 italic bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                Tidak ada data laporan perkembangan untuk rentang tanggal yang
                dipilih.
              </div>
            ) : (
              (() => {
                const grouped = new Map<string, any[]>();
                filteredWorksheets.forEach((w) => {
                  const bk = w.bulan_ke ?? "none";
                  const key = String(bk);
                  if (!grouped.has(key)) grouped.set(key, []);
                  grouped.get(key)!.push(w);
                });
                const sortedGroups = Array.from(grouped.entries()).sort(
                  (a, b) => {
                    const aNum = a[0] === "none" ? 0 : parseInt(a[0]);
                    const bNum = b[0] === "none" ? 0 : parseInt(b[0]);
                    return aNum - bNum;
                  },
                );
                return sortedGroups.map(([bk, wsGroup]) => (
                  <StudentWorksheetTable
                    key={`parent_${student.id}_${bk}`}
                    student={{ ...student, photo_url: photoUrl }}
                    worksheets={wsGroup}
                    bulanKe={bk === "none" ? null : parseInt(bk, 10)}
                    isParentView={true}
                    hideDownloadBtn={true}
                  />
                ));
              })()
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-6 border-t border-slate-200/60 dark:border-slate-800 text-center text-xs text-slate-400">
        <p>
          © {new Date().getFullYear()} ShiningSun Preschool & Academy. Portal
          Orang Tua & Rapor Digital.
        </p>
      </footer>

      {/* Back Button Confirmation Modal */}
      {showBackConfirm && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm px-5 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-sm w-full space-y-5 animate-in zoom-in-95 duration-200">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-3xl border-2 border-amber-200 dark:border-amber-700">
                ⚠️
              </div>
            </div>

            {/* Text */}
            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Keluar dari Portal?
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Apakah Anda yakin ingin keluar dari Portal Orang Tua? Anda perlu
                memasukkan kode akses kembali untuk masuk.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBackCancel}
                className="flex-1 py-3 rounded-xl text-sm font-extrabold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer active:scale-95"
              >
                Tetap di Sini
              </button>
              <button
                type="button"
                onClick={handleBackConfirmLogout}
                disabled={isLoggingOut}
                className="flex-1 py-3 rounded-xl text-sm font-extrabold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-all cursor-pointer active:scale-95 shadow-md shadow-rose-500/20"
              >
                {isLoggingOut ? "Keluar..." : "Ya, Keluar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Photo Crop Modal */}
      {showCropModal && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 p-5 sm:p-7 max-w-md w-full space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">✂️</span>
                <h3 className="text-base font-extrabold text-white">
                  Atur & Potong Foto Profil
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCropModal(false)}
                className="text-slate-400 hover:text-white text-lg p-1 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Instruction */}
            <p className="text-xs text-slate-300 text-center">
              Geser posisi foto & atur perbesaran (zoom) agar sesuai dalam
              bingkai lingkaran.
            </p>

            {/* Interactive Preview Container (260x260px) */}
            <div className="flex justify-center my-2">
              <div
                className="relative w-65 h-65 rounded-full overflow-hidden border-4 border-brand-500 shadow-2xl bg-black cursor-grab active:cursor-grabbing select-none touch-none"
                onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
                onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) {
                    handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                onTouchMove={(e) => {
                  if (e.touches.length === 1) {
                    handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                onTouchEnd={handleDragEnd}
              >
                {rawImageSrc && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={rawImageSrc}
                    alt="Preview Crop"
                    draggable={false}
                    className="absolute max-w-none transition-transform duration-75 pointer-events-none"
                    style={{
                      transform: `translate(-50%, -50%) translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropZoom})`,
                      left: "50%",
                      top: "50%",
                      width: "100%",
                      height: "auto",
                    }}
                  />
                )}
                <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none"></div>
              </div>
            </div>

            {/* Zoom Slider Control */}
            <div className="space-y-2 bg-slate-800/70 p-3 rounded-2xl border border-slate-700/60">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>Perbesaran (Zoom):</span>
                <span className="text-brand-400">
                  {Math.round(cropZoom * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCropZoom((z) => Math.max(1, z - 0.2))}
                  className="w-8 h-8 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold text-white shrink-0 active:scale-95 transition-all"
                >
                  ➖
                </button>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={cropZoom}
                  onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setCropZoom((z) => Math.min(3, z + 0.2))}
                  className="w-8 h-8 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold text-white shrink-0 active:scale-95 transition-all"
                >
                  ➕
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCropModal(false)}
                className="flex-1 py-3 rounded-2xl text-xs font-extrabold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer active:scale-95"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveCrop}
                disabled={isUploadingPhoto}
                className="flex-1 py-3 rounded-2xl text-xs font-extrabold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 transition-all cursor-pointer active:scale-95 shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2"
              >
                {isUploadingPhoto ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <span>✂️</span> Simpan Foto
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change PIN Modal ── */}
      {showChangePinModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isSubmittingPin && setShowChangePinModal(false)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 pt-6 pb-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mx-auto mb-3 text-2xl">
                🔑
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Ganti PIN Akses
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                PIN baru akan langsung berlaku untuk login Portal Orang Tua dan
                juga terupdate di sisi Admin.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleChangePin} className="px-6 pb-2 space-y-3">
              {pinErrorMsg && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-200">
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  <span>{pinErrorMsg}</span>
                </div>
              )}
              {pinSuccessMsg && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-200">
                  <span className="shrink-0 mt-0.5">✅</span>
                  <span>{pinSuccessMsg}</span>
                </div>
              )}

              {/* New PIN */}
              <div>
                <label
                  htmlFor="newPin"
                  className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
                >
                  PIN Baru
                </label>
                <div className="relative">
                  <input
                    id="newPin"
                    type={showPinText ? "text" : "password"}
                    inputMode="numeric"
                    autoComplete="new-password"
                    maxLength={10}
                    required
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 pr-10 py-2.5 text-sm font-bold tracking-widest text-slate-900 dark:text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal transition-all"
                    placeholder="Masukkan PIN baru (min. 4)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPinText(!showPinText)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 transition-colors rounded-lg"
                  >
                    {showPinText ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm PIN */}
              <div>
                <label
                  htmlFor="confirmPin"
                  className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
                >
                  Konfirmasi PIN Baru
                </label>
                <input
                  id="confirmPin"
                  type={showPinText ? "text" : "password"}
                  inputMode="numeric"
                  autoComplete="new-password"
                  maxLength={10}
                  required
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-sm font-bold tracking-widest text-slate-900 dark:text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal transition-all"
                  placeholder="Ulangi PIN baru"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2.5 pt-2 pb-4">
                <button
                  type="button"
                  disabled={isSubmittingPin}
                  onClick={() => setShowChangePinModal(false)}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-h-11"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPin}
                  className="flex-1 py-2.5 px-4 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 min-h-11 flex items-center justify-center gap-2"
                >
                  {isSubmittingPin ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>🔑 Simpan PIN Baru</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Schedule Modal ── */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowScheduleModal(false)}
          />
          <div className="relative z-10 w-full max-w-lg max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-lg">
                  📅
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Jadwal Kelas
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Jadwal mendatang & riwayat kelas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <StudentScheduleCard
                upcomingSchedules={upcomingSchedules}
                scheduleHistory={scheduleHistory}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Points & Redemption History Modal ── */}
      {showPointsModal && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowPointsModal(false)}
          />
          <div className="relative z-10 w-full max-w-lg max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-lg">
                  ⭐
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Riwayat Poin
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Rincian kehadiran & penukaran hadiah
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPointsModal(false)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Points Summary */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3">
                    <div className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-300">
                      +{grossPoints}
                    </div>
                    <div className="text-[10px] sm:text-xs text-amber-800 dark:text-amber-400 font-semibold mt-0.5">
                      Total Hadir
                    </div>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl p-3">
                    <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-300">
                      -{Math.max(0, redeemedPoints)}
                    </div>
                    <div className="text-[10px] sm:text-xs text-rose-800 dark:text-rose-400 font-semibold mt-0.5">
                      Sudah Ditukar
                    </div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3">
                    <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300">
                      {netPoints}
                    </div>
                    <div className="text-[10px] sm:text-xs text-emerald-800 dark:text-emerald-400 font-semibold mt-0.5">
                      Sisa Poin Aktif
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Section 1: Kehadiran ── */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📋</span>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                        Poin Kehadiran
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        +1 poin setiap hadir kelas
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-700">
                    +{grossPoints} Poin
                  </span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                  {worksheets.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 italic">
                      Belum ada data kehadiran.
                    </div>
                  ) : (
                    (() => {
                      const attended = worksheets.filter((w) => {
                        const m = (w.materi || "").toLowerCase();
                        const t = (w.title || "").toLowerCase();
                        const isAbsent =
                          m.includes("tidak hadir") ||
                          m.includes("libur") ||
                          t.includes("tidak hadir") ||
                          t.includes("libur") ||
                          t.includes("ijin") ||
                          t.includes("sakit");
                        return !isAbsent;
                      });
                      const absent = worksheets.filter((w) => {
                        const m = (w.materi || "").toLowerCase();
                        const t = (w.title || "").toLowerCase();
                        return (
                          m.includes("tidak hadir") ||
                          m.includes("libur") ||
                          t.includes("tidak hadir") ||
                          t.includes("libur") ||
                          t.includes("ijin") ||
                          t.includes("sakit")
                        );
                      });
                      return (
                        <>
                          {attended.map((w, idx) => (
                            <div
                              key={w.id || `att-${idx}`}
                              className="px-4 py-2.5 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                                  {w.materi || w.title || "Kelas"}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {w.worksheet_date
                                    ? formatShortDate(w.worksheet_date)
                                    : w.created_at
                                      ? formatShortDate(w.created_at)
                                      : "-"}
                                </span>
                              </div>
                              <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                                +1
                              </span>
                            </div>
                          ))}
                          {absent.map((w, idx) => (
                            <div
                              key={w.id || `abs-${idx}`}
                              className="px-4 py-2.5 flex items-center justify-between gap-2 opacity-50"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate block">
                                  {w.materi || w.title || "Tidak Hadir"}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {w.worksheet_date
                                    ? formatShortDate(w.worksheet_date)
                                    : w.created_at
                                      ? formatShortDate(w.created_at)
                                      : "-"}
                                </span>
                              </div>
                              <span className="text-[11px] font-bold text-slate-400 shrink-0">
                                0
                              </span>
                            </div>
                          ))}
                        </>
                      );
                    })()
                  )}
                </div>
              </div>

              {/* ── Section 2: Manual Poin (Bonus) ── */}
              {(() => {
                const bonusItems = redemptions.filter(
                  (r) => (r.points_deducted || 0) < 0,
                );
                const totalBonus = bonusItems.reduce(
                  (sum, r) => sum + Math.abs(r.points_deducted || 0),
                  0,
                );
                return (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-sky-50 dark:bg-sky-950/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">➕</span>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                            Manual Poin
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Bonus poin dari Admin
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/40 px-2.5 py-1 rounded-lg border border-sky-200 dark:border-sky-700">
                        +{totalBonus} Poin
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                      {bonusItems.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 italic">
                          Belum ada bonus poin manual.
                        </div>
                      ) : (
                        bonusItems.map((item) => {
                          const pointsAmount = Math.abs(item.points_deducted);
                          return (
                            <div
                              key={item.id}
                              className="px-4 py-2.5 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                                  {item.reward_note || "Bonus Poin Manual"}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {item.created_at
                                    ? formatShortDate(item.created_at)
                                    : "-"}
                                </span>
                              </div>
                              <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 shrink-0">
                                +{pointsAmount} Poin
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ── Section 3: Penukaran Hadiah ── */}
              {(() => {
                const redeemItems = redemptions.filter(
                  (r) => (r.points_deducted || 0) > 0,
                );
                const totalRedeemed = redeemItems.reduce(
                  (sum, r) => sum + (r.points_deducted || 0),
                  0,
                );
                return (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-rose-50 dark:bg-rose-950/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🎁</span>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                            Penukaran Hadiah
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Poin ditukar menjadi hadiah
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/40 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-700">
                        -{totalRedeemed} Poin
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                      {redeemItems.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 italic">
                          Belum ada penukaran hadiah.
                        </div>
                      ) : (
                        redeemItems.map((item) => {
                          const pointsAmount = Math.abs(item.points_deducted);
                          return (
                            <div
                              key={item.id}
                              className="px-4 py-2.5 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                                  {item.reward_note || "Penukaran Hadiah"}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {item.created_at
                                    ? formatShortDate(item.created_at)
                                    : "-"}
                                </span>
                              </div>
                              <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800 shrink-0">
                                -{pointsAmount} Poin
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {previewDoc && (
        <PdfViewerModal
          fileUrl={previewDoc.file_url}
          title={previewDoc.file_name}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
