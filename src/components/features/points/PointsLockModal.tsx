"use client";

// Dipisahkan dari PointsClientWrapper.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Icons } from "@/components/ui/icons";

export interface PointsLockModalProps {
  handleUnlockAddPoints: (e: FormEvent) => Promise<void>;
  lockError: string;
  lockPassword: string;
  setLockError: Dispatch<SetStateAction<string>>;
  setLockPassword: Dispatch<SetStateAction<string>>;
  setShowAddLockModal: Dispatch<SetStateAction<boolean>>;
}

export function PointsLockModal({
  handleUnlockAddPoints,
  lockError,
  lockPassword,
  setLockError,
  setLockPassword,
  setShowAddLockModal,
}: PointsLockModalProps) {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => setShowAddLockModal(false)}
      />
      <div className="relative z-10 w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-300 flex items-center justify-center mx-auto">
          <Icons.shield className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Akses Tambah Poin Dikunci
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
            Fitur Tambah Poin Manual dilindungi SuperAdmin. Masukkan
            password PIN untuk membuka fitur ini.
          </p>
        </div>

        <form onSubmit={handleUnlockAddPoints} className="space-y-4 pt-1">
          <div>
            <input
              type="password"
              autoFocus
              required
              value={lockPassword}
              onChange={(e) => {
                setLockPassword(e.target.value);
                setLockError("");
              }}
              placeholder="Masukkan password PIN..."
              className="w-full px-4 py-2.5 rounded-xl text-sm border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            />
            {lockError && (
              <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-2">
                {lockError}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowAddLockModal(false)}
              className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 active:translate-y-[1px] transition-colors cursor-pointer"
            >
              Buka Akses
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
