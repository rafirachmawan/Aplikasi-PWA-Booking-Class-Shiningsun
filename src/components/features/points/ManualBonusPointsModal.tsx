"use client";

// Dipisahkan dari PointsClientWrapper.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, FormEvent, RefObject, SetStateAction } from "react";
import { Icons } from "@/components/ui/icons";

export interface ManualBonusPointsModalProps {
  addErrorMsg: string;
  addNote: string;
  addPointsVal: number | "";
  addSuccessMsg: string;
  filteredModalStudents: any[];
  handleConfirmAddPoints: (e: FormEvent) => Promise<void>;
  isStudentDropdownOpen: boolean;
  isSubmittingAdd: boolean;
  selectedStudentForAdd: any;
  setAddNote: Dispatch<SetStateAction<string>>;
  setAddPointsVal: Dispatch<SetStateAction<number | "">>;
  setIsStudentDropdownOpen: Dispatch<SetStateAction<boolean>>;
  setSelectedStudentForAdd: Dispatch<any>;
  setStudentSearchInModal: Dispatch<SetStateAction<string>>;
  studentSearchInModal: string;
  studentSearchInputRef: RefObject<HTMLInputElement | null>;
}

export function ManualBonusPointsModal({
  addErrorMsg,
  addNote,
  addPointsVal,
  addSuccessMsg,
  filteredModalStudents,
  handleConfirmAddPoints,
  isStudentDropdownOpen,
  isSubmittingAdd,
  selectedStudentForAdd,
  setAddNote,
  setAddPointsVal,
  setIsStudentDropdownOpen,
  setSelectedStudentForAdd,
  setStudentSearchInModal,
  studentSearchInModal,
  studentSearchInputRef,
}: ManualBonusPointsModalProps) {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => !isSubmittingAdd && setSelectedStudentForAdd(null)}
      />

      <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 text-left">
        <div className="flex items-center justify-between mb-4 border-b pb-3 border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 shrink-0">
              <Icons.add className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Tambah Poin Manual
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Bonus prestasi atau lomba
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              !isSubmittingAdd && setSelectedStudentForAdd(null)
            }
            aria-label="Tutup"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
          >
            <Icons.close className="w-5 h-5" />
          </button>
        </div>

        {/* Custom Dropdown Student Picker */}
        <div className="relative mb-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
            Pilih Siswa <span className="text-red-500">*</span>
          </label>

          <button
            type="button"
            onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
            aria-expanded={isStudentDropdownOpen}
            className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-xs sm:text-sm font-bold hover:border-slate-400 dark:hover:border-zinc-600 cursor-pointer text-left transition-colors"
          >
            <div className="flex items-center gap-2 truncate min-w-0">
              <span className="truncate">
                {selectedStudentForAdd.name}{" "}
                {selectedStudentForAdd.nickname
                  ? `(${selectedStudentForAdd.nickname})`
                  : ""}
              </span>
              <span className="shrink-0 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800/50 tabular-nums">
                {selectedStudentForAdd.points || 0} Poin
              </span>
            </div>
            <Icons.chevronDown
              className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isStudentDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isStudentDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 p-2 space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar">
              <div className="sticky top-0 bg-white dark:bg-zinc-900 pb-1 z-10">
                <input
                  ref={studentSearchInputRef}
                  type="text"
                  value={studentSearchInModal}
                  onChange={(e) => setStudentSearchInModal(e.target.value)}
                  placeholder="Cari nama siswa dalam daftar..."
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                  autoFocus
                />
              </div>

              {filteredModalStudents.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400 dark:text-zinc-500">
                  Tidak ada siswa ditemukan.
                </div>
              ) : (
                filteredModalStudents.map((st) => {
                  const isSel = selectedStudentForAdd.id === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setSelectedStudentForAdd(st);
                        setIsStudentDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                        isSel
                          ? "bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 font-bold"
                          : "text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 font-semibold"
                      }`}
                    >
                      <span className="truncate">
                        {st.name} {st.nickname ? `(${st.nickname})` : ""}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15 px-1.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800/50 tabular-nums">
                          {st.points || 0}
                        </span>
                        {isSel && (
                          <span className="text-brand-600 dark:text-brand-400 text-xs font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {addErrorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-800/50">
            {addErrorMsg}
          </div>
        )}

        {addSuccessMsg && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-200 dark:border-emerald-800/50">
            {addSuccessMsg}
          </div>
        )}

        <form onSubmit={handleConfirmAddPoints} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
              Jumlah Poin Tambahan <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={100}
                required
                value={addPointsVal}
                onChange={(e) =>
                  setAddPointsVal(
                    e.target.value ? Number(e.target.value) : "",
                  )
                }
                placeholder="Contoh: 5"
                className="flex-1 px-4 py-2.5 rounded-xl text-sm border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 tabular-nums"
              />
              {/* Preset point buttons */}
              {[1, 2, 5, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setAddPointsVal(num)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer tabular-nums ${
                    addPointsVal === num
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  +{num}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
              Keterangan / Alasan Penambahan{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={addNote}
              onChange={(e) => setAddNote(e.target.value)}
              placeholder="Contoh: Juara 1 Lomba Mewarnai / Event Khusus"
              className="w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setSelectedStudentForAdd(null)}
              disabled={isSubmittingAdd}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmittingAdd}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 active:translate-y-[1px] transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {isSubmittingAdd ? "Memproses..." : "Tambah Poin Sekarang"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
