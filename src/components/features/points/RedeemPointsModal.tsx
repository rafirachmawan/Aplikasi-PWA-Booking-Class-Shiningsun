"use client";

// Dipisahkan dari PointsClientWrapper.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Icons } from "@/components/ui/icons";

export interface RedeemPointsModalProps {
  deductPoints: number | "";
  errorMsg: string;
  handleConfirmRedeem: (e: FormEvent) => Promise<void>;
  isSubmitting: boolean;
  rewardNote: string;
  selectedStudentForRedeem: any;
  setDeductPoints: Dispatch<SetStateAction<number | "">>;
  setRewardNote: Dispatch<SetStateAction<string>>;
  setSelectedStudentForRedeem: Dispatch<any>;
  successMsg: string;
}

export function RedeemPointsModal({
  deductPoints,
  errorMsg,
  handleConfirmRedeem,
  isSubmitting,
  rewardNote,
  selectedStudentForRedeem,
  setDeductPoints,
  setRewardNote,
  setSelectedStudentForRedeem,
  successMsg,
}: RedeemPointsModalProps) {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => !isSubmitting && setSelectedStudentForRedeem(null)}
      />

      <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 text-left">
        <div className="flex items-center justify-between mb-4 border-b pb-3 border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
              <Icons.gift className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ACC / Point Ditukar
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Konfirmasi penukaran poin siswa untuk hadiah
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              !isSubmitting && setSelectedStudentForRedeem(null)
            }
            aria-label="Tutup"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
          >
            <Icons.close className="w-5 h-5" />
          </button>
        </div>

        {/* Student Info Box */}
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-3.5 mb-4 text-xs">
          <div className="font-bold text-amber-900 dark:text-amber-200 text-sm truncate">
            {selectedStudentForRedeem.name}
          </div>
          <div className="flex justify-between mt-1 text-amber-800 dark:text-amber-300">
            <span>Poin Tersedia Saat Ini:</span>
            <span className="font-bold tabular-nums">
              {selectedStudentForRedeem.points || 0} Poin
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-800/50">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-200 dark:border-emerald-800/50">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleConfirmRedeem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
              Jumlah Point Ditukar <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              max={selectedStudentForRedeem.points || 0}
              required
              value={deductPoints}
              onChange={(e) =>
                setDeductPoints(
                  e.target.value ? Number(e.target.value) : "",
                )
              }
              placeholder="Contoh: 5"
              className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
              Keterangan Hadiah / Barang{" "}
              <span className="text-slate-400 font-normal">(Opsional)</span>
            </label>
            <input
              type="text"
              value={rewardNote}
              onChange={(e) => setRewardNote(e.target.value)}
              placeholder="Contoh: Pensil Warna 12 Warna / Mainan Puzzle"
              className="w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setSelectedStudentForRedeem(null)}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:translate-y-[1px] transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Memproses..." : "Konfirmasi Point Ditukar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
