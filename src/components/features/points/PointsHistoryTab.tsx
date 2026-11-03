"use client";

// Dipisahkan dari PointsClientWrapper.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, RefObject, SetStateAction } from "react";
import { Icons } from "@/components/ui/icons";
import { formatShortDate } from "@/lib/dateUtils";

export interface PointsHistoryTabProps {
  activeStudents: any[];
  combinedHistory: any[];
  historyStudentRef: RefObject<HTMLDivElement | null>;
  historyStudentSearch: string;
  historyTypeFilter: "all" | "attendance" | "extra" | "redeem";
  isHistoryStudentOpen: boolean;
  searchQuery: string;
  selectedHistoryStudent: string;
  setHistoryStudentSearch: Dispatch<SetStateAction<string>>;
  setHistoryTypeFilter: Dispatch<SetStateAction<"all" | "attendance" | "extra" | "redeem">>;
  setIsHistoryStudentOpen: Dispatch<SetStateAction<boolean>>;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  setSelectedHistoryStudent: Dispatch<SetStateAction<string>>;
}

export function PointsHistoryTab({
  activeStudents,
  combinedHistory,
  historyStudentRef,
  historyStudentSearch,
  historyTypeFilter,
  isHistoryStudentOpen,
  searchQuery,
  selectedHistoryStudent,
  setHistoryStudentSearch,
  setHistoryTypeFilter,
  setIsHistoryStudentOpen,
  setSearchQuery,
  setSelectedHistoryStudent,
}: PointsHistoryTabProps) {
  return (
    <div className="space-y-6">
      {/* Controls: Student Dropdown Filter & Search Bar */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Custom Searchable Student Filter Dropdown */}
          <div className="relative" ref={historyStudentRef}>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
              Filter Siswa
            </label>
            <button
              type="button"
              onClick={() => setIsHistoryStudentOpen(!isHistoryStudentOpen)}
              aria-expanded={isHistoryStudentOpen}
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white flex items-center justify-between gap-2 h-11 hover:border-slate-300 dark:hover:border-zinc-600 transition-colors cursor-pointer"
            >
              <span className="truncate">
                {selectedHistoryStudent
                  ? activeStudents.find(
                      (s) => s.id === selectedHistoryStudent,
                    )?.name || "Siswa Terpilih"
                  : `Semua Siswa (${activeStudents.length})`}
              </span>
              <Icons.chevronDown
                className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  isHistoryStudentOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Popover Menu */}
            {isHistoryStudentOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl p-2.5 max-h-72 overflow-hidden flex flex-col">
                {/* Popover Search */}
                <div className="relative mb-2 shrink-0">
                  <Icons.search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={historyStudentSearch}
                    onChange={(e) =>
                      setHistoryStudentSearch(e.target.value)
                    }
                    placeholder="Cari siswa..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                {/* Popover Student List */}
                <div className="overflow-y-auto space-y-1 flex-1 pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHistoryStudent("");
                      setIsHistoryStudentOpen(false);
                      setHistoryStudentSearch("");
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                      !selectedHistoryStudent
                        ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                        : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                    }`}
                  >
                    <span>Semua Siswa ({activeStudents.length})</span>
                    {!selectedHistoryStudent && <span>✓</span>}
                  </button>

                  {[...activeStudents]
                    .filter((st) => {
                      if (!historyStudentSearch.trim()) return true;
                      const q = historyStudentSearch.toLowerCase();
                      return (
                        st.name.toLowerCase().includes(q) ||
                        (st.nickname &&
                          st.nickname.toLowerCase().includes(q))
                      );
                    })
                    .sort((a, b) => {
                      const nameCompare = a.name.localeCompare(
                        b.name,
                        "id",
                      );
                      if (nameCompare !== 0) return nameCompare;

                      // If names are equal, compare nicknames
                      const nickA = a.nickname || "";
                      const nickB = b.nickname || "";
                      return nickA.localeCompare(nickB, "id");
                    })
                    .map((st) => {
                      const isSelected = selectedHistoryStudent === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            setSelectedHistoryStudent(st.id);
                            setIsHistoryStudentOpen(false);
                            setHistoryStudentSearch("");
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 font-bold"
                              : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200"
                          }`}
                        >
                          <div className="truncate pr-2">
                            <span className="font-bold">{st.name}</span>
                            {st.nickname && (
                              <span className="text-slate-400 text-[11px] ml-1">
                                ({st.nickname})
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <span className="text-brand-600 dark:text-brand-400 font-bold">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Text Search Bar */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
              Pencarian Kata Kunci
            </label>
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
                placeholder="Cari materi, keterangan..."
                aria-label="Cari materi, keterangan"
              />
            </div>
          </div>
        </div>

        {/* Category Segmented Control Layout: Separate Extra and Redeem */}
        <div className="pt-3 border-t border-slate-200 dark:border-zinc-800">
          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-2">
            Kategori Riwayat
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setHistoryTypeFilter("all")}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center truncate ${
                historyTypeFilter === "all"
                  ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>Semua</span>
            </button>

            <button
              type="button"
              onClick={() => setHistoryTypeFilter("attendance")}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center truncate ${
                historyTypeFilter === "attendance"
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400"
              }`}
            >
              <span>Pertemuan</span>
            </button>

            <button
              type="button"
              onClick={() => setHistoryTypeFilter("extra")}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center truncate ${
                historyTypeFilter === "extra"
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400"
              }`}
            >
              <span>Poin Extra</span>
            </button>

            <button
              type="button"
              onClick={() => setHistoryTypeFilter("redeem")}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center truncate ${
                historyTypeFilter === "redeem"
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 dark:text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400"
              }`}
            >
              <span>Point Ditukar</span>
            </button>
          </div>
        </div>
      </div>

      {/* History List Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Log Riwayat Aktivitas Poin
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              {selectedHistoryStudent
                ? "Menampilkan riwayat aktivitas untuk siswa terpilih"
                : "Catatan presensi kelas, poin extra manual, dan penukaran hadiah"}
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg tabular-nums">
            {combinedHistory.length} Record
          </span>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-zinc-800">
          {combinedHistory.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
                {searchQuery || selectedHistoryStudent
                  ? "Tidak ada data riwayat sesuai filter yang dipilih."
                  : "Belum ada riwayat aktivitas poin."}
              </p>
            </div>
          ) : (
            combinedHistory.map((item) => {
              const isAttendance = item.kind === "attendance";
              const isBonus = item.is_bonus;
              const isAbsent = item.is_absent;
              const KindIcon = isAttendance
                ? Icons.calendar
                : isBonus
                  ? Icons.star
                  : Icons.gift;

              return (
                <div
                  key={item.id}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-300">
                      <KindIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {item.student?.name || "Siswa"}
                        </h4>
                        {item.student?.nickname && (
                          <span className="text-xs text-slate-400 dark:text-zinc-500">
                            ({item.student.nickname})
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                            isAttendance
                              ? isAbsent
                                ? "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300"
                                : "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300"
                              : isBonus
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300"
                          }`}
                        >
                          {item.badgeLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-zinc-300 mt-0.5 font-medium truncate">
                        {item.note}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 block mt-0.5">
                        {item.created_at
                          ? formatShortDate(item.created_at)
                          : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border tabular-nums ${
                        isAttendance
                          ? isAbsent
                            ? "bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 border-slate-200 dark:border-zinc-700"
                            : "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 border-sky-200 dark:border-sky-800/50"
                          : isBonus
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border-rose-200 dark:border-rose-800/50"
                      }`}
                    >
                      {item.displayPoints}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
