"use client";

import { useState } from "react";
import { Icons } from "@/components/ui/icons";
import { getSchedulesByDate } from "@/lib/actions";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

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

function formatIndonesianDate(dateStr: string) {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function TodaySchedule({ slots: initialSlots, classes = [] }: { slots: any[], classes?: any[] }) {
  const todayStr = getTodayStr();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [currentSlots, setCurrentSlots] = useState<any[]>(initialSlots);
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isToday = selectedDate === todayStr;

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
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    handleDateChange(`${y}-${m}-${day}`);
  };

  const handleNextDay = () => {
    const parts = selectedDate.split("-");
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    handleDateChange(`${y}-${m}-${day}`);
  };

  const uniqueClasses = classes.length > 0
    ? classes.map(c => c.name).sort()
    : Array.from(new Set(currentSlots.map(s => s.class?.name))).filter(Boolean).sort();
  
  const activeSlots = currentSlots.filter(s => s.bookings && s.bookings.length > 0);
  
  const filteredSlots = selectedClass === "ALL" 
    ? activeSlots 
    : activeSlots.filter(s => s.class?.name === selectedClass);

  return (
    <>
      {isLoading && <LoadingSpinner usePortal={true} />}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5 bg-brand-50 dark:bg-brand-500/10 shrink-0">
            <Icons.calendar className="h-5 w-5 text-brand-600 dark:text-brand-400" />
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

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && handleDateChange(e.target.value)}
              className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-transparent px-2 py-0.5 border-none outline-none cursor-pointer text-center sm:text-left [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 dark:[&::-webkit-calendar-picker-indicator]:invert"
            />

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
                  <option key={className} value={className}>{className}</option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                <Icons.chevronDown className="h-4 w-4" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`divide-y divide-slate-100 dark:divide-slate-800 transition-opacity duration-200 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {FIXED_TIMES.map(({ time, range }) => {
          const slotsAtTime = filteredSlots.filter(s => s.time.startsWith(time));

          return (
            <div key={time} className="flex">
              <div className="w-[70px] shrink-0 px-3 py-3 flex items-center justify-center bg-slate-50/50 dark:bg-slate-800/30 border-r border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{range}</span>
              </div>
              <div className="flex-1 px-3 py-2.5 min-h-[48px] flex items-center">
                {slotsAtTime.length === 0 ? (
                  <span className="text-xs text-slate-300 dark:text-slate-600 italic">Tidak ada kelas</span>
                ) : (
                  <div className="space-y-1.5 w-full">
                    {slotsAtTime.map((slot: any) => {
                      const bookedCount = slot.bookings?.length || 0;
                      const isFull = bookedCount >= (slot.class?.max_quota || 4);
                      const isEmpty = bookedCount === 0;

                      return (
                        <div key={slot.id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{slot.class?.name}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isFull ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                              : isEmpty ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                              : 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                            }`}>
                              {bookedCount}/{slot.class?.max_quota || 4}
                            </span>
                          </div>
                          {isEmpty ? (
                            <p className="text-[10px] text-slate-400 italic">Belum ada siswa</p>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {slot.bookings.map((b: any) => {
                                const hex = b.student?.label?.hex_color || '#94a3b8';
                                return (
                                  <span
                                    key={b.student_id}
                                    className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded text-slate-900 dark:text-slate-100 truncate max-w-[140px]"
                                    style={{ backgroundColor: `${hex}CC`, borderLeft: `4px solid ${hex}` }}
                                  >
                                    {b.student?.status === 'CG' && <span className="text-amber-800 dark:text-amber-300 font-extrabold mr-0.5">(CG)</span>}
                                    {b.student?.nickname || b.student?.name}
                                  </span>
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
    </>
  );
}
