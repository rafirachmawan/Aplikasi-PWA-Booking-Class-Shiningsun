"use client";

import Image from "next/image";
import { Icons } from "@/components/ui/icons";
import { formatShortDate } from "@/lib/dateUtils";
import { getGDriveDirectLink, getGDrivePreviewLink } from "@/lib/gdriveUtils";

interface StudentWorksheetTableProps {
  student: any;
  worksheets: any[];
  isParentView?: boolean;
  onAddRow?: (studentId: string) => void;
  onEditRow?: (worksheet: any) => void;
  onDeleteRow?: (worksheetId: string) => void;
  onSetPin?: (student: any) => void;
}

export function StudentWorksheetTable({
  student,
  worksheets,
  isParentView = false,
  onAddRow,
  onEditRow,
  onDeleteRow,
  onSetPin,
}: StudentWorksheetTableProps) {
  // Find latest bulan_ke or teacher note if available
  const latestMonth = worksheets.find((w) => w.bulan_ke)?.bulan_ke;
  const teacherNotes = worksheets
    .filter((w) => w.catatan_guru && w.catatan_guru.trim() !== "")
    .map((w) => ({
      date: w.worksheet_date,
      note: w.catatan_guru,
      teacher: w.ttd_guru,
    }));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-800 shadow-md overflow-hidden mb-8 transition-all">
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

          {/* Right Side: Catatan Guru Box (Matching Paper Sheet) */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="h-full min-h-[90px] rounded-2xl border-2 border-sky-400 dark:border-sky-600 bg-sky-50/50 dark:bg-sky-950/20 p-3.5 flex flex-col justify-between">
              <div>
                <span className="block text-[11px] font-extrabold uppercase tracking-wider text-sky-800 dark:text-sky-300 mb-1.5 flex items-center justify-between">
                  <span>Catatan Guru:</span>
                  <span className="text-[10px] font-bold text-sky-600">✍️ Evaluasi</span>
                </span>
                {teacherNotes.length > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {teacherNotes.slice(0, 2).map((tn, idx) => (
                      <div key={idx} className="text-xs text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-sky-200/60 dark:border-sky-800/40">
                        <p className="leading-snug">{tn.note}</p>
                        {tn.teacher && <span className="text-[10px] font-bold text-slate-400 block mt-1 text-right">— {tn.teacher}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Belum ada catatan khusus dari guru.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action toolbar for Admin/Staff */}
        {!isParentView && (
          <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSetPin && onSetPin(student)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:text-brand-300 transition-colors flex items-center gap-1.5"
              >
                <span>🔑 Set PIN Ortu ({student.access_pin || "123456"})</span>
              </button>
            </div>
            
            <button
              type="button"
              onClick={() => onAddRow && onAddRow(student.id)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Icons.add className="w-4 h-4" />
              <span>+ Tambah Baris Evaluasi</span>
            </button>
          </div>
        )}
      </div>

      {/* Table Document (Matching Paper Sheet) */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          {/* Table Header: Sky Blue background with white text like paper */}
          <thead>
            <tr className="bg-[#00A3E0] dark:bg-sky-700 text-white font-extrabold text-[11px] uppercase tracking-wider text-center border-b border-sky-600">
              <th className="py-3 px-3 w-12 border-r border-sky-400/40">NO</th>
              <th className="py-3 px-3 w-28 border-r border-sky-400/40">HARI / TANGGAL</th>
              <th className="py-3 px-4 border-r border-sky-400/40">MATERI</th>
              <th className="py-3 px-4 border-r border-sky-400/40">KEGIATAN</th>
              <th className="py-3 px-4 border-r border-sky-400/40">HASIL BELAJAR</th>
              <th className="py-3 px-3 w-24 border-r border-sky-400/40">TTD GURU</th>
              <th className="py-3 px-3 w-28 text-center">FILE / AKSI</th>
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
                    <td className="py-3 px-4 font-semibold border-r border-slate-200 dark:border-slate-800/80">
                      {item.materi || item.title || "-"}
                    </td>

                    {/* KEGIATAN */}
                    <td className="py-3 px-4 font-medium border-r border-slate-200 dark:border-slate-800/80">
                      {item.kegiatan || "-"}
                    </td>

                    {/* HASIL BELAJAR */}
                    <td className="py-3 px-4 font-medium border-r border-slate-200 dark:border-slate-800/80">
                      {item.hasil_belajar || item.description || "-"}
                    </td>

                    {/* TTD GURU */}
                    <td className="py-3 px-3 text-center font-bold italic border-r border-slate-200 dark:border-slate-800/80">
                      {item.ttd_guru || "-"}
                    </td>

                    {/* FILE / AKSI */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {item.gdrive_link ? (
                          <a
                            href={getGDriveDirectLink(item.gdrive_link)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
                            title="Unduh File GDrive"
                          >
                            📄
                          </a>
                        ) : null}

                        {!isParentView && (
                          <>
                            <button
                              type="button"
                              onClick={() => onEditRow && onEditRow(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
                              title="Edit Baris"
                            >
                              <Icons.edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteRow && onDeleteRow(item.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
                              title="Hapus Baris"
                            >
                              <Icons.trash className="w-3.5 h-3.5" />
                            </button>
                          </>
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
    </div>
  );
}
