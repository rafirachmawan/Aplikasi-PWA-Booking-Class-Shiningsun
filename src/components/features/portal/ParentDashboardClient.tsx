"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Icons } from "@/components/ui/icons";
import { StudentScheduleCard } from "./StudentScheduleCard";
import { BirthdayGreetingCard } from "./BirthdayGreetingCard";
import {
  clearParentSession,
  updateStudentPhotoUrl,
  updateStudentAccessPin,
} from "@/lib/actions";
import { formatShortDate, calculateStudentPoints } from "@/lib/dateUtils";
import { PdfViewerModal } from "@/components/ui/PdfViewerModal";
import { ParentPointsHistoryModal } from "./tabs/ParentPointsHistoryModal";
import { ParentChangePinModal } from "./tabs/ParentChangePinModal";
import { ParentPhotoCropModal } from "./tabs/ParentPhotoCropModal";
import { ParentWorksheetSection } from "./tabs/ParentWorksheetSection";
import { ParentOverviewCard } from "./tabs/ParentOverviewCard";

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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  // Birthday greeting state
  const [birthdayData, setBirthdayData] = useState<any>(null);
  const [loadingBirthday, setLoadingBirthday] = useState(true);
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);

  // Determine if should show full dashboard (or only birthday card)
  // Jika belum loading → selalu tampilkan dulu untuk prevent blank screen
  const shouldShowFullDashboard = useMemo(() => {
    const hasBirthdayToday = birthdayData !== null;
    const submitted = hasSubmittedFeedback;

    console.log(
      "[Dashboard Logic] birthdayData:",
      hasBirthdayToday ? "YES" : "NO",
      "submitted:",
      submitted ? "TRUE" : "FALSE",
    );

    return !hasBirthdayToday || submitted;
  }, [birthdayData, hasSubmittedFeedback]);

  // Log for debugging
  useEffect(() => {
    console.log("[Debug] Dashboard state updated:", {
      hasBirthdayToday: birthdayData !== null,
      submitted: hasSubmittedFeedback,
      shouldShowFull: shouldShowFullDashboard,
    });
  }, [birthdayData, hasSubmittedFeedback, shouldShowFullDashboard]);

  useEffect(() => {
    const fetchBirthdayGreeting = async () => {
      let isBirthdayTodayLocal = false;
      try {
        // Skip fetching if no student data
        if (!student?.id || !student?.date_of_birth) {
          console.log("❌ No student data or date_of_birth");
          setLoadingBirthday(false);
          return;
        }

        console.log(`🔍 Checking birthday for: ${student.name}`);
        console.log(`📅 Student DOB: ${student.date_of_birth}`);

        const today = new Date();
        const dob = new Date(student.date_of_birth);
        const birthMonth = dob.getMonth() + 1;
        const birthDay = dob.getDate();

        console.log(
          `📅 Today: ${today.toDateString()} (Month: ${today.getMonth() + 1}, Day: ${today.getDate()})`,
        );
        console.log(`🎂 Birth Month: ${birthMonth}, Birth Day: ${birthDay}`);

        // Check if today IS their birthday
        const isTodayBirthday =
          today.getMonth() + 1 === birthMonth && today.getDate() === birthDay;
        isBirthdayTodayLocal = isTodayBirthday;

        console.log(`✅ Is today birthday: ${isTodayBirthday}`);

        if (isTodayBirthday) {
          // Calculate age
          let age = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < dob.getDate())
          ) {
            age--;
          }

          const birthdayStudent = {
            ...student,
            age: age > 0 ? age : 0,
            is_today_birthday: true,
            days_until_birthday: 0,
          };

          setBirthdayData(birthdayStudent);
          console.log(`✅ Birthday card will show!`);
        } else {
          setBirthdayData(null);
          console.log(`❌ Not today's birthday`);
        }
      } catch (error) {
        console.error("Error checking birthday:", error);
      } finally {
        setLoadingBirthday(false);

        // Check if feedback already submitted HANYA jika hari ini ulang tahun siswa
        const studentIdToCheck = isBirthdayTodayLocal ? student?.id : null;
        if (studentIdToCheck) {
          try {
            console.log(
              `[Dashboard] Checking feedback for student: ${studentIdToCheck}`,
            );
            const feedbackResponse = await fetch(
              `/api/student-feedback?student_id=${studentIdToCheck}`,
            );
            const feedbackResult = await feedbackResponse.json();

            if (feedbackResult.success && feedbackResult.feedbacks.length > 0) {
              setHasSubmittedFeedback(true);
              console.log("✅ Has submitted feedback, can show dashboard");
            } else {
              setHasSubmittedFeedback(false);
              console.log(
                "❌ No feedback yet, will block dashboard only on birthday",
              );
            }
          } catch (err) {
            console.error("Error checking feedback status:", err);
            // Jika error, default show full dashboard
            setHasSubmittedFeedback(true);
          }
        } else {
          // No birthday data → show full dashboard immediately
          setHasSubmittedFeedback(true);
          console.log("📊 No birthday today, showing full dashboard");
        }
      }
    };

    fetchBirthdayGreeting();
  }, [student]);

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
    // Hemat Origin: cegah logout ganda (push+refresh ganda). Alur sukses sama.
    if (isLoggingOut) return;
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
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans pb-12">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 bg-white rounded-xl border border-slate-200 p-1 shrink-0">
              <Image
                src="/logo.webp"
                alt="ShiningSun Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-none truncate">
                Portal Orang Tua & Siswa
              </h1>
              <p className="text-[11px] text-brand-600 dark:text-brand-400 font-bold mt-0.5 truncate">
                ShiningSun Preschool & Academy
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            disabled={isLoggingOut}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-red-600 dark:text-zinc-300 dark:hover:text-red-400 bg-slate-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-500/10 active:translate-y-px transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
          >
            <span className="hidden sm:inline">
              {isLoggingOut ? "Keluar..." : "Keluar / Ganti Akses"}
            </span>
            <span className="sm:hidden">{isLoggingOut ? "..." : "Keluar"}</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      {!shouldShowFullDashboard && birthdayData ? (
        /* ONLY BIRTHDAY CARD - Hide everything else until feedback submitted */
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8 pb-8">
          {loadingBirthday ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-500 border-t-transparent"></div>
            </div>
          ) : (
            <BirthdayGreetingCard
              student={birthdayData}
              parentUserId={student.id}
            />
          )}
        </div>
      ) : (
        /* SHOW FULL DASHBOARD */
        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8 space-y-6">
          {/* Student Profile Card: satu-satunya color block di halaman.
              Dipertahankan sebagai blok brand (sapaan hangat untuk orang tua),
              tanpa gradient dan tanpa dekorasi blur. */}
          <ParentOverviewCard
            dobInfo={dobInfo}
            fileInputRef={fileInputRef}
            handlePhotoChange={handlePhotoChange}
            handlePhotoClick={handlePhotoClick}
            isUploadingPhoto={isUploadingPhoto}
            netPoints={netPoints}
            photoUrl={photoUrl}
            setShowPointsModal={setShowPointsModal}
            setShowScheduleModal={setShowScheduleModal}
            student={student}
          />

          {/* Ulang Tahun Hari Ini Section */}
          {birthdayData && !loadingBirthday && (
            <div>
              <BirthdayGreetingCard
                student={birthdayData}
                parentUserId={student.id} // Pass student ID as parent user id for this demo
              />

              {/* Hapus semua konten lain sampai feedback dikirim */}
              {!hasSubmittedFeedback && (
                <>
                  {/* Sembunyikan Rules Documents */}
                  {/* Sembunyikan Important Info */}
                  {/* Sembunyikan Change PIN button */}
                  {/* ... dan semua konten lain di bawahnya */}
                </>
              )}
            </div>
          )}

          {/* Peraturan Siswa — semua dokumen PDF yang diunggah admin */}
          {/* Hanya tampil jika sudah submit feedback atau bukan hari ini */}
          {rulesDocuments.length > 0 &&
            (!birthdayData || hasSubmittedFeedback) && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl p-2.5 bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 shrink-0">
                    <Icons.fileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Informasi Bimba
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      Dokumen PDF dari admin, terbaru di atas.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {rulesDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/60 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                          {doc.file_name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                          Diunggah {formatShortDate(doc.uploaded_at)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 active:translate-y-px transition-colors cursor-pointer"
                      >
                        Lihat PDF
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Info Penting — Red Card */}
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800/50 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
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
            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm hover:bg-slate-50 dark:hover:bg-zinc-800/70 active:translate-y-px transition-colors cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <Icons.shield className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <span className="block text-sm font-bold text-slate-900 dark:text-white">
                Ganti PIN Akses
              </span>
              <span className="block text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                Ubah PIN login Portal Orang Tua. Perubahan langsung berlaku.
              </span>
            </div>
            <Icons.chevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors shrink-0" />
          </button>

          {/* Rapor & Laporan Content — Always Visible */}
          <ParentWorksheetSection
            endDate={endDate}
            filteredWorksheets={filteredWorksheets}
            handleDownloadPdf={handleDownloadPdf}
            isDownloadingPdf={isDownloadingPdf}
            printableRef={printableRef}
            setEndDate={setEndDate}
            setStartDate={setStartDate}
            startDate={startDate}
            student={student}
          />
        </main>
      )}

      {/* Footer - Show only when full dashboard is displayed */}
      {shouldShowFullDashboard && (
        <footer className="mt-16 py-6 border-t border-slate-200 dark:border-zinc-800 text-center text-xs text-slate-400 dark:text-zinc-500">
          <p>
            © {new Date().getFullYear()} ShiningSun Preschool & Academy. Portal
            Orang Tua & Rapor Digital.
          </p>
        </footer>
      )}

      {/* Logout Confirmation Modal (tombol Keluar navbar) */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm px-5">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 max-w-sm w-full space-y-5">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                  />
                </svg>
              </div>
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Yakin Ingin Keluar?
              </h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                Apakah Anda yakin ingin keluar dari Portal Orang Tua? Anda
                perlu memasukkan nama dan PIN kembali untuk masuk.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer active:translate-y-px disabled:opacity-50"
              >
                Tetap di Sini
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer active:translate-y-px"
              >
                {isLoggingOut ? "Keluar..." : "Ya, Keluar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back Button Confirmation Modal */}
      {showBackConfirm && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm px-5">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 max-w-sm w-full space-y-5">
            {/* Text */}
            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Keluar dari Portal?
              </h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                Apakah Anda yakin ingin keluar dari Portal Orang Tua? Anda perlu
                memasukkan kode akses kembali untuk masuk.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBackCancel}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer active:translate-y-px"
              >
                Tetap di Sini
              </button>
              <button
                type="button"
                onClick={handleBackConfirmLogout}
                disabled={isLoggingOut}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer active:translate-y-px"
              >
                {isLoggingOut ? "Keluar..." : "Ya, Keluar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Photo Crop Modal */}
      {showCropModal && (
        <ParentPhotoCropModal
          cropOffset={cropOffset}
          cropZoom={cropZoom}
          handleDragEnd={handleDragEnd}
          handleDragMove={handleDragMove}
          handleDragStart={handleDragStart}
          handleSaveCrop={handleSaveCrop}
          isUploadingPhoto={isUploadingPhoto}
          rawImageSrc={rawImageSrc}
          setCropZoom={setCropZoom}
          setShowCropModal={setShowCropModal}
        />
      )}

      {/* ── Change PIN Modal ── */}
      {showChangePinModal && (
        <ParentChangePinModal
          confirmPin={confirmPin}
          handleChangePin={handleChangePin}
          isSubmittingPin={isSubmittingPin}
          newPin={newPin}
          pinErrorMsg={pinErrorMsg}
          pinSuccessMsg={pinSuccessMsg}
          setConfirmPin={setConfirmPin}
          setNewPin={setNewPin}
          setShowChangePinModal={setShowChangePinModal}
          setShowPinText={setShowPinText}
          showPinText={showPinText}
        />
      )}

      {/* ── Schedule Modal ── */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowScheduleModal(false)}
          />
          <div className="relative z-10 w-full max-w-lg max-h-[85vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                  <Icons.calendar className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Jadwal Kelas
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Jadwal mendatang dan riwayat kelas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                aria-label="Tutup"
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <Icons.close className="w-4 h-4" />
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
        <ParentPointsHistoryModal
          grossPoints={grossPoints}
          netPoints={netPoints}
          redeemedPoints={redeemedPoints}
          redemptions={redemptions}
          setShowPointsModal={setShowPointsModal}
          worksheets={worksheets}
        />
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
