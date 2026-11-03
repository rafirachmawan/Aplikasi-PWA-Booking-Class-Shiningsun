"use client";

// Dipisahkan dari SchedulingClientWrapper.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, FormEvent, RefObject, SetStateAction } from "react";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { Icons } from "@/components/ui/icons";

export interface AutoBookingFormProps {
  addAutoScheduleRow: () => void;
  autoSchedules: { startDate: string; time: string; classId: string; }[];
  classes: any[];
  classTypeSearch: string;
  classTypeSearchRef: RefObject<HTMLInputElement | null>;
  getRemainingSlots: (dateStr: string, time: string, classId: string) => any;
  handleAutoSubmit: (e: FormEvent) => Promise<void>;
  isSubmitting: boolean;
  openAutoTimeIndex: number | null;
  openClassIdx: number | null;
  removeAutoScheduleRow: (index: number) => void;
  setClassTypeSearch: Dispatch<SetStateAction<string>>;
  setOpenAutoTimeIndex: Dispatch<SetStateAction<number | null>>;
  setOpenClassIdx: Dispatch<SetStateAction<number | null>>;
  studentId: string;
  timeSlots: string[];
  updateAutoSchedule: (index: number, field: string, value: any) => void;
}

export function AutoBookingForm({
  addAutoScheduleRow,
  autoSchedules,
  classes,
  classTypeSearch,
  classTypeSearchRef,
  getRemainingSlots,
  handleAutoSubmit,
  isSubmitting,
  openAutoTimeIndex,
  openClassIdx,
  removeAutoScheduleRow,
  setClassTypeSearch,
  setOpenAutoTimeIndex,
  setOpenClassIdx,
  studentId,
  timeSlots,
  updateAutoSchedule,
}: AutoBookingFormProps) {
  return (
    <form onSubmit={handleAutoSubmit} className="space-y-6">
      <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Pilih Jadwal Rutin
          </h3>
          {autoSchedules.map((schedule, index) => {
            // Helper untuk menampilkan hari dari tanggal
            const dateObj = new Date(schedule.startDate);
            const hari = isNaN(dateObj.getTime())
              ? ""
              : [
                  "Minggu",
                  "Senin",
                  "Selasa",
                  "Rabu",
                  "Kamis",
                  "Jumat",
                  "Sabtu",
                ][dateObj.getDay()];

            return (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-12 gap-3.5 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 items-end"
              >
                <div className="md:col-span-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
                      Tanggal
                    </label>
                    {hari && (
                      <span className="text-[11px] font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-500/15 px-2 py-0.5 rounded-lg">
                        {hari}
                      </span>
                    )}
                  </div>
                  <DatePickerInput
                    required
                    showManualInput={false}
                    value={schedule.startDate}
                    onChange={(e) =>
                      updateAutoSchedule(
                        index,
                        "startDate",
                        e.target.value,
                      )
                    }
                  />
                </div>

                <div className="md:col-span-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
                      Jam Sesi
                      {schedule.classId &&
                        schedule.startDate &&
                        schedule.time &&
                        (() => {
                          const r = getRemainingSlots(
                            schedule.startDate,
                            schedule.time,
                            schedule.classId,
                          );
                          return r !== null ? (
                            <span className="text-brand-600 dark:text-brand-400 font-bold ml-1">
                              (Sisa {r})
                            </span>
                          ) : null;
                        })()}
                    </label>
                  </div>
                  <div className="relative">
                    <select
                      value={schedule.time}
                      onChange={(e) =>
                        updateAutoSchedule(
                          index,
                          "time",
                          e.target.value,
                        )
                      }
                      tabIndex={-1}
                      aria-hidden="true"
                      className="absolute opacity-0 pointer-events-none w-px h-px"
                    >
                      {timeSlots.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        setOpenAutoTimeIndex(
                          openAutoTimeIndex === index ? null : index,
                        )
                      }
                      className={`w-full flex items-center justify-between gap-2 rounded-xl border bg-white dark:bg-zinc-900 pl-3.5 pr-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white transition-colors cursor-pointer h-11 ${
                        openAutoTimeIndex === index
                          ? "border-brand-500 ring-2 ring-brand-500/30"
                          : "border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600"
                      }`}
                    >
                      {schedule.time ? (
                        <span className="truncate text-left">
                          {schedule.time} -{" "}
                          {String(
                            parseInt(schedule.time.split(":")[0], 10) +
                              1,
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
                          openAutoTimeIndex === index
                            ? "rotate-180 text-brand-500"
                            : ""
                        }`}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>

                    {openAutoTimeIndex === index && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setOpenAutoTimeIndex(null)}
                        />
                        <div className="absolute left-0 top-full mt-1.5 z-50 min-w-56 w-full bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-1.5 space-y-1">
                          <div className="max-h-52 overflow-y-auto space-y-1">
                            {timeSlots.map((t) => {
                              const rem = schedule.classId
                                ? getRemainingSlots(
                                    schedule.startDate,
                                    t,
                                    schedule.classId,
                                  )
                                : null;
                              const isFull = rem !== null && rem <= 0;
                              const endHour = String(
                                parseInt(t.split(":")[0], 10) + 1,
                              ).padStart(2, "0");
                              const isSelected = schedule.time === t;

                              return (
                                <button
                                  key={t}
                                  type="button"
                                  disabled={isFull}
                                  onClick={() => {
                                    updateAutoSchedule(
                                      index,
                                      "time",
                                      t,
                                    );
                                    setOpenAutoTimeIndex(null);
                                  }}
                                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                                    isFull
                                      ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-zinc-800/40"
                                      : "cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800"
                                  } ${
                                    isSelected
                                      ? "bg-brand-50 dark:bg-brand-500/15 border border-brand-200 dark:border-brand-800/50 text-brand-700 dark:text-brand-300 font-semibold"
                                      : "text-slate-900 dark:text-white"
                                  }`}
                                >
                                  <span className="truncate text-left font-semibold tabular-nums">
                                    {t} - {endHour}:00
                                  </span>
                                  {rem !== null && (
                                    <span
                                      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                                        isFull
                                          ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                                      }`}
                                    >
                                      {isFull ? "Penuh" : `Sisa ${rem}`}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div
                  className={
                    autoSchedules.length > 1
                      ? "md:col-span-3"
                      : "md:col-span-4"
                  }
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
                      Tipe Kelas
                    </label>
                  </div>
                  <div className="relative">
                    {/* Hidden native select — hanya untuk semantik form (required) */}
                    <select
                      required
                      value={schedule.classId}
                      onChange={(e) =>
                        updateAutoSchedule(
                          index,
                          "classId",
                          e.target.value,
                        )
                      }
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
                        setOpenClassIdx(
                          openClassIdx === index ? null : index,
                        )
                      }
                      className={`w-full flex items-center justify-between gap-2 rounded-xl border bg-white dark:bg-zinc-900 pl-3.5 pr-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white transition-colors cursor-pointer h-11 ${
                        openClassIdx === index
                          ? "border-brand-500 ring-2 ring-brand-500/30"
                          : "border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600"
                      }`}
                    >
                      {schedule.classId ? (
                        <span className="truncate text-left">
                          {classes.find(
                            (c) => c.id === schedule.classId,
                          )?.name || "-- Pilih Tipe Kelas --"}
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
                          openClassIdx === index
                            ? "rotate-180 text-brand-500"
                            : ""
                        }`}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>

                    {/* Floating Menu Popover */}
                    {openClassIdx === index && (
                      <>
                        {/* Invisible Backdrop (tanpa blur/gelap — halaman tetap normal) */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setOpenClassIdx(null)}
                        />

                        {/* Menu Popover Container */}
                        <div className="absolute left-0 top-full mt-1.5 z-50 min-w-56 w-full bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-1.5 space-y-1">
                          {/* Search */}
                          <div className="p-1">
                            <input
                              ref={classTypeSearchRef}
                              type="text"
                              value={classTypeSearch}
                              onChange={(e) =>
                                setClassTypeSearch(e.target.value)
                              }
                              placeholder="Cari tipe kelas..."
                              className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
                            />
                          </div>

                          <div className="max-h-52 overflow-y-auto space-y-1">
                            {classes
                              .filter((c) =>
                                classTypeSearch.trim()
                                  ? c.name
                                      .toLowerCase()
                                      .includes(
                                        classTypeSearch
                                          .trim()
                                          .toLowerCase(),
                                      )
                                  : true,
                              )
                              .map((c) => {
                                const rem =
                                  schedule.startDate && schedule.time
                                    ? getRemainingSlots(
                                        schedule.startDate,
                                        schedule.time,
                                        c.id,
                                      )
                                    : null;
                                const isFull = rem !== null && rem <= 0;
                                const isSelected =
                                  c.id === schedule.classId;
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    disabled={isFull}
                                    onClick={() => {
                                      updateAutoSchedule(
                                        index,
                                        "classId",
                                        c.id,
                                      );
                                      setOpenClassIdx(null);
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
                                classTypeSearch.trim() &&
                                !c.name
                                  .toLowerCase()
                                  .includes(
                                    classTypeSearch
                                      .trim()
                                      .toLowerCase(),
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

                {autoSchedules.length > 1 && (
                  <div className="md:col-span-1 flex justify-end md:justify-center pb-1">
                    <button
                      type="button"
                      onClick={() => removeAutoScheduleRow(index)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors border border-red-200 dark:border-red-800/50 cursor-pointer h-11 w-11 flex items-center justify-center"
                      title="Hapus baris"
                      aria-label="Hapus baris jadwal"
                    >
                      <Icons.close className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addAutoScheduleRow}
          className="mt-3 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 flex items-center gap-1 cursor-pointer"
        >
          <Icons.add className="w-4 h-4" /> Tambah Jadwal Lainnya
        </button>

        <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
          Sistem akan secara otomatis membuatkan jadwal hingga akhir
          bulan berdasarkan Tanggal yang Anda pilih pada baris di atas.
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !studentId}
        className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 cursor-pointer"
      >
        {isSubmitting ? "Memproses Data..." : "Jalankan Auto-Booking"}
      </button>
    </form>
  );
}
