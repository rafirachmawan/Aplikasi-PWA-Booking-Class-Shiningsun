"use client";

// Dipisahkan dari SchedulingClientWrapper.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Icons } from "@/components/ui/icons";
import { DatePickerInput } from "@/components/ui/DatePickerInput";

export interface ManualBookingFormProps {
  classes: any[];
  getRemainingSlots: (dateStr: string, time: string, classId: string) => any;
  handleManualSubmit: (e: FormEvent) => Promise<void>;
  isSubmitting: boolean;
  manualClassId: string;
  manualDate: string;
  manualDDSearch: string;
  manualTime: string;
  openManualDD: "jam" | "kelas" | null;
  setManualClassId: Dispatch<SetStateAction<string>>;
  setManualDate: Dispatch<SetStateAction<string>>;
  setManualDDSearch: Dispatch<SetStateAction<string>>;
  setManualTime: Dispatch<SetStateAction<string>>;
  setOpenManualDD: Dispatch<SetStateAction<"jam" | "kelas" | null>>;
  studentId: string;
  timeSlots: string[];
}

export function ManualBookingForm({
  classes,
  getRemainingSlots,
  handleManualSubmit,
  isSubmitting,
  manualClassId,
  manualDate,
  manualDDSearch,
  manualTime,
  openManualDD,
  setManualClassId,
  setManualDate,
  setManualDDSearch,
  setManualTime,
  setOpenManualDD,
  studentId,
  timeSlots,
}: ManualBookingFormProps) {
  return (
    <form onSubmit={handleManualSubmit} className="space-y-6">
      <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Icons.calendar className="w-4 h-4 text-brand-600 dark:text-brand-400" /> Langkah
          2: Pilih Sesi Manual
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            {(() => {
              const d = new Date(manualDate);
              const manualHari = isNaN(d.getTime())
                ? ""
                : [
                    "Minggu",
                    "Senin",
                    "Selasa",
                    "Rabu",
                    "Kamis",
                    "Jumat",
                    "Sabtu",
                  ][d.getDay()];
              return (
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300">
                    Tanggal
                  </label>
                  {manualHari && (
                    <span className="text-[11px] font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-500/15 px-2 py-0.5 rounded-lg">
                      {manualHari}
                    </span>
                  )}
                </div>
              );
            })()}
            <DatePickerInput
              required
              showManualInput={false}
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
              Pilih Jam
              {manualClassId &&
                manualDate &&
                manualTime &&
                (() => {
                  const r = getRemainingSlots(
                    manualDate,
                    manualTime,
                    manualClassId,
                  );
                  return r !== null ? (
                    <span className="text-brand-600 dark:text-brand-400 font-bold ml-1">
                      (Sisa {r})
                    </span>
                  ) : null;
                })()}
            </label>
            <div className="relative">
              {/* Hidden native select — hanya untuk semantik form (required) */}
              <select
                required
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
                tabIndex={-1}
                aria-hidden="true"
                className="absolute opacity-0 pointer-events-none w-px h-px"
              >
                <option value="" />
                {timeSlots.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              {/* Trigger Button */}
              <button
                type="button"
                onClick={() =>
                  setOpenManualDD(openManualDD === "jam" ? null : "jam")
                }
                className={`w-full flex items-center justify-between gap-2 rounded-xl border bg-white dark:bg-zinc-900 pl-3.5 pr-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white transition-colors cursor-pointer h-11 ${
                  openManualDD === "jam"
                    ? "border-brand-500 ring-2 ring-brand-500/30"
                    : "border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600"
                }`}
              >
                {manualTime ? (
                  <span className="truncate text-left">
                    {manualTime} -{""}
                    {String(
                      parseInt(manualTime.split(":")[0], 10) + 1,
                    ).padStart(2, "0")}
                    :00
                  </span>
                ) : (
                  <span className="truncate text-left text-slate-400 font-medium">
                    -- Pilih Jam --
                  </span>
                )}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`text-slate-400 transition-transform duration-200 shrink-0 ${
                    openManualDD === "jam"
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {/* Floating Menu Popover */}
              {openManualDD === "jam" && (
                <>
                  {/* Invisible Backdrop (tanpa blur/gelap) */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setOpenManualDD(null)}
                  />

                  <div className="absolute left-0 top-full mt-1.5 z-50 min-w-56 w-full bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-1.5 space-y-1">
                    <div className="p-1">
                      <input
                        type="text"
                        value={manualDDSearch}
                        onChange={(e) =>
                          setManualDDSearch(e.target.value)
                        }
                        placeholder="Cari jam..."
                        className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
                      />
                    </div>

                    <div className="max-h-52 overflow-y-auto space-y-1">
                      {timeSlots
                        .filter((t) =>
                          manualDDSearch.trim()
                            ? t.includes(manualDDSearch.trim())
                            : true,
                        )
                        .map((t) => {
                          const rem = manualClassId
                            ? getRemainingSlots(
                                manualDate,
                                t,
                                manualClassId,
                              )
                            : null;
                          const isFull = rem !== null && rem <= 0;
                          const endHour = String(
                            parseInt(t.split(":")[0], 10) + 1,
                          ).padStart(2, "0");
                          const isSelected = manualTime === t;
                          return (
                            <button
                              key={t}
                              type="button"
                              disabled={isFull}
                              onClick={() => {
                                setManualTime(t);
                                setOpenManualDD(null);
                              }}
                              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                                isFull
                                  ? "opacity-50 cursor-not-allowed"
                                  : "cursor-pointer"
                              } ${
                                isSelected
                                  ? "bg-brand-50 dark:bg-brand-500/15 border border-brand-200 dark:border-brand-800/50"
                                  : isFull
                                    ? "bg-slate-50 dark:bg-zinc-800/40"
                                    : "hover:bg-slate-100 dark:hover:bg-zinc-800"
                              }`}
                            >
                              <span
                                className={`truncate text-left font-semibold ${
                                  isSelected
                                    ? "text-brand-700 dark:text-brand-300"
                                    : "text-slate-900 dark:text-white"
                                }`}
                              >
                                {t} - {endHour}:00
                              </span>
                              {rem !== null && (
                                <span
                                  className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                                    isFull
                                      ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                                      : "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                                  }`}
                                >
                                  {isFull ? "Penuh" : `Sisa ${rem}`}
                                </span>
                              )}
                            </button>
                          );
                        })}

                      {timeSlots.every(
                        (t) =>
                          manualDDSearch.trim() &&
                          !t.includes(manualDDSearch.trim()),
                      ) && (
                        <p className="px-3 py-2 text-xs text-slate-400 dark:text-zinc-500 text-center font-medium">
                          Jam tidak ditemukan.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
              Pilih Kelas
            </label>
            <div className="relative">
              {/* Hidden native select — hanya untuk semantik form (required) */}
              <select
                required
                value={manualClassId}
                onChange={(e) => setManualClassId(e.target.value)}
                tabIndex={-1}
                aria-hidden="true"
                className="absolute opacity-0 pointer-events-none w-px h-px"
              >
                <option value="" />
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Trigger Button */}
              <button
                type="button"
                onClick={() =>
                  setOpenManualDD(
                    openManualDD === "kelas" ? null : "kelas",
                  )
                }
                className={`w-full flex items-center justify-between gap-2 rounded-xl border bg-white dark:bg-zinc-900 pl-3.5 pr-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white transition-colors cursor-pointer h-11 ${
                  openManualDD === "kelas"
                    ? "border-brand-500 ring-2 ring-brand-500/30"
                    : "border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600"
                }`}
              >
                {manualClassId ? (
                  <span className="truncate text-left">
                    {classes.find((c) => c.id === manualClassId)
                      ?.name || "-- Pilih Tipe Kelas --"}
                  </span>
                ) : (
                  <span className="truncate text-left text-slate-400 font-medium">
                    -- Pilih Tipe Kelas --
                  </span>
                )}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`text-slate-400 transition-transform duration-200 shrink-0 ${
                    openManualDD === "kelas"
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {/* Floating Menu Popover */}
              {openManualDD === "kelas" && (
                <>
                  {/* Invisible Backdrop (tanpa blur/gelap) */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setOpenManualDD(null)}
                  />

                  <div className="absolute left-0 top-full mt-1.5 z-50 min-w-56 w-full bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-1.5 space-y-1">
                    <div className="p-1">
                      <input
                        type="text"
                        value={manualDDSearch}
                        onChange={(e) =>
                          setManualDDSearch(e.target.value)
                        }
                        placeholder="Cari tipe kelas..."
                        className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
                      />
                    </div>

                    <div className="max-h-52 overflow-y-auto space-y-1">
                      {classes
                        .filter((c) =>
                          manualDDSearch.trim()
                            ? c.name
                                .toLowerCase()
                                .includes(
                                  manualDDSearch.trim().toLowerCase(),
                                )
                            : true,
                        )
                        .map((c) => {
                          const rem =
                            manualDate && manualTime
                              ? getRemainingSlots(
                                  manualDate,
                                  manualTime,
                                  c.id,
                                )
                              : null;
                          const isFull = rem !== null && rem <= 0;
                          const isSelected = c.id === manualClassId;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              disabled={isFull}
                              onClick={() => {
                                setManualClassId(c.id);
                                setOpenManualDD(null);
                              }}
                              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                                isFull
                                  ? "opacity-50 cursor-not-allowed"
                                  : "cursor-pointer"
                              } ${
                                isSelected
                                  ? "bg-brand-50 dark:bg-brand-500/15 border border-brand-200 dark:border-brand-800/50"
                                  : isFull
                                    ? "bg-slate-50 dark:bg-zinc-800/40"
                                    : "hover:bg-slate-100 dark:hover:bg-zinc-800"
                              }`}
                            >
                              <span
                                className={`truncate text-left font-semibold ${
                                  isSelected
                                    ? "text-brand-700 dark:text-brand-300"
                                    : "text-slate-900 dark:text-white"
                                }`}
                              >
                                {c.name}
                              </span>
                              <span
                                className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                                  isFull
                                    ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                                    : "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                                }`}
                              >
                                {isFull
                                  ? "Penuh"
                                  : rem !== null
                                    ? `Sisa ${rem}/${c.max_quota}`
                                    : `Max: ${c.max_quota}`}
                              </span>
                            </button>
                          );
                        })}

                      {classes.every(
                        (c) =>
                          manualDDSearch.trim() &&
                          !c.name
                            .toLowerCase()
                            .includes(
                              manualDDSearch.trim().toLowerCase(),
                            ),
                      ) && (
                        <p className="px-3 py-2 text-xs text-slate-400 dark:text-zinc-500 text-center font-medium">
                          Tipe kelas tidak ditemukan.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-slate-500 dark:text-zinc-400 mt-2">
          Sistem akan secara otomatis membuatkan kotak jadwal di
          kalender jika belum ada, lalu mendaftarkan siswa ke kelas
          tersebut.
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !studentId || !manualClassId}
        className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 cursor-pointer"
      >
        {isSubmitting ? "Memproses Data..." : "Booking Sesi Ini"}
      </button>
    </form>
  );
}
