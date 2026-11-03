"use client";

// Dipisahkan dari PointsClientWrapper.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, SetStateAction } from "react";
import { Icons } from "@/components/ui/icons";

export interface PointsRedeemTabProps {
  handleAddPointsClick: (student?: any) => Promise<void>;
  handleOpenRedeemModal: (student: any) => void;
  redeemFilteredStudents: any[];
  redemptions: any[];
  searchQuery: string;
  setIsHistoryModalOpen: Dispatch<SetStateAction<boolean>>;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  setSelectedStudentForHistory: Dispatch<any>;
}

export function PointsRedeemTab({
  handleAddPointsClick,
  handleOpenRedeemModal,
  redeemFilteredStudents,
  redemptions,
  searchQuery,
  setIsHistoryModalOpen,
  setSearchQuery,
  setSelectedStudentForHistory,
}: PointsRedeemTabProps) {
  return (
    <div className="space-y-6">
      {/* Search Box */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 sm:p-6 shadow-sm">
        <div className="relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Icons.search
              className="h-4 w-4 text-slate-400"
              aria-hidden="true"
            />
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-colors h-11"
            placeholder="Cari nama siswa..."
            aria-label="Cari nama siswa"
          />
        </div>
      </div>

      {/* Information Card */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
          <Icons.star className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Kelola Poin Siswa
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
            Tambahkan poin tambahan (lomba, event, prestasi) dengan tombol
            <strong> Tambah Poin </strong>
            atau potong poin saat siswa menukar hadiah fisik dengan tombol
            <strong> Point Ditukar</strong>.
          </p>
        </div>
      </div>

      {/* Student Grid for Redemption / Bonus */}
      {redeemFilteredStudents.length === 0 ? (
        <div className="py-14 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
          <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
            Tidak ada siswa ditemukan dengan kata kunci &quot;{searchQuery}
            &quot;.
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">
            Coba kata kunci pencarian lain.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {redeemFilteredStudents.map((student) => {
            const hasPoints = (student.points || 0) > 0;
            const meetingPoints = student.gross_points || 0;

            const studentRedemptions = redemptions.filter(
              (r) => r.student_id === student.id,
            );
            let extraPoints = studentRedemptions
              .filter((r) => (r.points_deducted || 0) < 0)
              .reduce(
                (sum, r) => sum + Math.abs(r.points_deducted || 0),
                0,
              );
            let redeemedPoints = studentRedemptions
              .filter((r) => (r.points_deducted || 0) > 0)
              .reduce((sum, r) => sum + (r.points_deducted || 0), 0);

            if (
              studentRedemptions.length === 0 &&
              student.redeemed_points
            ) {
              if (student.redeemed_points < 0) {
                extraPoints = Math.abs(student.redeemed_points);
              } else if (student.redeemed_points > 0) {
                redeemedPoints = student.redeemed_points;
              }
            }

            return (
              <div
                key={student.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 shadow-sm flex flex-col justify-between"
                style={
                  student.label
                    ? { borderTop: `4px solid ${student.label.hex_color}` }
                    : {}
                }
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {student.name}
                      </h4>
                      {student.nickname && (
                        <span className="text-xs text-slate-400 dark:text-zinc-500">
                          ({student.nickname})
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-200 dark:border-amber-800/50 tabular-nums shrink-0">
                      {student.points || 0} Poin
                    </span>
                  </div>

                  <div className="mt-3 text-xs text-slate-500 dark:text-zinc-400 space-y-1 tabular-nums">
                    <div className="flex justify-between">
                      <span>Poin Pertemuan:</span>
                      <span className="font-semibold text-slate-700 dark:text-zinc-200">
                        {meetingPoints} Pertemuan
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Poin Extra:</span>
                      <span
                        className={`font-semibold ${extraPoints > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-zinc-400"}`}
                      >
                        {extraPoints > 0
                          ? `+${extraPoints} Poin`
                          : "0 Poin"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Poin Ditukar:</span>
                      <span
                        className={`font-semibold ${redeemedPoints > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-zinc-400"}`}
                      >
                        {redeemedPoints > 0
                          ? `-${redeemedPoints} Poin`
                          : "0 Poin"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tri-action Buttons: Add Points, History, Redeem */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {/* Tombol + Tambah Poin */}
                  <button
                    type="button"
                    onClick={() => handleAddPointsClick(student)}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 active:translate-y-[1px] text-white transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Icons.add className="w-3.5 h-3.5" />
                    <span>Tambah</span>
                  </button>

                  {/* Tombol Lihat Riwayat Siswa */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudentForHistory(student);
                      setIsHistoryModalOpen(true);
                    }}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 active:translate-y-[1px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Riwayat</span>
                  </button>

                  {/* Tombol Point Ditukar */}
                  <button
                    type="button"
                    onClick={() => handleOpenRedeemModal(student)}
                    disabled={!hasPoints}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                      hasPoints
                        ? "bg-amber-600 hover:bg-amber-700 active:translate-y-[1px] text-white"
                        : "bg-slate-100 text-slate-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed"
                    }`}
                  >
                    <span>Tukar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
