"use client";

import { useState } from "react";
import Image from "next/image";
import { Icons } from "@/components/ui/icons";
import { formatShortDate } from "@/lib/dateUtils";
import { getGDriveDirectLink, getGDrivePreviewLink } from "@/lib/gdriveUtils";
import { updateParentFeedback } from "@/lib/actions";

interface StudentWorksheetTableProps {
  student: any;
  worksheets: any[];
  isParentView?: boolean;
  onAddRow?: (studentId: string, bulanKe?: number) => void;
  onEditRow?: (worksheet: any) => void;
  onDeleteRow?: (worksheetId: string) => void;
  onDeleteSheet?: (studentId: string, bulanKe: number | null, studentName: string) => void;
  onSetPin?: (student: any) => void;
}

interface ParentFeedbackItem {
  date: string;
  text: string;
}

function parseParentFeedback(rawText: string | null | undefined, fallbackDate?: string): ParentFeedbackItem[] {
  if (!rawText || !rawText.trim()) return [];
  const trimmed = rawText.trim();

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => ({
            date: item.date || fallbackDate || formatShortDate(new Date()),
            text: item.text || "",
          }))
          .filter((item) => item.text.trim() !== "");
      }
    } catch (e) {
      // Fallback
    }
  }

  // Multi-line or plain text format fallback
  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.map((line) => {
    let cleanLine = line.startsWith("-") || line.startsWith("•") ? line.substring(1).trim() : line;
    const colonIdx = cleanLine.indexOf(":");
    if (colonIdx > 0 && colonIdx < 25) {
      const possibleDate = cleanLine.substring(0, colonIdx).trim();
      const possibleText = cleanLine.substring(colonIdx + 1).trim();
      if (possibleText) {
        return { date: possibleDate, text: possibleText };
      }
    }
    return {
      date: fallbackDate || formatShortDate(new Date()),
      text: cleanLine,
    };
  });
}

export function StudentWorksheetTable({
  student,
  worksheets,
  isParentView = false,
  onAddRow,
  onEditRow,
  onDeleteRow,
  onDeleteSheet,
  onSetPin,
}: StudentWorksheetTableProps) {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Find latest bulan_ke or teacher note if available
  const latestMonth = [...worksheets].reverse().find((w) => w.bulan_ke != null)?.bulan_ke;
  const teacherNotes = worksheets
    .filter((w) => w.catatan_guru && w.catatan_guru.trim() !== "")
    .map((w) => ({
      date: w.worksheet_date,
      note: w.catatan_guru,
      teacher: w.ttd_guru,
    }));

  // Parent feedback list state
  const rawParentFeedback = worksheets.find((w) => w.catatan_ortu?.trim())?.catatan_ortu || "";
  const [feedbackList, setFeedbackList] = useState<ParentFeedbackItem[]>(() => parseParentFeedback(rawParentFeedback));
  const [newInputText, setNewInputText] = useState("");
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [itemToDeleteIndex, setItemToDeleteIndex] = useState<number | null>(null);

  const handleAddFeedbackItem = async () => {
    if (!newInputText.trim()) return;
    const newItem: ParentFeedbackItem = {
      date: formatShortDate(new Date()),
      text: newInputText.trim(),
    };
    const updatedList = [...feedbackList, newItem];
    const serialized = JSON.stringify(updatedList);

    try {
      setIsSavingFeedback(true);
      await updateParentFeedback(student.id, latestMonth ?? null, serialized);
      setFeedbackList(updatedList);
      setNewInputText("");
      setIsEditingFeedback(false);
      setFeedbackSuccess(true);
      setTimeout(() => setFeedbackSuccess(false), 3000);
    } catch (err: any) {
      alert("Gagal menyimpan saran/masukan: " + err.message);
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const handleConfirmDeleteFeedbackItem = async () => {
    if (itemToDeleteIndex === null) return;
    const indexToRemove = itemToDeleteIndex;
    const updatedList = feedbackList.filter((_, idx) => idx !== indexToRemove);
    const serialized = updatedList.length > 0 ? JSON.stringify(updatedList) : null;

    try {
      setIsSavingFeedback(true);
      await updateParentFeedback(student.id, latestMonth ?? null, serialized);
      setFeedbackList(updatedList);
      setFeedbackSuccess(true);
      setItemToDeleteIndex(null);
      setTimeout(() => setFeedbackSuccess(false), 3000);
    } catch (err: any) {
      alert("Gagal menghapus masukan: " + err.message);
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    const cardEl = document.getElementById(`worksheet-card-${student?.id}`);
    if (!cardEl) return;

    // Track elements to hide during PDF capture
    const actionElements = cardEl.querySelectorAll(".no-print-action");
    actionElements.forEach((el) => {
      (el as HTMLElement).style.setProperty("display", "none", "important");
    });

    // Store original element dimensions to prevent clipping on mobile screens
    const origWidth = cardEl.style.width;
    const origMinWidth = cardEl.style.minWidth;
    const origMaxWidth = cardEl.style.maxWidth;

    const scrollContainers = cardEl.querySelectorAll(".overflow-x-auto");
    const origOverflows: string[] = [];
    scrollContainers.forEach((sc, i) => {
      origOverflows[i] = (sc as HTMLElement).style.overflow;
      (sc as HTMLElement).style.setProperty("overflow", "visible", "important");
    });

    // Expand element to standard printable desktop width (850px)
    cardEl.style.setProperty("width", "850px", "important");
    cardEl.style.setProperty("min-width", "850px", "important");
    cardEl.style.setProperty("max-width", "none", "important");

    try {
      setIsDownloadingPdf(true);

      // Load html-to-image dynamically if not present
      if (!(window as any).htmlToImage) {
        const script1 = document.createElement("script");
        script1.src =
          "https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js";
        document.head.appendChild(script1);
        await new Promise((r) => (script1.onload = r));
      }

      // Load jspdf dynamically if not present
      if (!(window as any).jspdf) {
        const script2 = document.createElement("script");
        script2.src =
          "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        document.head.appendChild(script2);
        await new Promise((r) => (script2.onload = r));
      }

      // Brief delay for reflow
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
      pdf.save(`Lembar_Perkembangan_${safeFileName}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Gagal mendownload PDF. Silakan coba lagi.");
    } finally {
      // Restore card element dimensions & scroll container states
      cardEl.style.width = origWidth;
      cardEl.style.minWidth = origMinWidth;
      cardEl.style.maxWidth = origMaxWidth;

      scrollContainers.forEach((sc, i) => {
        (sc as HTMLElement).style.overflow = origOverflows[i] || "";
      });

      // Restore action elements
      actionElements.forEach((el) => {
        (el as HTMLElement).style.removeProperty("display");
      });
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div
      id={`worksheet-card-${student?.id}`}
      className="single-printable-worksheet bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-800 shadow-md overflow-hidden mb-8 transition-all relative"
    >
      <style jsx global>{`
        @media print {
          body.printing-single-card {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body.printing-single-card * {
            visibility: hidden;
          }
          body.printing-single-card .active-print-card,
          body.printing-single-card .active-print-card * {
            visibility: visible;
          }
          body.printing-single-card .active-print-card {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          body.printing-single-card .no-print-action {
            display: none !important;
          }
        }
      `}</style>

      {/* Paper Sheet Header (Logo + Info + Catatan Guru Box) */}
      <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex flex-col lg:flex-row gap-6 justify-between">
          
          {/* Left Side: Logo & Meta Info */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 shrink-0 bg-white rounded-xl p-1 shadow-xs border border-slate-100">
                <Image
                  src="/logo.png"
                  alt="ShiningSun Logo"
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight uppercase text-slate-900 dark:text-white leading-tight">
                  PERKEMBANGAN SISWA
                </h3>
                <p className="text-xs font-bold text-brand-600 dark:text-brand-400 tracking-wider">
                  SHINING SUN
                </p>
              </div>
            </div>

            {/* Meta Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium pt-1">
              <div className="flex items-start">
                <span className="w-20 shrink-0 font-bold text-slate-500 uppercase text-[11px] pt-0.5">NAMA</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">: {student?.name || "-"} {student?.nickname ? `(${student.nickname})` : ""}</span>
              </div>
              <div className="flex items-start">
                <span className="w-20 shrink-0 font-bold text-slate-500 uppercase text-[11px] pt-0.5">LEVEL</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">: {student?.label ? `${student.label.main_level} ${student.label.sub_level}` : "Tanpa Level"}</span>
              </div>
              <div className="flex items-start">
                <span className="w-20 shrink-0 font-bold text-slate-500 uppercase text-[11px] pt-0.5">JADWAL</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">: {student?.schedule || student?.branch?.name || "-"}</span>
              </div>
              <div className="flex items-start">
                <span className="w-20 shrink-0 font-bold text-slate-500 uppercase text-[11px] pt-0.5">BULAN KE</span>
                <span className="font-bold text-brand-600 dark:text-brand-400 text-sm">: {latestMonth ? `Bulan ke-${latestMonth}` : "-"}</span>
              </div>
            </div>
          </div>

          {/* Right Side: Catatan Guru & Catatan/Saran Orang Tua Box */}
          <div className="w-full lg:w-[380px] shrink-0 space-y-3">
            {/* Catatan Guru Box */}
            <div className="rounded-2xl border-2 border-sky-400 dark:border-sky-600 bg-sky-50/50 dark:bg-sky-950/20 p-3 flex flex-col justify-between">
              <div>
                <span className="block text-[11px] font-extrabold uppercase tracking-wider text-sky-800 dark:text-sky-300 mb-1 flex items-center justify-between">
                  <span>Catatan Guru:</span>
                  <span className="text-[10px] font-bold text-sky-600">✍️ Evaluasi</span>
                </span>
                {teacherNotes.length > 0 ? (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {teacherNotes.slice(0, 2).map((tn, idx) => (
                      <div key={idx} className="text-xs text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-sky-200/60 dark:border-sky-800/40">
                        <p className="leading-snug">{tn.note}</p>
                        {tn.teacher && <span className="text-[10px] font-bold text-slate-400 block mt-0.5 text-right">— {tn.teacher}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Belum ada catatan khusus dari guru.</p>
                )}
              </div>
            </div>

            {/* Catatan & Saran Orang Tua Box */}
            <div className="rounded-2xl border-2 border-emerald-400 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <span>💬 Saran & Masukan Orang Tua</span>
                </span>
                {feedbackSuccess && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                    ✓ Tersimpan!
                  </span>
                )}
              </div>

              {/* Display items list */}
              {feedbackList.length > 0 ? (
                <div className="space-y-1.5 mb-2 max-h-36 overflow-y-auto pr-1">
                  {feedbackList.map((item, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-slate-800 dark:text-slate-200 bg-white/90 dark:bg-slate-900/90 p-2 rounded-xl border border-emerald-200/80 dark:border-emerald-800/50 flex items-start justify-between gap-2"
                    >
                      <div className="flex items-start gap-1.5 flex-1 min-w-0">
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0 pt-0.5">-</span>
                        <div className="flex-1 min-w-0">
                          <span className="inline-block text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-300/60 dark:border-emerald-800/60 mr-1.5">
                            {item.date}
                          </span>
                          <span className="leading-relaxed font-medium break-words">{item.text}</span>
                        </div>
                      </div>
                      {isParentView && (
                        <button
                          type="button"
                          onClick={() => setItemToDeleteIndex(idx)}
                          disabled={isSavingFeedback}
                          className="text-slate-400 hover:text-red-500 p-0.5 rounded transition-colors no-print-action shrink-0 cursor-pointer"
                          title="Hapus masukan ini"
                        >
                          <Icons.close className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic mb-2">
                  {isParentView ? "Belum ada saran/masukan dari Anda." : "Belum ada masukan dari orang tua."}
                </p>
              )}

              {/* Parent input action */}
              {isParentView && (
                <div>
                  {isEditingFeedback ? (
                    <div className="space-y-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-900/60 no-print-action">
                      <div className="flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                        <span>Tambah Masukan Baru:</span>
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded font-mono font-bold">
                          {formatShortDate(new Date())}
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        value={newInputText}
                        onChange={(e) => setNewInputText(e.target.value)}
                        placeholder="Tuliskan saran, masukan, atau tanggapan Anda..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400"
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingFeedback(false);
                            setNewInputText("");
                          }}
                          disabled={isSavingFeedback}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleAddFeedbackItem}
                          disabled={isSavingFeedback || !newInputText.trim()}
                          className="px-3 py-1 rounded-lg text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {isSavingFeedback ? "Memproses..." : "✓ Simpan Masukan"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingFeedback(true)}
                      className="no-print-action text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 bg-emerald-100/80 dark:bg-emerald-900/40 hover:bg-emerald-200/70 border border-emerald-300/60 dark:border-emerald-800/60 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>+ Tambah Saran / Masukan</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action toolbar for Admin & Parents */}
        <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print-action">
          {!isParentView ? (
            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 px-3.5 py-2 rounded-xl text-xs shadow-xs">
              <span className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <span>🔑 PIN Ortu:</span>
                <code className="bg-amber-100 dark:bg-amber-900/70 px-2 py-0.5 rounded-md font-mono font-extrabold text-amber-950 dark:text-amber-100 tracking-wider text-xs border border-amber-200/50">
                  {student.access_pin || "123456"}
                </code>
              </span>
              <span className="text-amber-300 dark:text-amber-700">|</span>
              <button
                type="button"
                onClick={() => onSetPin && onSetPin(student)}
                className="text-[11px] font-bold text-brand-700 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300 transition-colors flex items-center gap-1 hover:underline cursor-pointer"
                title="Ubah PIN Akses Orang Tua"
              >
                <Icons.edit className="w-3 h-3" />
                <span>Kelola PIN</span>
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
              <span>📄 Laporan Perkembangan Resmi</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {!isParentView && (
              <button
                type="button"
                onClick={() => onAddRow && onAddRow(student.id, latestMonth)}
                className="w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 rounded-xl text-xs font-extrabold text-white bg-brand-600 hover:bg-brand-700 active:scale-95 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer no-print-action"
              >
                <Icons.add className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Tambah Baris Evaluasi</span>
              </button>
            )}

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="flex-1 sm:w-auto justify-center px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 disabled:opacity-50 active:scale-95 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer no-print-action"
                title="Download langsung file PDF lembar perkembangan siswa ini"
              >
                {isDownloadingPdf ? (
                  <svg className="animate-spin h-3.5 w-3.5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" x2="12" y1="15" y2="3"/>
                  </svg>
                )}
                <span className="whitespace-nowrap">{isDownloadingPdf ? "Memproses..." : "Download PDF"}</span>
              </button>

              {!isParentView && onDeleteSheet && (
                <button
                  type="button"
                  onClick={() => onDeleteSheet(student.id, latestMonth ?? null, student.name || "Siswa")}
                  className="flex-1 sm:w-auto justify-center px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200/80 dark:border-red-900/50 active:scale-95 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer no-print-action"
                  title="Hapus Seluruh Lembar Perkembangan Ini"
                >
                  <Icons.trash className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Hapus Lembar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table Document (Matching Paper Sheet) */}
      <div className="overflow-x-auto touch-pan-x">
        <table className="w-full min-w-[640px] text-left border-collapse text-xs">
          {/* Table Header: Sky Blue background with white text like paper */}
          <thead>
            <tr className="bg-[#00A3E0] dark:bg-sky-700 text-white font-extrabold text-[11px] uppercase tracking-wider text-center border-b border-sky-600">
              <th className="py-3 px-2 w-10 min-w-[36px] border-r border-sky-400/40">NO</th>
              <th className="py-3 px-2 w-28 min-w-[100px] border-r border-sky-400/40 whitespace-nowrap">HARI / TANGGAL</th>
              <th className="py-3 px-3 min-w-[130px] border-r border-sky-400/40">MATERI</th>
              <th className="py-3 px-3 min-w-[150px] border-r border-sky-400/40">KEGIATAN</th>
              <th className="py-3 px-3 min-w-[160px] border-r border-sky-400/40">HASIL BELAJAR</th>
              <th className="py-3 px-2 w-24 min-w-[90px] border-r border-sky-400/40">TTD GURU</th>
              <th className="py-3 px-2 w-24 min-w-[80px] text-center">FILE / AKSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {worksheets.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400 italic bg-amber-50/20">
                  Belum ada baris evaluasi perkembangan untuk siswa ini.
                </td>
              </tr>
            ) : (
              worksheets.map((item, index) => {
                // Alternating row background: Row 1 yellow (#FFFF00 / soft yellow), Row 2 white
                const isYellowRow = index % 2 === 0;
                const rowBg = isYellowRow
                  ? "bg-[#FFF999] dark:bg-amber-950/40 text-slate-900 dark:text-slate-100"
                  : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100";

                return (
                  <tr key={item.id} className={`${rowBg} transition-colors hover:opacity-95`}>
                    {/* NO */}
                    <td className="py-3 px-3 text-center font-bold border-r border-slate-200 dark:border-slate-800/80">
                      {index + 1}
                    </td>

                    {/* HARI / TANGGAL */}
                    <td className="py-3 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-800/80 whitespace-nowrap">
                      {formatShortDate(item.worksheet_date)}
                    </td>

                    {/* MATERI */}
                    <td className="py-3 px-4 font-semibold border-r border-slate-200 dark:border-slate-800/80 whitespace-pre-line">
                      {item.materi || item.title || "-"}
                    </td>

                    {/* KEGIATAN */}
                    <td className="py-3 px-4 font-medium border-r border-slate-200 dark:border-slate-800/80 whitespace-pre-line">
                      {item.kegiatan || "-"}
                    </td>

                    {/* HASIL BELAJAR */}
                    <td className="py-3 px-4 font-medium border-r border-slate-200 dark:border-slate-800/80 whitespace-pre-line">
                      {item.hasil_belajar || item.description || "-"}
                    </td>

                    {/* TTD GURU */}
                    <td className="py-3 px-3 text-center font-bold italic border-r border-slate-200 dark:border-slate-800/80">
                      {item.ttd_guru || "-"}
                    </td>

                    {/* FILE / AKSI */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Slot 1: GDrive File Link */}
                        <div className="w-7 h-7 flex items-center justify-center shrink-0">
                          {item.gdrive_link ? (
                            <a
                              href={getGDriveDirectLink(item.gdrive_link)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs flex items-center justify-center text-xs"
                              title="Unduh File GDrive"
                            >
                              📄
                            </a>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700 text-xs font-mono">-</span>
                          )}
                        </div>

                        {!isParentView && (
                          <div className="flex items-center gap-1 no-print-action">
                            {/* Slot 2: Edit Button */}
                            <button
                              type="button"
                              onClick={() => onEditRow && onEditRow(item)}
                              className="w-7 h-7 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                              title="Edit Baris"
                            >
                              <Icons.edit className="w-3.5 h-3.5" />
                            </button>
                            {/* Slot 3: Delete Button */}
                            <button
                              type="button"
                              onClick={() => onDeleteRow && onDeleteRow(item.id)}
                              className="w-7 h-7 rounded-lg text-slate-500 hover:text-red-600 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                              title="Hapus Baris"
                            >
                              <Icons.trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal for Parent Feedback */}
      {itemToDeleteIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 no-print-action">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3 text-2xl shadow-inner">
              🗑️
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1.5">
              Hapus Masukan?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Apakah Anda yakin ingin menghapus masukan ini? Masukan yang dihapus tidak dapat dikembalikan.
            </p>

            {feedbackList[itemToDeleteIndex] && (
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 mb-5 text-left text-xs">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">
                  {feedbackList[itemToDeleteIndex].date}
                </span>
                <p className="text-slate-700 dark:text-slate-300 font-medium leading-snug">
                  "{feedbackList[itemToDeleteIndex].text}"
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setItemToDeleteIndex(null)}
                disabled={isSavingFeedback}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFeedbackItem}
                disabled={isSavingFeedback}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSavingFeedback ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
