"use client";

// Dipisahkan dari ParentDashboardClient.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, SetStateAction } from "react";
import { Icons } from "@/components/ui/icons";
import { formatShortDate } from "@/lib/dateUtils";

export interface ParentPointsHistoryModalProps {
  grossPoints: any;
  netPoints: any;
  redeemedPoints: any;
  redemptions: any[];
  setShowPointsModal: Dispatch<SetStateAction<boolean>>;
  worksheets: any[];
}

export function ParentPointsHistoryModal({
  grossPoints,
  netPoints,
  redeemedPoints,
  redemptions,
  setShowPointsModal,
  worksheets,
}: ParentPointsHistoryModalProps) {
  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => setShowPointsModal(false)}
      />
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Icons.star className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Riwayat Poin
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Rincian kehadiran dan penukaran hadiah
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPointsModal(false)}
            aria-label="Tutup"
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <Icons.close className="w-4 h-4" />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Points Summary */}
          <div className="bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3">
                <div className="text-xl sm:text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-300">
                  +{grossPoints}
                </div>
                <div className="text-[10px] sm:text-xs text-amber-800 dark:text-amber-400 font-semibold mt-0.5">
                  Total Hadir
                </div>
              </div>
              <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-800/50 rounded-xl p-3">
                <div className="text-xl sm:text-2xl font-bold tabular-nums text-rose-700 dark:text-rose-300">
                  -{Math.max(0, redeemedPoints)}
                </div>
                <div className="text-[10px] sm:text-xs text-rose-800 dark:text-rose-400 font-semibold mt-0.5">
                  Sudah Ditukar
                </div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3">
                <div className="text-xl sm:text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {netPoints}
                </div>
                <div className="text-[10px] sm:text-xs text-emerald-800 dark:text-emerald-400 font-semibold mt-0.5">
                  Sisa Poin Aktif
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 1: Kehadiran ── */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 dark:border-zinc-800 bg-amber-50 dark:bg-amber-500/10 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Poin Kehadiran
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                  +1 poin setiap hadir kelas
                </p>
              </div>
              <span className="text-xs font-bold tabular-nums text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/15 px-2.5 py-1 rounded-lg shrink-0">
                +{grossPoints} Poin
              </span>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-zinc-800 max-h-48 overflow-y-auto">
              {worksheets.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 dark:text-zinc-500 italic">
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
                            <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 truncate block">
                              {w.materi || w.title || "Kelas"}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                              {w.worksheet_date
                                ? formatShortDate(w.worksheet_date)
                                : w.created_at
                                  ? formatShortDate(w.created_at)
                                  : "-"}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400 shrink-0">
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
                            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 truncate block">
                              {w.materi || w.title || "Tidak Hadir"}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                              {w.worksheet_date
                                ? formatShortDate(w.worksheet_date)
                                : w.created_at
                                  ? formatShortDate(w.created_at)
                                  : "-"}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 shrink-0 tabular-nums">
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
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-3.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Manual Poin
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                      Bonus poin dari Admin
                    </p>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 px-2.5 py-1 rounded-lg shrink-0">
                    +{totalBonus} Poin
                  </span>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-zinc-800 max-h-48 overflow-y-auto">
                  {bonusItems.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 dark:text-zinc-500 italic">
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
                            <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 truncate block">
                              {item.reward_note || "Bonus Poin Manual"}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                              {item.created_at
                                ? formatShortDate(item.created_at)
                                : "-"}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold tabular-nums text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 px-2 py-0.5 rounded-lg shrink-0">
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
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-3.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Penukaran Hadiah
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                      Poin ditukar menjadi hadiah
                    </p>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15 px-2.5 py-1 rounded-lg shrink-0">
                    -{totalRedeemed} Poin
                  </span>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-zinc-800 max-h-48 overflow-y-auto">
                  {redeemItems.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 dark:text-zinc-500 italic">
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
                            <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 truncate block">
                              {item.reward_note || "Penukaran Hadiah"}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                              {item.created_at
                                ? formatShortDate(item.created_at)
                                : "-"}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold tabular-nums text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15 px-2 py-0.5 rounded-lg shrink-0">
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
  );
}
