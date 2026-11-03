"use client";

// Dipisahkan dari WorksheetFormModal.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import { formatShortDate } from "@/lib/dateUtils";
import { formatPlainLine, formatAnandaLine } from "../worksheetFormUtils";

type AttendanceStatus =
    | "HADIR"
    | "IJIN"
    | "SAKIT"
    | "LIBUR"
    | "LIBUR_HARI_BESAR";

export interface WorksheetLivePreviewSectionProps {
  activeStudentName: any;
  attendanceStatus: AttendanceStatus;
  catatanGuru: any;
  gdriveLink: any;
  hasilBelajarItems: string[];
  isAbsent: boolean;
  kegiatanItems: string[];
  materi: any;
  rekomendasiRumah: any;
  title: any;
  ttdGuru: any;
  worksheetDate: any;
}

export function WorksheetLivePreviewSection({
  activeStudentName,
  attendanceStatus,
  catatanGuru,
  gdriveLink,
  hasilBelajarItems,
  isAbsent,
  kegiatanItems,
  materi,
  rekomendasiRumah,
  title,
  ttdGuru,
  worksheetDate,
}: WorksheetLivePreviewSectionProps) {
  return (
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
                            <span>
                              {isAbsent
                                ? formatPlainLine(line)
                                : formatAnandaLine(line)}
                            </span>
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
                            <span>
                              {isAbsent
                                ? formatPlainLine(line)
                                : formatAnandaLine(line)}
                            </span>
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
  );
}
