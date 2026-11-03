"use client";

// Dipisahkan dari SchedulingClientWrapper.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, SetStateAction } from "react";

export interface SchedulingNotificationModalProps {
  modalConfig: { isOpen: boolean; type: "success" | "error" | "warning"; message: string; };
  setModalConfig: Dispatch<SetStateAction<{ isOpen: boolean; type: "success" | "error" | "warning"; message: string; }>>;
}

export function SchedulingNotificationModal({
  modalConfig,
  setModalConfig,
}: SchedulingNotificationModalProps) {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-zinc-800">
        <div className="p-6 text-center">
          {modalConfig.type === "success" && (
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/15 mb-4">
              <svg
                className="h-7 w-7 text-emerald-600 dark:text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>
          )}
          {modalConfig.type === "warning" && (
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/15 mb-4">
              <svg
                className="h-7 w-7 text-amber-600 dark:text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          )}
          {modalConfig.type === "error" && (
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/15 mb-4">
              <svg
                className="h-7 w-7 text-red-600 dark:text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          )}

          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            {modalConfig.type === "success"
              ? "Berhasil!"
              : modalConfig.type === "warning"
                ? "Perhatian"
                : "Terjadi Kesalahan"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            {modalConfig.message}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-zinc-800/50 px-6 py-4 border-t border-slate-200 dark:border-zinc-800">
          <button
            onClick={() =>
              setModalConfig({ ...modalConfig, isOpen: false })
            }
            className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 active:translate-y-[1px] transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
