"use client";

import { useState } from "react";
import { Icons } from "@/components/ui/icons";
import { getSchedulesByDate } from "@/lib/actions";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ChangeLabelModal } from "@/components/features/students/ChangeLabelModal";
import { formatFullIndonesianDate as formatIndonesianDate, formatNumericDate } from "@/lib/dateUtils";

const FIXED_TIMES = [
  { time: "08:00", range: "08 - 09" },
  { time: "09:00", range: "09 - 10" },
  { time: "10:00", range: "10 - 11" },
  { time: "11:00", range: "11 - 12" },
  { time: "13:00", range: "13 - 14" },
  { time: "14:00", range: "14 - 15" },
  { time: "15:00", range: "15 - 16" },
  { time: "16:00", range: "16 - 17" },
];

function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function TodaySchedule({
  slots: initialSlots,
  classes = [],
}: {
  slots: any[];
  classes?: any[];
}) {
  const todayStr = getTodayStr();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [currentSlots, setCurrentSlots] = useState<any[]>(initialSlots);
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [labelsList, setLabelsList] = useState<any[]>([]);

  const isToday = selectedDate === todayStr;

  const handleStudentClick = async (student: any) => {
    setEditingStudent(student);
    if (labelsList.length === 0) {
      const { getLabels } = await import("@/lib/actions");
      const lbls = await getLabels();
      setLabelsList(lbls);
    }
  };

  const handleDateChange = async (newDateStr: string) => {
    setSelectedDate(newDateStr);
    setIsLoading(true);
    try {
      const data = await getSchedulesByDate(newDateStr);
      setCurrentSlots(data);
    } catch (err) {
      console.error("Gagal mengambil jadwal:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevDay = () => {
    const parts = selectedDate.split("-");
    const d = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2]),
    );
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    handleDateChange(`${y}-${m}-${day}`);
  };

  const handleNextDay = () => {
    const parts = selectedDate.split("-");
    const d = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2]),
    );
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    handleDateChange(`${y}-${m}-${day}`);
  };

  const uniqueClasses =
    classes.length > 0
      ? classes.map((c) => c.name).sort()
      : Array.from(new Set(currentSlots.map((s) => s.class?.name)))
          .filter(Boolean)
          .sort();

  const activeSlots = currentSlots.filter(
    (s) => s.bookings && s.bookings.length > 0,
  );

  const filteredSlots =
    selectedClass === "ALL"
      ? activeSlots
      : activeSlots.filter((s) => s.class?.name === selectedClass);

  return (
    <>
      {isLoading && <LoadingSpinner usePortal={true} />}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md shadow-slate-200/50 dark:shadow-slate-900/50 overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl p-2.5 bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-md shadow-brand-500/20 shrink-0">
              <Icons.calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {isToday ? "Jadwal Hari Ini" : "Jadwal Kelas"}
                </h3>
                {isToday ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 shrink-0">
                    Hari Ini
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDateChange(todayStr)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-500/20 dark:text-brand-400 transition-colors cursor-pointer shrink-0"
                  >
                    Kembali ke Hari Ini
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {formatIndonesianDate(selectedDate)}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            {/* Date Selector Navigation */}
            <div className="flex items-center justify-between sm:justify-start rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1 shadow-sm flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={handlePrevDay}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                title="Hari Sebelumnya"
              >
                <Icons.chevronLeft className="h-4 w-4" />
              </button>

              <div className="relative inline-flex items-center mx-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 px-2 py-0.5 text-center flex items-center gap-1.5 pointer-events-none">
                  {formatNumericDate(selectedDate)}
                  <Icons.calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) =>
                    e.target.value && handleDateChange(e.target.value)
                  }
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={handleNextDay}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                title="Hari Berikutnya"
              >
                <Icons.chevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Class Selector Dropdown */}
            {uniqueClasses.length > 0 && (
              <div className="relative w-full sm:w-auto">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="appearance-none text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl pl-3.5 pr-8 py-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none cursor-pointer shadow-sm w-full sm:w-auto transition-all"
                >
                  <option value="ALL">Semua Kelas</option>
                  {uniqueClasses.map((className: any) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                  <Icons.chevronDown className="h-4 w-4" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          className={`divide-y-2 divide-slate-200 dark:divide-slate-700 border-t border-slate-200 dark:border-slate-700 transition-opacity duration-200 ${isLoading ? "opacity-50 pointer-events-none" : "opacity-100"}`}
        >
          {FIXED_TIMES.map(({ time, range }) => {
            const slotsAtTime = filteredSlots.filter((s) =>
              s.time.startsWith(time),
            );

            return (
              <div key={time} className="flex min-h-[56px]">
                <div className="w-[80px] shrink-0 px-3 py-3 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 border-r-2 border-slate-300 dark:border-slate-600">
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                    {range}
                  </span>
                </div>
                <div className="flex-1 p-3 flex items-center">
                  {slotsAtTime.length === 0 ? (
                    <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                      Tidak ada kelas
                    </span>
                  ) : (
                    <div className="w-full space-y-3">
                      {slotsAtTime.map((slot: any, idx: number) => {
                        const bookedCount = slot.bookings?.length || 0;
                        const isFull =
                          bookedCount >= (slot.class?.max_quota || 4);
                        const isEmpty = bookedCount === 0;

                        return (
                          <div
                            key={slot.id}
                            className={
                              idx > 0
                                ? "pt-3 border-t border-slate-200 dark:border-slate-700/80"
                                : ""
                            }
                          >
                            <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-200 dark:border-slate-700/60">
                              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-brand-500 inline-block"></span>
                                {slot.class?.name}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                  isFull
                                    ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50"
                                    : isEmpty
                                      ? "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700"
                                      : "bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/40 dark:text-brand-300 dark:border-brand-800/50"
                                }`}
                              >
                                {bookedCount}/{slot.class?.max_quota || 4}
                              </span>
                            </div>
                            {isEmpty ? (
                              <p className="text-[10px] text-slate-400 italic pl-1">
                                Belum ada siswa
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 pl-0.5">
                                {slot.bookings.map((b: any) => {
                                  const hex =
                                    b.student?.label?.hex_color || "#94a3b8";
                                  return (
                                    <button
                                      key={b.student_id}
                                      type="button"
                                      onClick={() => handleStudentClick({ ...b.student, id: b.student_id })}
                                      title="Klik untuk ganti level siswa"
                                      className="inline-flex items-center px-2 py-1 text-[11px] font-bold rounded-md text-slate-900 dark:text-slate-100 truncate max-w-[160px] shadow-xs border border-slate-300/80 dark:border-slate-600 cursor-pointer hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all group"
                                      style={{
                                        backgroundColor: `${hex}DD`,
                                        borderLeft: `4px solid ${hex}`,
                                      }}
                                    >
                                      {b.student?.status === "CG" && (
                                        <span className="text-amber-900 dark:text-amber-200 font-extrabold mr-1">
                                          (CG)
                                        </span>
                                      )}
                                      <span>{b.student?.nickname || b.student?.name}</span>
                                      <Icons.edit className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-700 dark:text-slate-200 shrink-0" />
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ChangeLabelModal
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        student={editingStudent}
        labels={labelsList}
        onSuccess={async () => {
          const data = await getSchedulesByDate(selectedDate);
          setCurrentSlots(data);
        }}
      />
    </>
  );
}
