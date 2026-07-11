"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ScheduleManagerDrawer } from "@/components/features/schedule/ScheduleManagerDrawer";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface ScheduleClientWrapperProps {
  schedules: any[];
  classes: any[];
  students: any[];
  currentMonth: number; // 1-12
  currentYear: number;
  activeBranchName?: string | null;
}

const FIXED_TIMES = [
  { time: "08:00", range: "08:00 - 09:00" },
  { time: "09:00", range: "09:00 - 10:00" },
  { time: "11:00", range: "11:00 - 12:00" },
  { time: "13:00", range: "13:00 - 14:00" },
  { time: "14:00", range: "14:00 - 15:00" },
  { time: "16:00", range: "16:00 - 17:00" },
];

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function getWeeksOfMonth(year: number, month: number) {
  const weeks: (Date | null)[][] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  let currentWeek: (Date | null)[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (currentWeek.length === 0) {
      const dow = date.getDay();
      for (let pad = 0; pad < dow; pad++) currentWeek.push(null);
    }
    currentWeek.push(date);
    if (date.getDay() === 6 || day === daysInMonth) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  return weeks;
}

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ScheduleClientWrapper({ schedules, classes, students, currentMonth, currentYear, activeBranchName }: ScheduleClientWrapperProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterClassId, setFilterClassId] = useState<string>(classes.length > 0 ? classes[0].id : "");
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [weekIndex, setWeekIndex] = useState(0);

  const weeks = useMemo(() => getWeeksOfMonth(currentYear, currentMonth), [currentYear, currentMonth]);

  useEffect(() => {
    setIsLoadingMonth(false);
    const today = new Date();
    if (today.getFullYear() === currentYear && today.getMonth() + 1 === currentMonth) {
      const idx = weeks.findIndex(w => w.some(d => d && d.getDate() === today.getDate()));
      setWeekIndex(idx >= 0 ? idx : 0);
    } else {
      setWeekIndex(0);
    }
  }, [currentMonth, currentYear, weeks]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setIsLoadingMonth(true);
    let newMonth = direction === 'next' ? currentMonth + 1 : currentMonth - 1;
    let newYear = currentYear;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    else if (newMonth < 1) { newMonth = 12; newYear--; }
    router.push(`?month=${newMonth}&year=${newYear}`);
  };

  const filteredSchedules = schedules.filter(s => s.class_id === filterClassId);
  const schedulesByDate: Record<string, any[]> = {};
  filteredSchedules.forEach(s => {
    if (!schedulesByDate[s.date]) schedulesByDate[s.date] = [];
    schedulesByDate[s.date].push(s);
  });

  const currentWeek = weeks[weekIndex] || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {isLoadingMonth && <LoadingSpinner usePortal={true} />}

      {/* Header Card - Unified Design */}
      <div className="rounded-3xl bg-brand-600 p-6 sm:p-10 shadow-lg relative overflow-hidden mb-6 sm:mb-8">
        {/* Abstract Background Decoration */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-400 opacity-20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight flex flex-wrap items-center gap-x-2">
              <span>Jadwal Keseluruhan</span>
              {activeBranchName && (
                <span className="text-brand-100 font-normal text-lg sm:text-xl lg:text-2xl whitespace-nowrap">
                  ({activeBranchName})
                </span>
              )}
            </h2>
            <p className="text-brand-100 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
              Lihat jadwal operasional seluruh kelas dan siswa bulan ini.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        {/* Controls */}
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 w-full">
          <div className="flex flex-col gap-1.5 w-full sm:w-auto">
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Filter Kelas</label>
            <div className="relative w-full sm:w-auto">
              <select
                value={filterClassId}
                onChange={(e) => setFilterClassId(e.target.value)}
                className="appearance-none w-full sm:w-48 bg-slate-50 dark:bg-slate-800 pl-4 pr-10 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer h-[42px]"
              >
                <option value="">-- Semua Kelas --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="flex flex-col gap-1.5 flex-1 sm:flex-none">
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Bulan</label>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 justify-center h-[42px]">
                <button onClick={() => navigateMonth('prev')} className="text-slate-400 hover:text-brand-600 transition-colors p-1" title="Bulan Sebelumnya">&larr;</button>
                <span className="font-semibold text-slate-900 dark:text-white text-sm whitespace-nowrap min-w-[70px] text-center">
                  {MONTH_NAMES[currentMonth - 1].substring(0, 3)} {currentYear}
                </span>
                <button onClick={() => navigateMonth('next')} className="text-slate-400 hover:text-brand-600 transition-colors p-1" title="Bulan Berikutnya">&rarr;</button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 flex-1 sm:flex-none">
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Minggu Ke</label>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 justify-center h-[42px]">
                <button
                  onClick={() => setWeekIndex(i => Math.max(0, i - 1))}
                  disabled={weekIndex === 0}
                  className="text-slate-400 hover:text-brand-600 disabled:opacity-30 transition-colors p-1"
                  title="Minggu Sebelumnya"
                >
                  &larr;
                </button>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[40px] text-center">
                  {weekIndex + 1} / {weeks.length}
                </span>
                <button
                  onClick={() => setWeekIndex(i => Math.min(weeks.length - 1, i + 1))}
                  disabled={weekIndex >= weeks.length - 1}
                  className="text-slate-400 hover:text-brand-600 disabled:opacity-30 transition-colors p-1"
                  title="Minggu Berikutnya"
                >
                  &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-900/5 sm:rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="w-[90px] px-2 py-2.5 text-[10px] lg:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center border-b border-r border-slate-200 dark:border-slate-700">
                  Jam
                </th>
                {currentWeek.map((date, colIdx) => {
                  const isValid = !!date;
                  const todayStr = isValid ? fmtDate(date!) : '';
                  const isToday = isValid && todayStr === fmtDate(new Date());
                  return (
                    <th
                      key={colIdx}
                      onClick={() => isValid && setSelectedDate(todayStr)}
                      className={`px-1 py-2.5 text-center border-b border-r last:border-r-0 border-slate-200 dark:border-slate-700 ${isValid ? 'cursor-pointer hover:bg-brand-50 dark:hover:bg-slate-800 transition-colors' : ''}`}
                    >
                      <div className={`text-[10px] lg:text-xs font-semibold uppercase tracking-wider ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {DAY_LABELS[colIdx]}
                      </div>
                      {isValid && (
                        <>
                          <div className={`mt-0.5 text-xs lg:text-sm font-bold ${isToday ? 'w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center mx-auto' : 'text-slate-700 dark:text-slate-300'}`}>
                            {date!.getDate()}
                          </div>
                          <div className={`text-[8px] lg:text-[10px] font-medium ${isToday ? 'text-brand-500 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            {MONTH_NAMES[date!.getMonth()].substring(0, 3)} {date!.getFullYear()}
                          </div>
                        </>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {FIXED_TIMES.map(({ time, range }) => (
                <tr key={time} className="border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                  <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-700 align-middle bg-slate-50/50 dark:bg-slate-800/30 ">
                    <span className="text-[10px] lg:text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {range}
                    </span>
                  </td>
                  {currentWeek.map((date, colIdx) => {
                    if (!date) return <td key={colIdx} className="border-r last:border-r-0 border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50"><div className="h-[72px]" /></td>;

                    const dateString = fmtDate(date);
                    const daySchedules = schedulesByDate[dateString] || [];
                    const slotsAtTime = daySchedules.filter((s: any) => s.time.startsWith(time));

                    return (
                      <td
                        key={colIdx}
                        onClick={() => setSelectedDate(dateString)}
                        className="px-1 py-1.5 border-r last:border-r-0 border-slate-100 dark:border-slate-800 align-top cursor-pointer hover:bg-brand-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <div className="h-[72px] overflow-y-auto">
                        {slotsAtTime.length === 0 ? (
                          <div className="text-center py-2 text-[9px] text-slate-300 dark:text-slate-600 font-medium italic">&mdash;</div>
                        ) : (
                          slotsAtTime.map((slot: any) => {
                            const bookedCount = slot.bookings?.length || 0;
                            const isFull = bookedCount >= slot.class.max_quota;
                            const isEmpty = bookedCount === 0;

                            const quotaColor = isFull
                              ? 'text-red-500 dark:text-red-400'
                              : isEmpty
                              ? 'text-slate-400 dark:text-slate-500'
                              : 'text-brand-600 dark:text-brand-400';

                            return (
                              <div key={slot.id} className="space-y-0.5">
                                <div className={`text-[8px] lg:text-[9px] font-semibold text-right ${quotaColor}`}>
                                  {isEmpty ? '' : `${bookedCount}/${slot.class.max_quota}`}
                                </div>
                                {isEmpty ? (
                                  <div className="text-center py-0.5 text-[9px] text-slate-300 dark:text-slate-600 italic">&mdash;</div>
                                ) : (
                                  slot.bookings.map((b: any) => {
                                    const hexColor = b.student?.label?.hex_color || '#94a3b8';
                                    return (
                                      <div
                                        key={b.student_id}
                                        className="px-1.5 py-0.5 text-[9px] lg:text-[10px] font-bold rounded text-slate-900 dark:text-slate-100 truncate leading-tight"
                                        style={{
                                          backgroundColor: `${hexColor}CC`,
                                          borderLeft: `4px solid ${hexColor}`
                                        }}
                                        title={`${b.student?.status === 'CG' ? '(CG) ' : ''}${b.student?.nickname || b.student?.name}`}
                                      >
                                        {b.student?.status === 'CG' && <span className="text-amber-800 dark:text-amber-300 font-extrabold mr-0.5">(CG)</span>}
                                        {b.student?.nickname || b.student?.name}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            );
                          })
                        )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDate && (
        <ScheduleManagerDrawer
          selectedDate={selectedDate}
          classes={classes}
          students={students}
          existingSlots={schedulesByDate[selectedDate] || []}
          defaultClassId={filterClassId}
          onClose={() => setSelectedDate(null)}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
