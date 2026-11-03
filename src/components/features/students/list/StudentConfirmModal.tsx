"use client";

// Dipisahkan dari StudentClientWrapper.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, SetStateAction } from "react";
import { Icons } from "@/components/ui/icons";

export interface StudentConfirmModalProps {
  confirmModal: { isOpen: boolean; type: "delete" | "toggle"; studentId: string; studentName: string; newStatus?: string; };
  handleExecuteAction: () => Promise<void>;
  isProcessing: boolean;
  modalError: string;
  setConfirmModal: Dispatch<SetStateAction<{ isOpen: boolean; type: "delete" | "toggle"; studentId: string; studentName: string; newStatus?: string; }>>;
}

export function StudentConfirmModal({
  confirmModal,
  handleExecuteAction,
  isProcessing,
  modalError,
  setConfirmModal,
}: StudentConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() =>
          !isProcessing &&
          setConfirmModal((prev) => ({ ...prev, isOpen: false }))
        }
      />
      <div className="relative z-10 w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 p-6 overflow-hidden">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${
            confirmModal.type === "delete"
              ? "bg-red-50 dark:bg-red-500/15"
              : "bg-brand-50 dark:bg-brand-500/15"
          }`}
        >
          {confirmModal.type === "delete" ? (
            <Icons.trash className="w-6 h-6 text-red-600 dark:text-red-400" />
          ) : (
            <Icons.settings className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          )}
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">
          {confirmModal.type === "delete"
            ? "Hapus Data Siswa?"
            : confirmModal.newStatus === "INACTIVE"
              ? "Nonaktifkan Siswa?"
              : "Aktifkan Siswa?"}
        </h3>

        <p className="text-sm text-slate-500 dark:text-zinc-400 text-center mt-2 leading-relaxed">
          {confirmModal.type === "delete" ? (
            <>
              Apakah Anda yakin ingin menghapus data siswa{" "}
              <strong className="text-slate-700 dark:text-zinc-200">
                "{confirmModal.studentName}"
              </strong>{" "}
              secara permanen? Data yang dihapus tidak dapat dikembalikan.
            </>
          ) : confirmModal.newStatus === "INACTIVE" ? (
            <>
              Apakah Anda yakin ingin menonaktifkan siswa{" "}
              <strong className="text-slate-700 dark:text-zinc-200">
                "{confirmModal.studentName}"
              </strong>
              ? Data siswa akan dipindah ke tab Nonaktif.
            </>
          ) : (
            <>
              Apakah Anda yakin ingin mengaktifkan kembali siswa{" "}
              <strong className="text-slate-700 dark:text-zinc-200">
                "{confirmModal.studentName}"
              </strong>{" "}
              sebagai siswa Reguler?
            </>
          )}
        </p>

        {modalError && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-3 text-center font-medium bg-red-50 dark:bg-red-500/10 p-2.5 rounded-xl border border-red-200 dark:border-red-800/50">
            {modalError}
          </p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() =>
              setConfirmModal((prev) => ({ ...prev, isOpen: false }))
            }
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleExecuteAction}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 active:translate-y-px ${
              confirmModal.type === "delete"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            {isProcessing
              ? "Memproses..."
              : confirmModal.type === "delete"
                ? "Ya, Hapus"
                : "Ya, Lanjutkan"}
          </button>
        </div>
      </div>
    </div>
  );
}
