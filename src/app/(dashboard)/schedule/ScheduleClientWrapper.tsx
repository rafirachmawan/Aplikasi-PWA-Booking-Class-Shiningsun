"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ScheduleManagerDrawer } from "@/components/features/schedule/ScheduleManagerDrawer";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface ScheduleClientWrapperProps {
  schedules: any[];
  classes: any[];
  students: any[];
  currentMonth: number; // 1-12
  currentYear: number;
  activeBranchName?: string | null;
}

const FIXED_TIMES = [
  { time: "08:00", range: "08:00 - 09:00" },
  { time: "09:00", range: "09:00 - 10:00" },
  { time: "10:00", range: "10:00 - 11:00" },
  { time: "11:00", range: "11:00 - 12:00" },
  { time: "13:00", range: "13:00 - 14:00" },
  { time: "14:00", range: "14:00 - 15:00" },
  { time: "15:00", range: "15:00 - 16:00" },
  { time: "16:00", range: "16:00 - 17:00" },
];

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
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

function getWeeksOfMonth(year: number, month: number) {
  const weeks: (Date | null)[][] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  let currentWeek: (Date | null)[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (currentWeek.length === 0) {
      const dow = date.getDay();
      for (let pad = 0; pad < dow; pad++) currentWeek.push(null);
    }
    currentWeek.push(date);
    if (date.getDay() === 6 || day === daysInMonth) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  return weeks;
}

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ScheduleClientWrapper({
  schedules,
  classes,
  students,
  currentMonth,
  currentYear,
  activeBranchName,
}: ScheduleClientWrapperProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterClassId, setFilterClassId] = useState<string>(
    classes.length > 0 ? classes[0].id : "",
  );
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [weekIndex, setWeekIndex] = useState(0);

  // Custom dropdown Filter Kelas (pola sama dengan dropdown lain di aplikasi)
  const [isClassFilterOpen, setIsClassFilterOpen] = useState(false);
  const [classFilterSearch, setClassFilterSearch] = useState("");
  const classFilterSearchRef = useRef<HTMLInputElement>(null);

  const weeks = useMemo(
    () => getWeeksOfMonth(currentYear, currentMonth),
    [currentYear, currentMonth],
  );

  useEffect(() => {
    setIsLoadingMonth(false);
    const today = new Date();
    if (
      today.getFullYear() === currentYear &&
      today.getMonth() + 1 === currentMonth
    ) {
      const idx = weeks.findIndex((w) =>
        w.some((d) => d && d.getDate() === today.getDate()),
      );
      setWeekIndex(idx >= 0 ? idx : 0);
    } else {
      setWeekIndex(0);
    }
  }, [currentMonth, currentYear, weeks]);

  useEffect(() => {
    if (isClassFilterOpen) {
      setClassFilterSearch("");
    }
  }, [isClassFilterOpen]);

  const navigateMonth = (direction: "prev" | "next") => {
    setIsLoadingMonth(true);
    let newMonth = direction === "next" ? currentMonth + 1 : currentMonth - 1;
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

  const filteredSchedules = schedules.filter(
    (s) => s.class_id === filterClassId,
  );
  const schedulesByDate: Record<string, any[]> = {};
  filteredSchedules.forEach((s) => {
    if (!schedulesByDate[s.date]) schedulesByDate[s.date] = [];
    schedulesByDate[s.date].push(s);
  });

  const currentWeek = weeks[weekIndex] || [];

  const selectedClassName = filterClassId
    ? classes.find((c) => c.id === filterClassId)?.name
    : "Semua Kelas";

  const filteredFilterClasses = classFilterSearch.trim()
    ? classes.filter((c) =>
        c.name
          .toLowerCase()
          .includes(classFilterSearch.trim().toLowerCase()),
      )
    : classes;

  const handleDownload = async () => {
    // Store all the original styles to restore after capture
    const restoreList: { el: HTMLElement; prop: string; val: string }[] = [];
    const setAndTrack = (el: HTMLElement, prop: string, val: string) => {
      restoreList.push({ el, prop, val: el.style.getPropertyValue(prop) });
      el.style.setProperty(prop, val, "important");
    };

    try {
      setIsDownloading(true);

      // Load html-to-image and jspdf dynamically via CDN
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

      const element = document.getElementById("printable-schedule");
      if (!element) return;

      // 1. Force the main element to desktop width so Tailwind renders it correctly
      setAndTrack(element, "width", "1200px");
      setAndTrack(element, "max-width", "1200px");
      setAndTrack(element, "overflow", "visible");
      setAndTrack(element, "padding", "32px");
      setAndTrack(element, "box-sizing", "border-box");

      // 2. Show the print header
      const printHeader = element.querySelector(
        ".print\\:block",
      ) as HTMLElement;
      if (printHeader) {
        setAndTrack(printHeader, "display", "block");
        setAndTrack(printHeader, "padding-bottom", "16px");
        setAndTrack(printHeader, "margin-bottom", "20px");
        setAndTrack(printHeader, "border-bottom", "2px solid #e2e8f0");
      }

      // 3. Expand overflow wrappers
      element
        .querySelectorAll(".overflow-x-auto, .overflow-y-auto")
        .forEach((el) => {
          setAndTrack(el as HTMLElement, "overflow", "visible");
        });

      // 4. Expand all fixed-height cells so all students are visible
      element.querySelectorAll(".h-\\[72px\\]").forEach((el) => {
        setAndTrack(el as HTMLElement, "height", "auto");
        setAndTrack(el as HTMLElement, "overflow", "visible");
      });

      // 5. Ensure table stretches full width with thick borders
      element.querySelectorAll("table").forEach((el) => {
        setAndTrack(el as HTMLElement, "width", "100%");
        setAndTrack(el as HTMLElement, "border-collapse", "collapse");
        setAndTrack(el as HTMLElement, "border", "2px solid #94a3b8");
      });

      // 6. Thicken all th and td borders for cleaner grid lines in PDF
      element.querySelectorAll("th").forEach((el) => {
        setAndTrack(el as HTMLElement, "border", "1.5px solid #94a3b8");
        setAndTrack(el as HTMLElement, "background-color", "#f1f5f9");
        setAndTrack(el as HTMLElement, "padding", "6px 4px");
      });

      element.querySelectorAll("td").forEach((el, index) => {
        const htmlEl = el as HTMLElement;
        setAndTrack(htmlEl, "border", "1.5px solid #cbd5e1");
        setAndTrack(htmlEl, "padding", "4px");
      });

      // Style the time (first column) td specially — bold, aligned top, grey background
      element.querySelectorAll("tbody tr").forEach((row) => {
        const firstTd = row.querySelector("td:first-child") as HTMLElement;
        if (firstTd) {
          setAndTrack(firstTd, "background-color", "#f8fafc");
          setAndTrack(firstTd, "border-right", "2px solid #64748b");
          setAndTrack(firstTd, "vertical-align", "top");
          setAndTrack(firstTd, "padding-top", "10px");
          const span = firstTd.querySelector("span") as HTMLElement;
          if (span) {
            setAndTrack(span, "font-weight", "700");
            setAndTrack(span, "font-size", "11px");
            setAndTrack(span, "color", "#1e293b");
          }
        }
      });

      // Wait one frame for the browser to reflow/repaint at the new size
      await new Promise((r) => setTimeout(r, 300));

      // 6. Capture the element (now rendered at 1200px desktop width)
      const dataUrl = await (window as any).htmlToImage.toPng(element, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        filter: (node: HTMLElement) => {
          // Exclude no-print elements from the capture
          if (node.classList && node.classList.contains("no-print"))
            return false;
          return true;
        },
      });

      // 7. Restore all original styles immediately after capture
      restoreList.reverse().forEach(({ el, prop, val }) => {
        el.style.setProperty(prop, val);
        if (!val) el.style.removeProperty(prop);
      });
      if (printHeader) {
        printHeader.style.removeProperty("display");
      }

      // 8. Build the PDF
      const { jsPDF } = (window as any).jspdf;
      const pdf = new jsPDF({
        orientation: "landscape",
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
      pdf.addImage(dataUrl, "PNG", xOffset, margin, imgWidth, imgHeight);
      pdf.save(
        `Jadwal_Kelas_${MONTH_NAMES[currentMonth - 1]}_${currentYear}.pdf`,
      );
    } catch (error) {
      // Always restore styles even on error
      restoreList.reverse().forEach(({ el, prop, val }) => {
        el.style.setProperty(prop, val);
        if (!val) el.style.removeProperty(prop);
      });
      console.error("Failed to generate PDF:", error);
      alert("Gagal men-download PDF. Silakan coba lagi.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {isLoadingMonth && <LoadingSpinner usePortal={true} />}

      {/* Judul halaman: hero biru solid selaras dashboard Hallo. */}
      <div className="overflow-hidden rounded-2xl bg-brand-600 border border-brand-700/30 shadow-sm no-print">
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium text-white/85">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
            {activeBranchName ? ` - Cabang ${activeBranchName}` : ""}
          </p>
          <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Jadwal Keseluruhan
          </h2>
          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-white/85">
            Lihat jadwal operasional seluruh kelas dan siswa bulan ini.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 shadow-sm mb-6 flex flex-col xl:flex-row xl:items-end justify-between gap-5 no-print">
        {/* Filter */}
        <div className="flex flex-col gap-1.5 w-full xl:w-64 no-print">
          <label className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
            Filter Kelas
          </label>
          <div className="relative w-full">
            {/* Trigger Button */}
            <button
              type="button"
              onClick={() => setIsClassFilterOpen(!isClassFilterOpen)}
              className={`w-full flex items-center justify-between gap-2 bg-white dark:bg-zinc-900 pl-4 pr-3 rounded-xl border text-sm font-medium text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer h-11 ${
                isClassFilterOpen
                  ? "border-brand-500 ring-2 ring-brand-500/30"
                  : "border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600"
              }`}
            >
              <span className="truncate text-left">
                {filterClassId
                  ? classes.find((c) => c.id === filterClassId)?.name ||
                    "-- Semua Kelas --"
                  : "-- Semua Kelas --"}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`text-slate-400 transition-transform duration-200 shrink-0 ${
                  isClassFilterOpen ? "rotate-180 text-brand-500" : ""
                }`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {/* Floating Menu Popover */}
            {isClassFilterOpen && (
              <>
                {/* Invisible Backdrop (tanpa blur/gelap — halaman tetap normal) */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsClassFilterOpen(false)}
                />

                {/* Menu Popover Container */}
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-1.5 space-y-1">
                  {/* Search */}
                  <div className="p-1">
                    <input
                      ref={classFilterSearchRef}
                      type="text"
                      value={classFilterSearch}
                      onChange={(e) => setClassFilterSearch(e.target.value)}
                      placeholder="Cari kelas..."
                      className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1">
                    {filteredFilterClasses.map((c) => {
                      const isSelected = c.id === filterClassId;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setFilterClassId(c.id);
                            setIsClassFilterOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 font-semibold border border-brand-200 dark:border-brand-800/50"
                              : "text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <span className="truncate text-left font-semibold text-slate-900 dark:text-white">
                            {c.name}
                          </span>
                          {isSelected && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-brand-600 dark:text-brand-400 shrink-0 ml-2"
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          )}
                        </button>
                      );
                    })}

                    {filteredFilterClasses.length === 0 && (
                      <p className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500 text-center font-medium">
                        Kelas tidak ditemukan.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions & Navigation */}
        <div className="flex flex-row flex-wrap items-end gap-3 w-full xl:w-auto justify-start xl:justify-end no-print">
          <div className="flex flex-col gap-1.5 w-full sm:w-auto order-3 sm:order-1">
            <span className="hidden sm:block text-xs font-semibold pl-1 select-none" aria-hidden="true">
              &nbsp;
            </span>
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={() => window.print()}
                className="flex-1 sm:flex-none justify-center bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 px-4 rounded-xl border border-slate-300 dark:border-zinc-700 flex items-center gap-2 h-11 font-semibold text-sm transition-colors cursor-pointer"
                title="Export ke PDF (A4 Landscape)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" x2="12" y1="15" y2="3" />
                </svg>
                Export PDF
              </button>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex-1 sm:flex-none justify-center bg-brand-600 hover:bg-brand-700 active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 rounded-xl border border-transparent flex items-center gap-2 h-11 font-semibold text-sm transition-colors cursor-pointer"
                title="Download Jadwal (PDF)"
              >
                {isDownloading ? (
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
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                )}
                {isDownloading ? "Memproses..." : "Download"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 flex-1 sm:flex-none order-1 sm:order-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
              Bulan
            </label>
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-800 p-1 rounded-xl border border-slate-200 dark:border-zinc-700 justify-center h-11">
              {(() => {
                const prevM = currentMonth === 1 ? 12 : currentMonth - 1;
                const prevY =
                  currentMonth === 1 ? currentYear - 1 : currentYear;
                const nextM = currentMonth === 12 ? 1 : currentMonth + 1;
                const nextY =
                  currentMonth === 12 ? currentYear + 1 : currentYear;
                return (
                  <>
                    <a
                      href={`/schedule?month=${prevM}&year=${prevY}`}
                      className="min-w-11 h-9 flex items-center justify-center rounded-lg text-slate-600 dark:text-zinc-300 hover:text-brand-600 hover:bg-white dark:hover:bg-zinc-700 active:translate-y-[1px] transition-colors font-bold text-base cursor-pointer"
                      title="Bulan Sebelumnya"
                      aria-label="Bulan sebelumnya"
                    >
                      &larr;
                    </a>
                    <span className="font-bold text-slate-900 dark:text-white text-sm whitespace-nowrap px-2 text-center select-none tabular-nums">
                      {MONTH_NAMES[currentMonth - 1].substring(0, 3)}{" "}
                      {currentYear}
                    </span>
                    <a
                      href={`/schedule?month=${nextM}&year=${nextY}`}
                      className="min-w-11 h-9 flex items-center justify-center rounded-lg text-slate-600 dark:text-zinc-300 hover:text-brand-600 hover:bg-white dark:hover:bg-zinc-700 active:translate-y-[1px] transition-colors font-bold text-base cursor-pointer"
                      title="Bulan Berikutnya"
                      aria-label="Bulan berikutnya"
                    >
                      &rarr;
                    </a>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 flex-1 sm:flex-none order-2 sm:order-3">
            <label className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
              Minggu Ke
            </label>
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-800 p-1 rounded-xl border border-slate-200 dark:border-zinc-700 justify-center h-11">
              <button
                type="button"
                onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
                disabled={weekIndex === 0}
                className="min-w-11 h-9 flex items-center justify-center rounded-lg text-slate-600 dark:text-zinc-300 hover:text-brand-600 hover:bg-white dark:hover:bg-zinc-700 active:translate-y-[1px] disabled:opacity-30 disabled:pointer-events-none transition-colors font-bold text-base cursor-pointer"
                title="Minggu Sebelumnya"
                aria-label="Minggu sebelumnya"
              >
                &larr;
              </button>
              <span className="text-sm font-bold text-slate-700 dark:text-zinc-200 whitespace-nowrap px-2 text-center select-none tabular-nums">
                {weekIndex + 1} / {weeks.length}
              </span>
              <button
                type="button"
                onClick={() =>
                  setWeekIndex((i) => Math.min(weeks.length - 1, i + 1))
                }
                disabled={weekIndex >= weeks.length - 1}
                className="min-w-11 h-9 flex items-center justify-center rounded-lg text-slate-600 dark:text-zinc-300 hover:text-brand-600 hover:bg-white dark:hover:bg-zinc-700 active:translate-y-[1px] disabled:opacity-30 disabled:pointer-events-none transition-colors font-bold text-base cursor-pointer"
                title="Minggu Berikutnya"
                aria-label="Minggu berikutnya"
              >
                &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page { size: A4 landscape; margin: 0; }
          html, body { 
            height: 100vh !important;
            max-height: 100vh !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
            background: white !important; 
            margin: 0 !important;
            padding: 0 !important;
          }
          aside, header, nav, .no-print { display: none !important; }
          main, main > div, .lg\\:pl-72 { padding: 0 !important; margin: 0 !important; border: none !important; }
          
          #printable-schedule { 
            position: relative !important; 
            width: 100%; 
            height: 100vh !important;
            max-height: 100vh !important;
            border: none !important; 
            box-shadow: none !important; 
            margin: 0 !important;
            padding: 12mm 15mm !important;
            box-sizing: border-box !important;
            display: flex;
            flex-direction: column;
          }
          
          /* Print Header Styles */
          #printable-schedule > .print\\:block { padding-bottom: 8px !important; margin-bottom: 8px !important; border-bottom: 2px solid #e2e8f0 !important; }
          #printable-schedule h1 { font-size: 16px !important; margin-bottom: 2px !important; color: #0f172a !important; }
          #printable-schedule p { font-size: 11px !important; color: #475569 !important; }

          /* Ensure table fits on page */
          #printable-schedule .overflow-x-auto { flex: 1; overflow: hidden !important; }
          #printable-schedule table { width: 100%; height: 100%; table-layout: fixed; margin-bottom: 0 !important; border-collapse: collapse !important; }
          
          /* adjust text sizes for print to fit A4 */
          #printable-schedule th { padding: 4px !important; border: 1px solid #cbd5e1 !important; background-color: #f8fafc !important; }
          #printable-schedule td { padding: 3px !important; border: 1px solid #cbd5e1 !important; }
          #printable-schedule .h-\\[72px\\] { height: 100% !important; min-height: 0 !important; max-height: 100% !important; overflow: hidden !important; }
          
          /* Shrink fonts to maximize fit */
          #printable-schedule * { line-height: 1.2 !important; }
          /* Student name badges */
          #printable-schedule td > div > div > div.rounded { 
            font-size: 8px !important; 
            padding: 1.5px 3px !important; 
            margin-bottom: 1.5px !important; 
            border-left-width: 3px !important; 
          }
          /* Quota text */
          #printable-schedule td > div > div.text-right { font-size: 7px !important; margin-bottom: 1px !important; }
          /* Time column */
          #printable-schedule td > span.text-\\[10px\\] { font-size: 9px !important; }
          /* Date headers */
          #printable-schedule th > div.text-xs { font-size: 10px !important; }
          #printable-schedule th > div.mt-0\\.5 { width: 18px !important; height: 18px !important; font-size: 11px !important; margin-top: 2px !important; margin-bottom: 2px !important; }
          #printable-schedule th > div.text-\\[8px\\] { font-size: 8px !important; }
        }
      `,
        }}
      />

      {/* Timetable Grid */}
      <div
        id="printable-schedule"
        className="bg-white dark:bg-zinc-900 shadow-sm border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden relative"
      >
        {/* Print Header (Only visible in PDF/Print) */}
        <div className="hidden print:block print:pb-4 border-b border-slate-200 mb-4">
          <h1 className="text-xl font-bold text-slate-900">
            Jadwal Kelas ShiningSun{" "}
            {activeBranchName ? `Cabang ${activeBranchName}` : ""}
          </h1>
          <p className="text-sm text-slate-600 font-medium">
            Bulan: {MONTH_NAMES[currentMonth - 1]} {currentYear} | Kelas:{" "}
            {selectedClassName}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-175 border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800">
                <th className="w-22.5 px-2 py-2.5 text-[10px] lg:text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-center border-b border-r border-slate-200 dark:border-zinc-800">
                  Jam
                </th>
                {currentWeek.map((date, colIdx) => {
                  const isValid = !!date;
                  const todayStr = isValid ? fmtDate(date!) : "";
                  const isToday = isValid && todayStr === fmtDate(new Date());
                  return (
                    <th
                      key={colIdx}
                      onClick={() => isValid && setSelectedDate(todayStr)}
                      className={`px-1 py-2.5 text-center border-b border-r last:border-r-0 border-slate-200 dark:border-zinc-800 ${isValid ? "cursor-pointer hover:bg-brand-50 dark:hover:bg-zinc-800 transition-colors" : ""}`}
                    >
                      <div
                        className={`text-[10px] lg:text-xs font-semibold uppercase tracking-wider ${isToday ? "text-brand-600 dark:text-brand-400" : "text-slate-500 dark:text-zinc-400"}`}
                      >
                        {DAY_LABELS[colIdx]}
                      </div>
                      {isValid && (
                        <>
                          <div
                            className={`mt-0.5 text-xs lg:text-sm font-bold tabular-nums ${isToday ? "w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center mx-auto" : "text-slate-700 dark:text-zinc-200"}`}
                          >
                            {date!.getDate()}
                          </div>
                          <div
                            className={`text-[8px] lg:text-[10px] font-medium ${isToday ? "text-brand-600 dark:text-brand-400" : "text-slate-400 dark:text-zinc-500"}`}
                          >
                            {MONTH_NAMES[date!.getMonth()].substring(0, 3)}{" "}
                            {date!.getFullYear()}
                          </div>
                        </>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {FIXED_TIMES.map(({ time, range }) => (
                <tr
                  key={time}
                  className="border-b border-slate-200 dark:border-zinc-800 last:border-b-0"
                >
                  <td className="px-2 py-3 text-center border-r border-slate-200 dark:border-zinc-800 align-top bg-slate-50 dark:bg-zinc-800/60 w-22.5">
                    <span className="text-[10px] lg:text-xs font-bold text-slate-600 dark:text-zinc-300 whitespace-nowrap tabular-nums">
                      {range}
                    </span>
                  </td>
                  {currentWeek.map((date, colIdx) => {
                    if (!date)
                      return (
                        <td
                          key={colIdx}
                          className="border-r last:border-r-0 border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900"
                        >
                          <div className="h-18" />
                        </td>
                      );

                    const dateString = fmtDate(date);
                    const daySchedules = schedulesByDate[dateString] || [];
                    const slotsAtTime = daySchedules.filter((s: any) =>
                      s.time.startsWith(time),
                    );

                    return (
                      <td
                        key={colIdx}
                        onClick={() => setSelectedDate(dateString)}
                        className="px-1 py-1.5 border-r last:border-r-0 border-slate-200 dark:border-zinc-800 align-top cursor-pointer hover:bg-brand-50 dark:hover:bg-zinc-800/60 transition-colors"
                      >
                        <div className="h-18 overflow-y-auto">
                          {slotsAtTime.length === 0 ? (
                            <div className="py-2" aria-hidden="true" />
                          ) : (
                            slotsAtTime.map((slot: any) => {
                              const bookedCount = slot.bookings?.length || 0;
                              const isFull =
                                bookedCount >= slot.class.max_quota;
                              const isEmpty = bookedCount === 0;

                              const quotaColor = isFull
                                ? "text-red-600 dark:text-red-400"
                                : isEmpty
                                  ? "text-slate-400 dark:text-zinc-500"
                                  : "text-brand-600 dark:text-brand-400";

                              return (
                                <div key={slot.id} className="space-y-0.5">
                                  <div
                                    className={`text-[8px] lg:text-[9px] font-semibold text-right ${quotaColor}`}
                                  >
                                    {isEmpty
                                      ? ""
                                      : `${bookedCount}/${slot.class.max_quota}`}
                                  </div>
                                  {isEmpty ? (
                                    <div className="py-0.5" aria-hidden="true" />
                                  ) : (
                                    slot.bookings.map((b: any) => {
                                      const isCG = b.student?.status === "CG";
                                      const hexColor =
                                        b.student?.label?.hex_color ||
                                        "#94a3b8";
                                      return (
                                        <div
                                          key={b.student_id}
                                          className={`px-1.5 py-0.5 text-[9px] lg:text-[10px] font-bold rounded truncate leading-tight ${
                                            isCG
                                              ? "bg-slate-50 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700"
                                              : "text-slate-900 dark:text-zinc-100"
                                          }`}
                                          style={
                                            isCG
                                              ? {
                                                  borderLeft:
                                                    "4px solid #cbd5e1",
                                                }
                                              : {
                                                  backgroundColor: `${hexColor}CC`,
                                                  borderLeft: `4px solid ${hexColor}`,
                                                }
                                          }
                                          title={`${isCG ? "(CG) " : ""}${b.student?.nickname || b.student?.name}`}
                                        >
                                          {isCG && (
                                            <span className="text-slate-500 dark:text-zinc-400 font-bold mr-0.5">
                                              (CG)
                                            </span>
                                          )}
                                          {b.student?.nickname ||
                                            b.student?.name}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDate && (
        <ScheduleManagerDrawer
          selectedDate={selectedDate}
          classes={classes}
          students={students}
          existingSlots={schedulesByDate[selectedDate] || []}
          defaultClassId={filterClassId}
          onClose={() => setSelectedDate(null)}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
