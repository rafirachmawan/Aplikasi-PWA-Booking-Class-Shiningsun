"use client";

// Dipisahkan dari SchedulingClientWrapper.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Icons } from "@/components/ui/icons";
import { DatePickerInput } from "@/components/ui/DatePickerInput";

export interface StudentScheduleDetailModalProps {
  classes: any[];
  editModal: { isOpen: boolean; slotId: string; date: string; time: string; classId: string; label: string; };
  getRemainingSlots: (dateStr: string, time: string, classId: string) => any;
  handleEditBooking: (e: FormEvent) => Promise<void>;
  isEditing: boolean;
  openEditTimeDD: boolean;
  setEditModal: Dispatch<SetStateAction<{ isOpen: boolean; slotId: string; date: string; time: string; classId: string; label: string; }>>;
  setOpenEditTimeDD: Dispatch<SetStateAction<boolean>>;
  timeSlots: string[];
}

export function StudentScheduleDetailModal({
  classes,
  editModal,
  getRemainingSlots,
  handleEditBooking,
  isEditing,
  openEditTimeDD,
  setEditModal,
  setOpenEditTimeDD,
  timeSlots,
}: StudentScheduleDetailModalProps) {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-zinc-800 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 shrink-0">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="p-1.5 bg-brand-50 dark:bg-brand-500/15 rounded-lg text-brand-600 dark:text-brand-400">
              <Icons.edit className="w-5 h-5" />
            </span>
            Edit Jadwal
          </h3>
          <button
            onClick={() => setEditModal({ ...editModal, isOpen: false })}
            aria-label="Tutup"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Icons.close className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleEditBooking}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          <div className="mb-2 p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-800">
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1">
              Jadwal Lama
            </p>
            <p className="text-xs font-medium text-slate-700 dark:text-zinc-200">
              {editModal.label}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
              Pilih Tanggal Baru
            </label>
            <DatePickerInput
              required
              value={editModal.date}
              onChange={(e) =>
                setEditModal({ ...editModal, date: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
              Pilih Jam Sesi Baru
              {editModal.classId &&
                editModal.date &&
                editModal.time &&
                (() => {
                  const r = getRemainingSlots(
                    editModal.date,
                    editModal.time,
                    editModal.classId,
                  );
                  return r !== null ? (
                    <span className="text-brand-600 dark:text-brand-400 font-bold ml-1">
                      (Sisa {r})
                    </span>
                  ) : null;
                })()}
            </label>
            <div className="relative">
              <select
                required
                value={editModal.time}
                onChange={(e) =>
                  setEditModal({ ...editModal, time: e.target.value })
                }
                tabIndex={-1}
                aria-hidden="true"
                className="absolute opacity-0 pointer-events-none w-px h-px"
              >
                <option value="" disabled>
                  -- Pilih Jam --
                </option>
                {timeSlots.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setOpenEditTimeDD(!openEditTimeDD)}
                className={`w-full flex items-center justify-between gap-2 rounded-xl border bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white transition-colors cursor-pointer h-11 ${
                  openEditTimeDD
                    ? "border-brand-500 ring-2 ring-brand-500/30"
                    : "border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600"
                }`}
              >
                {editModal.time ? (
                  <span className="truncate text-left font-semibold">
                    {editModal.time} -{" "}
                    {String(
                      parseInt(editModal.time.split(":")[0], 10) + 1,
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
                    openEditTimeDD ? "rotate-180 text-brand-500" : ""
                  }`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {openEditTimeDD && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setOpenEditTimeDD(false)}
                  />
                  <div className="absolute left-0 top-full mt-1.5 z-50 min-w-56 w-full bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-1.5 space-y-1">
                    <div className="max-h-52 overflow-y-auto space-y-1">
                      {timeSlots.map((t) => {
                        const rem = editModal.classId
                          ? getRemainingSlots(
                              editModal.date,
                              t,
                              editModal.classId,
                            )
                          : null;
                        const isFull = rem !== null && rem <= 0;
                        const endHour = String(
                          parseInt(t.split(":")[0], 10) + 1,
                        ).padStart(2, "0");
                        const isSelected = editModal.time === t;

                        return (
                          <button
                            key={t}
                            type="button"
                            disabled={isFull}
                            onClick={() => {
                              setEditModal({ ...editModal, time: t });
                              setOpenEditTimeDD(false);
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

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
              Pilih Kelas Baru
            </label>
            <div className="relative">
              <select
                required
                value={editModal.classId}
                onChange={(e) =>
                  setEditModal({ ...editModal, classId: e.target.value })
                }
                className="appearance-none block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-zinc-900 dark:border-zinc-700 dark:text-white cursor-pointer"
              >
                <option value="" disabled>
                  -- Pilih Tipe Kelas --
                </option>
                {classes.map((c) => {
                  const rem =
                    editModal.date && editModal.time
                      ? getRemainingSlots(
                          editModal.date,
                          editModal.time,
                          c.id,
                        )
                      : null;
                  const labelText =
                    rem !== null
                      ? `${c.name} (Sisa ${rem}/${c.max_quota})`
                      : `${c.name} (Max: ${c.max_quota})`;
                  return (
                    <option
                      key={c.id}
                      value={c.id}
                      disabled={rem !== null && rem <= 0}
                    >
                      {labelText}
                    </option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg
                  className="h-4 w-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={
                isEditing ||
                !editModal.date ||
                !editModal.time ||
                !editModal.classId
              }
              className="w-full flex justify-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 cursor-pointer"
            >
              {isEditing ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
