"use client";

// Dipisahkan dari ParentDashboardClient.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, RefObject, SetStateAction } from "react";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { StudentWorksheetTable } from "@/components/features/worksheets/StudentWorksheetTable";

export interface ParentWorksheetSectionProps {
  endDate: string;
  filteredWorksheets: any[];
  handleDownloadPdf: () => Promise<void>;
  isDownloadingPdf: boolean;
  printableRef: RefObject<HTMLDivElement | null>;
  setEndDate: Dispatch<SetStateAction<string>>;
  setStartDate: Dispatch<SetStateAction<string>>;
  startDate: string;
  student: any;
}

export function ParentWorksheetSection({
  endDate,
  filteredWorksheets,
  handleDownloadPdf,
  isDownloadingPdf,
  printableRef,
  setEndDate,
  setStartDate,
  startDate,
  student,
}: ParentWorksheetSectionProps) {
  return (
    <div className="space-y-4">
      {/* Header & Date Range Download Control Panel */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 shadow-sm space-y-4">
        {/* Header Title & Badge */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-zinc-800">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Laporan Perkembangan Siswa
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Filter berdasarkan tanggal dan unduh file PDF resmi.
            </p>
          </div>
          <span className="shrink-0 text-[11px] font-bold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 px-3 py-1 rounded-lg tabular-nums">
            {filteredWorksheets.length} Sesi
          </span>
        </div>

        {/* Date Filter & Action Button Grid */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
                Mulai Tanggal
              </label>
              <DatePickerInput
                showManualInput={false}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
                Sampai Tanggal
              </label>
              <DatePickerInput
                showManualInput={false}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 underline cursor-pointer"
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
            className="w-full py-2.5 sm:py-3 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 active:translate-y-px transition-colors flex items-center justify-center gap-2 cursor-pointer"
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

      {/* Printable Container for PDF Export */}
      <div ref={printableRef} className="space-y-6">
        {filteredWorksheets.length === 0 ? (
          <div className="py-12 px-4 text-center bg-white dark:bg-zinc-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-zinc-700">
            <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
              Tidak ada data laporan perkembangan untuk rentang tanggal
              yang dipilih.
            </p>
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
                if (aNum !== bNum) return bNum - aNum;
                const dateA = a[1][0]?.worksheet_date || "";
                const dateB = b[1][0]?.worksheet_date || "";
                return dateB.localeCompare(dateA);
              },
            );
            // Hemat payload: foto profil SUDAH tampil di header kartu identitas
            // (baris ~666). Kalau diteruskan ke setiap tabel per bulan, string
            // base64-nya ikut ter-serialize ulang pada setiap grup — sampai
            // 10x untuk siswa yang punya banyak bulan laporan, sehingga HTML portal
            // membengkak jadi >1 MB dan berisiko timeout di browser dalam HP.
            // Nullable: tabel laporan memakai fallback logo seperti siswa tanpa foto.
            // Tampilan & data tidak berubah; hanya payload yang tidak diduplikasi.
            return sortedGroups.map(([bk, wsGroup]) => (
              <StudentWorksheetTable
                key={`parent_${student.id}_${bk}`}
                student={{ ...student, photo_url: null }}
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
  );
}
