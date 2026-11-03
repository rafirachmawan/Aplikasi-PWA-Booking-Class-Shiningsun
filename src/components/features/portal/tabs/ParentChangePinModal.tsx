"use client";

// Dipisahkan dari ParentDashboardClient.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Icons } from "@/components/ui/icons";

export interface ParentChangePinModalProps {
  confirmPin: string;
  handleChangePin: (e: FormEvent) => Promise<void>;
  isSubmittingPin: boolean;
  newPin: string;
  pinErrorMsg: string;
  pinSuccessMsg: string;
  setConfirmPin: Dispatch<SetStateAction<string>>;
  setNewPin: Dispatch<SetStateAction<string>>;
  setShowChangePinModal: Dispatch<SetStateAction<boolean>>;
  setShowPinText: Dispatch<SetStateAction<boolean>>;
  showPinText: boolean;
}

export function ParentChangePinModal({
  confirmPin,
  handleChangePin,
  isSubmittingPin,
  newPin,
  pinErrorMsg,
  pinSuccessMsg,
  setConfirmPin,
  setNewPin,
  setShowChangePinModal,
  setShowPinText,
  showPinText,
}: ParentChangePinModalProps) {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => !isSubmittingPin && setShowChangePinModal(false)}
      />
      <div className="relative z-10 w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-3">
            <Icons.shield className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Ganti PIN Akses
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            PIN baru akan langsung berlaku untuk login Portal Orang Tua dan
            juga terupdate di sisi Admin.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleChangePin} className="px-6 pb-2 space-y-3">
          {pinErrorMsg && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-semibold">
              <span>{pinErrorMsg}</span>
            </div>
          )}
          {pinSuccessMsg && (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 p-3 rounded-xl text-xs font-semibold">
              <span>{pinSuccessMsg}</span>
            </div>
          )}

          {/* New PIN */}
          <div>
            <label
              htmlFor="newPin"
              className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5"
            >
              PIN Baru
            </label>
            <div className="relative">
              <input
                id="newPin"
                type={showPinText ? "text" : "password"}
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={10}
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-3.5 pr-10 py-2.5 text-sm font-bold tracking-widest text-slate-900 dark:text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal transition-colors"
                placeholder="Masukkan PIN baru (min. 4)"
              />
              <button
                type="button"
                onClick={() => setShowPinText(!showPinText)}
                aria-label={showPinText ? "Sembunyikan PIN" : "Tampilkan PIN"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1 transition-colors rounded-lg cursor-pointer"
              >
                {showPinText ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Confirm PIN */}
          <div>
            <label
              htmlFor="confirmPin"
              className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5"
            >
              Konfirmasi PIN Baru
            </label>
            <input
              id="confirmPin"
              type={showPinText ? "text" : "password"}
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={10}
              required
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-3.5 py-2.5 text-sm font-bold tracking-widest text-slate-900 dark:text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal transition-colors"
              placeholder="Ulangi PIN baru"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2.5 pt-2 pb-4">
            <button
              type="button"
              disabled={isSubmittingPin}
              onClick={() => setShowChangePinModal(false)}
              className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors min-h-11 cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmittingPin}
              className="flex-1 py-2.5 px-4 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-700 active:translate-y-px text-white transition-colors disabled:opacity-50 min-h-11 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmittingPin ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>Simpan PIN Baru</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
