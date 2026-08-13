"use client";

import { useState } from "react";
import Image from "next/image";
import { Icons } from "@/components/ui/icons";
import { formatShortDate, calculateStudentPoints } from "@/lib/dateUtils";
import { getGDriveDirectLink } from "@/lib/gdriveUtils";
import { updateSingleWorksheetParentFeedback } from "@/lib/actions";

interface StudentWorksheetTableProps {
  student: any;
  worksheets: any[];
  bulanKe?: number | null;
  isParentView?: boolean;
  hideDownloadBtn?: boolean;
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

function calculateAge(dobStr?: string | null): string {
  if (!dobStr) return "-";
  const birthDate = new Date(dobStr);
  if (isNaN(birthDate.getTime())) return "-";
  const today = new Date();

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();

  if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
    years--;
    months += 12;
  }
  if (today.getDate() < birthDate.getDate()) {
    months--;
    if (months < 0) months += 12;
  }

  if (years < 0) return "-";
  if (years === 0 && months === 0) return "Baru lahir";
  if (years === 0) return `${months} Bulan`;
  if (months === 0) return `${years} Tahun`;
  return `${years} Thn ${months} Bln`;
}

function formatDateIndonesian(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch (e) {
    return dateStr;
  }
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

{/* Component untuk setiap sesi harian (Per Hari) */}
function DailyWorksheetSessionItem({
  item,
  isParentView,
  onEditRow,
  onDeleteRow,
}: {
  item: any;
  isParentView: boolean;
  onEditRow?: (item: any) => void;
  onDeleteRow?: (id: string) => void;
}) {
  const [feedbackList, setFeedbackList] = useState<ParentFeedbackItem[]>(() =>
    parseParentFeedback(item.catatan_ortu, formatShortDate(item.worksheet_date))
  );
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
      await updateSingleWorksheetParentFeedback(item.id, serialized);
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
    const updatedList = feedbackList.filter((_, idx) => idx !== itemToDeleteIndex);
    const serialized = updatedList.length > 0 ? JSON.stringify(updatedList) : null;

    try {
      setIsSavingFeedback(true);
      await updateSingleWorksheetParentFeedback(item.id, serialized);
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

  // Status Detection for visual themes (Sakit -> Red, Ijin -> Amber, Libur -> Purple)
  const statusStr = `${item.materi || ""} ${item.title || ""} ${item.kegiatan || ""} ${item.hasil_belajar || ""} ${item.description || ""} ${item.catatan_guru || ""}`.toLowerCase();
  const isSakit = statusStr.includes("sakit");
  const isIjin = !isSakit && (statusStr.includes("ijin") || statusStr.includes("izin"));
  const isLibur = !isSakit && !isIjin && statusStr.includes("libur");

  // Dynamic style classes based on status
  const containerClass = isSakit
    ? "bg-red-50/40 dark:bg-red-950/20 rounded-2xl border-2 border-red-500/80 dark:border-red-600 overflow-hidden shadow-sm space-y-0"
    : isIjin
    ? "bg-amber-50/40 dark:bg-amber-950/20 rounded-2xl border-2 border-amber-400 dark:border-amber-700 overflow-hidden shadow-sm space-y-0"
    : isLibur
    ? "bg-purple-50/40 dark:bg-purple-950/20 rounded-2xl border-2 border-purple-400 dark:border-purple-700 overflow-hidden shadow-sm space-y-0"
    : "bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm space-y-0";

  const headerBarClass = isSakit
    ? "bg-red-100 dark:bg-red-950/90 px-4 py-3 border-b border-red-200 dark:border-red-900/60"
    : isIjin
    ? "bg-amber-100 dark:bg-amber-950/90 px-4 py-3 border-b border-amber-200 dark:border-amber-900/60"
    : isLibur
    ? "bg-purple-100 dark:bg-purple-950/90 px-4 py-3 border-b border-purple-200 dark:border-purple-900/60"
    : "bg-slate-100/90 dark:bg-slate-800/90 px-4 py-3 border-b border-slate-200 dark:border-slate-800";

  const tableHeaderClass = isSakit
    ? "bg-red-600 dark:bg-red-700 text-white font-extrabold uppercase tracking-wider text-center border-b border-red-500"
    : isIjin
    ? "bg-amber-500 dark:bg-amber-600 text-white font-extrabold uppercase tracking-wider text-center border-b border-amber-500"
    : isLibur
    ? "bg-purple-600 dark:bg-purple-700 text-white font-extrabold uppercase tracking-wider text-center border-b border-purple-500"
    : "bg-[#00A3E0] dark:bg-sky-700 text-white font-extrabold uppercase tracking-wider text-center border-b border-sky-600";

  const tableBodyClass = isSakit
    ? "bg-red-50/60 dark:bg-red-950/40 text-slate-900 dark:text-slate-100"
    : isIjin
    ? "bg-amber-50/60 dark:bg-amber-950/40 text-slate-900 dark:text-slate-100"
    : isLibur
    ? "bg-purple-50/60 dark:bg-purple-950/40 text-slate-900 dark:text-slate-100"
    : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100";

  const bulletColorClass = isSakit
    ? "text-red-600 dark:text-red-400 font-bold shrink-0 mt-0.5"
    : isIjin
    ? "text-amber-600 dark:text-amber-400 font-bold shrink-0 mt-0.5"
    : isLibur
    ? "text-purple-600 dark:text-purple-400 font-bold shrink-0 mt-0.5"
    : "text-sky-500 font-bold shrink-0 mt-0.5";

  return (
    <div className={containerClass}>
      {/* 1. Metadata Header Bar per Session */}
      <div className={headerBarClass}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 text-xs sm:text-sm font-medium flex-1">
            <div className="grid grid-cols-[100px_auto_1fr] gap-x-1.5 items-baseline">
              <span className={`font-bold uppercase text-[10px] sm:text-[11px] tracking-wider ${isSakit ? "text-red-800 dark:text-red-300" : isIjin ? "text-amber-800 dark:text-amber-300" : isLibur ? "text-purple-800 dark:text-purple-300" : "text-slate-600 dark:text-slate-400"}`}>
                Hari/tgl
              </span>
              <span className="font-extrabold text-slate-700 dark:text-slate-300">:</span>
              <span className={`font-extrabold ${isSakit ? "text-red-950 dark:text-red-100" : "text-slate-900 dark:text-white"}`}>
                {formatShortDate(item.worksheet_date)}
              </span>
            </div>

            <div className="grid grid-cols-[100px_auto_1fr] gap-x-1.5 items-baseline">
              <span className={`font-bold uppercase text-[10px] sm:text-[11px] tracking-wider ${isSakit ? "text-red-800 dark:text-red-300" : isIjin ? "text-amber-800 dark:text-amber-300" : isLibur ? "text-purple-800 dark:text-purple-300" : "text-slate-600 dark:text-slate-400"}`}>
                Materi
              </span>
              <span className="font-extrabold text-slate-700 dark:text-slate-300">:</span>
              <span className={`font-bold ${isSakit ? "text-red-700 dark:text-red-300" : isIjin ? "text-amber-700 dark:text-amber-300" : isLibur ? "text-purple-700 dark:text-purple-300" : "text-brand-600 dark:text-brand-400"}`}>
                {item.materi || item.title || "-"}
              </span>
            </div>

            <div className="grid grid-cols-[100px_auto_1fr] gap-x-1.5 items-baseline">
              <span className={`font-bold uppercase text-[10px] sm:text-[11px] tracking-wider ${isSakit ? "text-red-800 dark:text-red-300" : isIjin ? "text-amber-800 dark:text-amber-300" : isLibur ? "text-purple-800 dark:text-purple-300" : "text-slate-600 dark:text-slate-400"}`}>
                Pembimbing
              </span>
              <span className="font-extrabold text-slate-700 dark:text-slate-300">:</span>
              <span className="font-extrabold italic text-slate-900 dark:text-white">
                {item.ttd_guru || "-"}
              </span>
            </div>
          </div>

          {/* Prominent Status Badge */}
          {isSakit && (
            <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-black tracking-wider shadow-sm shrink-0 flex items-center gap-1.5 animate-in fade-in">
              🤒 SAKIT
            </span>
          )}
          {isIjin && (
            <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-black tracking-wider shadow-sm shrink-0 flex items-center gap-1.5 animate-in fade-in">
              📩 IJIN
            </span>
          )}
          {isLibur && (
            <span className="px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-black tracking-wider shadow-sm shrink-0 flex items-center gap-1.5 animate-in fade-in">
              🎉 LIBUR
            </span>
          )}
        </div>
      </div>


      {/* 2. 2-Column Table (Kegiatan | Hasil belajar) */}
      <div className="overflow-x-auto touch-pan-x">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className={tableHeaderClass}>
              <th className="py-2.5 px-4 min-w-[140px] border-r border-white/20 text-left">
                Kegiatan
              </th>
              <th className="py-2.5 px-4 min-w-[140px] text-left">
                Hasil belajar
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className={tableBodyClass}>
              {/* Kegiatan */}
              <td className="py-3.5 px-4 font-medium border-r border-slate-200/80 dark:border-slate-800/80 align-top">
                {(item.kegiatan || "-").split("\n").filter(Boolean).map((line: string, i: number) => (
                  <div key={i} className="flex items-start gap-1.5 leading-relaxed">
                    <span className={bulletColorClass}>-</span>
                    <span>{line.replace(/^[-•]\s*/, "")}</span>
                  </div>
                ))}
              </td>

              {/* Hasil Belajar */}
              <td className="py-3.5 px-4 font-medium align-top">
                {((item.hasil_belajar || item.description || "-")).split("\n").filter(Boolean).map((line: string, i: number) => (
                  <div key={i} className="flex items-start gap-1.5 leading-relaxed">
                    <span className={bulletColorClass}>-</span>
                    <span>{line.replace(/^[-•]\s*/, "")}</span>
                  </div>
                ))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Action Bar (File + Edit/Delete) */}
      {(!isParentView || item.gdrive_link) && (
        <div className={`flex items-center justify-between px-4 py-2 border-t ${
          isSakit
            ? "bg-red-100/60 dark:bg-red-950/50 border-red-200 dark:border-red-900/60"
            : isIjin
            ? "bg-amber-100/60 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900/60"
            : isLibur
            ? "bg-purple-100/60 dark:bg-purple-950/50 border-purple-200 dark:border-purple-900/60"
            : "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
        }`}>
          <div className="flex items-center gap-2">
            {item.gdrive_link && (
              <a
                href={getGDriveDirectLink(item.gdrive_link)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-all shadow-xs cursor-pointer"
                title="Unduh / Lihat File GDrive"
              >
                📄 Lihat File
              </a>
            )}
          </div>

          {!isParentView && (
            <div className="flex items-center gap-1 no-print-action">
              <button
                type="button"
                onClick={() => onEditRow && onEditRow(item)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors cursor-pointer"
                title="Edit Baris Evaluasi Ini"
              >
                <Icons.edit className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                type="button"
                onClick={() => onDeleteRow && onDeleteRow(item.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                title="Hapus Baris Evaluasi Ini"
              >
                <Icons.trash className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hapus</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Rekomendasi di Rumah Opsional jika ada */}
      {item.rekomendasi_rumah && (
        <div className={`p-3 border-t text-xs ${
          isSakit
            ? "bg-red-100/70 dark:bg-red-950/60 border-red-200 dark:border-red-900/70"
            : "bg-amber-50/70 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40"
        }`}>
          <span className={`font-extrabold mr-2 ${isSakit ? "text-red-900 dark:text-red-300" : "text-amber-800 dark:text-amber-300"}`}>
            🏡 Rekomendasi di Rumah:
          </span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {item.rekomendasi_rumah}
          </span>
        </div>
      )}

      {/* Catatan Guru Opsional jika ada */}
      {item.catatan_guru && (
        <div className={`p-3 border-t text-xs ${
          isSakit
            ? "bg-red-100/70 dark:bg-red-950/60 border-red-200 dark:border-red-900/70"
            : "bg-sky-50/70 dark:bg-sky-950/30 border-sky-100 dark:border-sky-900/40"
        }`}>
          <span className={`font-extrabold mr-2 ${isSakit ? "text-red-900 dark:text-red-300" : "text-sky-800 dark:text-sky-300"}`}>
            ✍️ Catatan Guru:
          </span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {item.catatan_guru}
          </span>
        </div>
      )}

      {/* 3. SARAN ORANG TUA PER HARI (MATCHING SKETCH "Saran :" PER SESI) */}
      <div className={`p-3.5 sm:p-4 border-t-2 ${
        isSakit
          ? "bg-red-50/80 dark:bg-red-950/40 border-red-300 dark:border-red-800/80"
          : "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80"
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
            isSakit ? "text-red-900 dark:text-red-300" : "text-emerald-800 dark:text-emerald-300"
          }`}>
            <span>💬 SARAN :</span>
            <span className={`text-[11px] font-normal lowercase ${
              isSakit ? "text-red-700 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
            }`}>
              (masukan / tanggapan orang tua)
            </span>
          </span>
          {feedbackSuccess && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
              ✓ Tersimpan!
            </span>
          )}
        </div>

        {/* List masukan/saran per hari */}
        {feedbackList.length > 0 ? (
          <div className="space-y-1.5 mb-2 max-h-36 overflow-y-auto pr-1">
            {feedbackList.map((fb, idx) => (
              <div
                key={idx}
                className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 bg-white/95 dark:bg-slate-900/95 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/50 flex items-start justify-between gap-2 shadow-2xs"
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0 pt-0.5">•</span>
                  <div className="flex-1 min-w-0">
                    <span className="inline-block text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-300/60 dark:border-emerald-800/60 mr-2">
                      {fb.date}
                    </span>
                    <span className="leading-relaxed font-medium break-words">{fb.text}</span>
                  </div>
                </div>
                {isParentView && (
                  <button
                    type="button"
                    onClick={() => setItemToDeleteIndex(idx)}
                    disabled={isSavingFeedback}
                    className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors no-print-action shrink-0 cursor-pointer"
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
            {isParentView ? "Belum ada saran/masukan untuk hari ini." : "Belum ada saran dari orang tua untuk hari ini."}
          </p>
        )}

        {/* Parent input action for this day */}
        {isParentView && (
          <div>
            {isEditingFeedback ? (
              <div className="space-y-2 pt-2 border-t border-emerald-200/70 dark:border-emerald-900/70 no-print-action">
                <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-bold">
                  <span>Tulis Saran / Masukan Hari Ini ({formatShortDate(item.worksheet_date)}):</span>
                </div>
                <textarea
                  rows={2}
                  value={newInputText}
                  onChange={(e) => setNewInputText(e.target.value)}
                  placeholder="Tuliskan saran atau masukan Anda untuk hari ini..."
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingFeedback(false);
                      setNewInputText("");
                    }}
                    disabled={isSavingFeedback}
                    className="px-3 py-1 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleAddFeedbackItem}
                    disabled={isSavingFeedback || !newInputText.trim()}
                    className="px-3.5 py-1 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingFeedback ? "Memproses..." : "✓ Simpan Saran"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingFeedback(true)}
                className="no-print-action text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 bg-white/90 dark:bg-slate-900/90 hover:bg-emerald-100/80 border border-emerald-300 dark:border-emerald-800/60 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>+ Tambah Saran / Masukan</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal for Parent Feedback */}
      {itemToDeleteIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 no-print-action">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3 text-2xl shadow-inner">
              🗑️
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1.5">
              Hapus Saran?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Apakah Anda yakin ingin menghapus saran ini?
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

export function StudentWorksheetTable({
  student,
  worksheets,
  bulanKe,
  isParentView = false,
  hideDownloadBtn = false,
  onAddRow,
  onEditRow,
  onDeleteRow,
  onDeleteSheet,
  onSetPin,
}: StudentWorksheetTableProps) {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const currentBulanKe =
    bulanKe !== undefined && bulanKe !== null
      ? bulanKe
      : worksheets.find((w) => w.bulan_ke != null)?.bulan_ke ?? null;

  const latestMonth = currentBulanKe ?? [...worksheets].reverse().find((w) => w.bulan_ke != null)?.bulan_ke;
  const firstLetter = student?.name ? student.name.charAt(0).toUpperCase() : "S";

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    const cardEl = document.getElementById(`worksheet-card-${student?.id}`);
    if (!cardEl) return;

    const actionElements = cardEl.querySelectorAll(".no-print-action");
    actionElements.forEach((el) => {
      (el as HTMLElement).style.setProperty("display", "none", "important");
    });

    const origWidth = cardEl.style.width;
    const origMinWidth = cardEl.style.minWidth;
    const origMaxWidth = cardEl.style.maxWidth;

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
      pdf.save(`Laporan_Perkembangan_${safeFileName}.pdf`);
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

  return (
    <div
      id={`worksheet-card-${student?.id}`}
      className="single-printable-worksheet bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-800 shadow-md overflow-hidden mb-8 transition-all relative font-sans"
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

      {/* ============================================================ */}
      {/* 1. HEADER SECTION (MATCHING SKETCH IDENTITAS SISWA)          */}
      {/* ============================================================ */}
      <div className="p-5 sm:p-7 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        
        {/* Top Header Row: PP (Photo Box) + Student Main Info */}
        <div className="flex items-start gap-4 sm:gap-6">
          {/* Photo / Logo Box */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 sm:p-1.5 shadow-md shrink-0 relative overflow-hidden">
            {student?.photo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={student.photo_url}
                alt={student?.name || "Foto Siswa"}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <Image
                src="/logo.png"
                alt="ShiningSun Logo"
                width={80}
                height={80}
                className="w-full h-full object-contain p-1"
                priority
              />
            )}
          </div>

          {/* Lines Next to PP */}
          <div className="flex-1 space-y-1.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium">
            <div className="grid grid-cols-[105px_12px_1fr] items-baseline">
              <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] sm:text-xs tracking-wider">
                Nama lengkap
              </span>
              <span className="font-extrabold text-slate-700 dark:text-slate-300">:</span>
              <span className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base leading-snug">
                {student?.name || "-"}
              </span>
            </div>

            <div className="grid grid-cols-[105px_12px_1fr] items-baseline">
              <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] sm:text-xs tracking-wider">
                Nama panggilan
              </span>
              <span className="font-extrabold text-slate-700 dark:text-slate-300">:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {student?.nickname || "-"}
              </span>
            </div>

            <div className="grid grid-cols-[105px_12px_1fr] items-baseline">
              <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] sm:text-xs tracking-wider">
                Tgl lahir
              </span>
              <span className="font-extrabold text-slate-700 dark:text-slate-300">:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {formatDateIndonesian(student?.date_of_birth)}
              </span>
            </div>

            <div className="grid grid-cols-[105px_12px_1fr] items-baseline">
              <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] sm:text-xs tracking-wider">
                Usia
              </span>
              <span className="font-extrabold text-slate-700 dark:text-slate-300">:</span>
              <span className="font-bold text-brand-600 dark:text-brand-400">
                {calculateAge(student?.date_of_birth)}
              </span>
            </div>
          </div>
        </div>



        {/* Divider Line (Divider Sesuai Sketsa Gambar) */}
        <hr className="my-4 sm:my-5 border-slate-200 dark:border-slate-800" />

        {/* Bottom Info Grid Below Divider Line (Uniform Neutral Styling - Full Text Visibility) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 text-xs text-slate-800 dark:text-slate-200 font-medium">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
            <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Unit</span>
            <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-xs leading-snug break-words mt-1">
              {student?.branch?.name ? `ShiningSun ${student.branch.name}` : "ShiningSun"}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
            <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jadwal</span>
            <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-xs leading-snug break-words mt-1">
              {student?.schedule || "-"}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
            <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Level</span>
            <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-xs leading-snug break-words mt-1">
              {student?.label ? `${student.label.main_level} ${student.label.sub_level}` : "Tanpa Level"}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
            <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bulan Ke</span>
            <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-xs leading-snug break-words mt-1">
              {currentBulanKe != null ? `Bulan ke-${currentBulanKe}` : "Bulan ke-1"}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
            <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Poin Kehadiran</span>
            <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-xs leading-snug break-words mt-1">
              {student?.points !== undefined
                ? student.points
                : Math.max(0, calculateStudentPoints(worksheets) - (student?.redeemed_points || 0))} Poin
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
            <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</span>
            <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-xs leading-snug break-words mt-1">
              {student?.status === 'REGISTERED' ? 'Siswa Reguler' : student?.status === 'CG' ? 'Coba Gratis' : 'Nonaktif'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Toolbar for Admin & Parents */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print-action">
        {!isParentView ? (
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-3 py-1.5 rounded-xl text-xs">
            <span className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <span>🔑 PIN Ortu:</span>
              <code className="bg-amber-100 dark:bg-amber-900/70 px-2 py-0.5 rounded-md font-mono font-extrabold text-amber-950 dark:text-amber-100 tracking-wider text-xs border border-amber-200/50">
                {student.access_pin || "123456"}
              </code>
            </span>
            <button
              type="button"
              onClick={() => onSetPin && onSetPin(student)}
              className="text-[11px] font-bold text-brand-700 hover:text-brand-800 dark:text-brand-400 hover:underline cursor-pointer ml-1"
              title="Ubah PIN Akses Orang Tua"
            >
              <Icons.edit className="w-3 h-3 inline mr-0.5" />
              Kelola PIN
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
            <span>📄 Laporan Perkembangan Resmi Siswa</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {!isParentView && (
            <button
              type="button"
              onClick={() => onAddRow && onAddRow(student.id, latestMonth)}
              className="w-full sm:w-auto justify-center px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-brand-600 hover:bg-brand-700 active:scale-95 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer no-print-action"
            >
              <Icons.add className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Tambah Sesi / Evaluasi</span>
            </button>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!hideDownloadBtn && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="flex-1 sm:w-auto justify-center px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 disabled:opacity-50 active:scale-95 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer no-print-action"
                title="Download langsung file PDF laporan perkembangan siswa ini"
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
            )}

            {!isParentView && onDeleteSheet && (
              <button
                type="button"
                onClick={() => onDeleteSheet(student.id, latestMonth ?? null, student.name || "Siswa")}
                className="flex-1 sm:w-auto justify-center px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900/50 active:scale-95 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer no-print-action"
                title="Hapus Laporan Perkembangan Ini"
              >
                <Icons.trash className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Hapus Laporan</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. WORKSHEET ENTRIES / SESSIONS (PER HARI DENGAN BOX SARAN)  */}
      {/* ============================================================ */}
      <div className="p-4 sm:p-6 space-y-6">
        {worksheets.length === 0 ? (
          <div className="py-12 text-center text-slate-400 italic bg-amber-50/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            Belum ada baris evaluasi perkembangan untuk siswa ini.
          </div>
        ) : (
          worksheets.map((item) => (
            <DailyWorksheetSessionItem
              key={item.id}
              item={item}
              isParentView={isParentView}
              onEditRow={onEditRow}
              onDeleteRow={onDeleteRow}
            />
          ))
        )}
      </div>
    </div>
  );
}
