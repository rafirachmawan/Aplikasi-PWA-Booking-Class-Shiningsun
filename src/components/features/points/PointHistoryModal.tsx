"use client";

// Dipisahkan dari PointsClientWrapper.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, SetStateAction } from "react";
import { Icons } from "@/components/ui/icons";

export interface PointHistoryModalProps {
  attendanceOnly: any[];
  bonusManualOnly: any[];
  redeemOnly: any[];
  selectedStudentForHistory: any;
  setIsHistoryModalOpen: Dispatch<SetStateAction<boolean>>;
}

export function PointHistoryModal({
  attendanceOnly,
  bonusManualOnly,
  redeemOnly,
  selectedStudentForHistory,
  setIsHistoryModalOpen,
}: PointHistoryModalProps) {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => setIsHistoryModalOpen(false)}
      />
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                Riwayat Poin {selectedStudentForHistory.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {selectedStudentForHistory.nickname
                  ? `(${selectedStudentForHistory.nickname})`
                  : "Kehadiran, bonus manual, dan penukaran"}
              </p>
            </div>
            <button
              onClick={() => setIsHistoryModalOpen(false)}
              aria-label="Tutup"
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
            >
              <Icons.close className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-96 p-4 space-y-5">
          {/* Point Masuk: Kehadiran Otomatis */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-200 mb-2.5">
              Kehadiran dari Lembar Perkembangan
            </h4>
            <div className="space-y-2">
              {attendanceOnly.length > 0 ? (
                attendanceOnly.map((historyItem: any) => (
                  <div
                    key={historyItem.id}
                    className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800 rounded-xl p-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-zinc-100 truncate">
                          {historyItem.description}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">
                          {new Date(
                            historyItem.created_at,
                          ).toLocaleDateString("id-ID", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <span className={`text-sm font-bold whitespace-nowrap ml-2 tabular-nums ${historyItem.displayPoints > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-zinc-500"}`}>
                        {historyItem.displayPoints > 0 ? `+${historyItem.displayPoints}` : "0"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-800/60 rounded-xl">
                  Belum ada riwayat kehadiran
                </div>
              )}
            </div>
          </div>

          {/* Point Masuk: Bonus Manual */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-200 mb-2.5">
              Bonus Poin Input Manual
            </h4>
            <div className="space-y-2">
              {bonusManualOnly.length > 0 ? (
                bonusManualOnly.map((historyItem: any) => (
                  <div
                    key={historyItem.id}
                    className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-amber-900 dark:text-amber-200 truncate">
                          {historyItem.description}
                        </p>
                        <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-1">
                          {new Date(
                            historyItem.created_at,
                          ).toLocaleDateString("id-ID", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-amber-700 dark:text-amber-300 whitespace-nowrap ml-2 tabular-nums">
                        +{Math.abs(historyItem.displayPoints)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-800/60 rounded-xl">
                  Belum ada bonus poin manual
                </div>
              )}
            </div>
          </div>

          {/* Point Keluar: Tukar Hadiah */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-200 mb-2.5">
              Point Ditukar Hadiah
            </h4>
            <div className="space-y-2">
              {redeemOnly.length > 0 ? (
                redeemOnly.map((historyItem: any) => (
                  <div
                    key={historyItem.id}
                    className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800 rounded-xl p-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-zinc-100 truncate">
                          {historyItem.description}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">
                          {new Date(
                            historyItem.created_at,
                          ).toLocaleDateString("id-ID", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap ml-2 tabular-nums">
                        -{Math.abs(historyItem.displayPoints)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-800/60 rounded-xl">
                  Belum ada riwayat penukaran
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 shrink-0">
          <button
            onClick={() => setIsHistoryModalOpen(false)}
            className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
