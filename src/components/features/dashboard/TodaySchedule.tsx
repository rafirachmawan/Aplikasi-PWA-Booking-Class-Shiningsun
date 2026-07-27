"use client";

import { useState } from "react";
import { Icons } from "@/components/ui/icons";

const FIXED_TIMES = [
  { time: "08:00", range: "08 - 09" },
  { time: "09:00", range: "09 - 10" },
  { time: "11:00", range: "11 - 12" },
  { time: "13:00", range: "13 - 14" },
  { time: "14:00", range: "14 - 15" },
  { time: "16:00", range: "16 - 17" },
];

export function TodaySchedule({ slots, classes = [] }: { slots: any[], classes?: any[] }) {
  const [selectedClass, setSelectedClass] = useState<string>("ALL");

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const uniqueClasses = classes.length > 0
    ? classes.map(c => c.name).sort()
    : Array.from(new Set(slots.map(s => s.class.name))).sort();
  
  const activeSlots = slots.filter(s => s.bookings && s.bookings.length > 0);
  
  const filteredSlots = selectedClass === "ALL" 
    ? activeSlots 
    : activeSlots.filter(s => s.class.name === selectedClass);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5 bg-brand-50 dark:bg-brand-500/10">
            <Icons.calendar className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Jadwal Hari Ini</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{today}</p>
          </div>
        </div>
        
        {uniqueClasses.length > 0 && (
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="text-sm border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-1.5 focus:ring-brand-500 focus:border-brand-500 dark:text-white outline-none"
          >
            <option value="ALL">Semua Kelas</option>
            {uniqueClasses.map((className: any) => (
              <option key={className} value={className}>{className}</option>
            ))}
          </select>
        )}
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
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
                      const isFull = bookedCount >= slot.class.max_quota;
                      const isEmpty = bookedCount === 0;

                      return (
                        <div key={slot.id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{slot.class.name}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isFull ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                              : isEmpty ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                              : 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                            }`}>
                              {bookedCount}/{slot.class.max_quota}
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
  );
}
