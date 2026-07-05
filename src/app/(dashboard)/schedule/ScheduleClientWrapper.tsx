"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScheduleManagerDrawer } from "@/components/features/schedule/ScheduleManagerDrawer";

interface ScheduleClientWrapperProps {
  schedules: any[];
  classes: any[];
  students: any[];
  currentMonth: number; // 1-12
  currentYear: number;
}

export function ScheduleClientWrapper({ schedules, classes, students, currentMonth, currentYear }: ScheduleClientWrapperProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Helper kalender dasar
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();
  
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyPadding = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  // Group schedules by date string
  const schedulesByDate: Record<string, any[]> = {};
  schedules.forEach(s => {
    if (!schedulesByDate[s.date]) {
      schedulesByDate[s.date] = [];
    }
    schedulesByDate[s.date].push(s);
  });

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-slate-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
            Matriks Kalender Jadwal
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pilih tanggal untuk mengelola jadwal kelas atau booking siswa.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
          <button className="text-slate-400 hover:text-slate-600 transition-colors">&larr;</button>
          <span className="font-semibold text-slate-900 dark:text-white min-w-[120px] text-center">
            {monthNames[currentMonth - 1]} {currentYear}
          </span>
          <button className="text-slate-400 hover:text-slate-600 transition-colors">&rarr;</button>
        </div>
      </div>

      {/* Kalender Grid Wrapper untuk Mobile */}
      <div className="bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-900/5 sm:rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Header Hari */}
            <div className="grid grid-cols-7 bg-slate-200 dark:bg-slate-800 gap-px border-b border-slate-200 dark:border-slate-800">
              {days.map((day) => (
                <div key={day} className="bg-slate-50 dark:bg-slate-900/50 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Body Tanggal */}
            <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800">
              {/* Padding awal bulan */}
              {emptyPadding.map(pad => (
                <div key={`pad-start-${pad}`} className="bg-slate-50 dark:bg-slate-900 min-h-[120px]"></div>
              ))}
              
              {dates.map((date) => {
                const dateString = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
                const daySchedules = schedulesByDate[dateString] || [];
                
                return (
                  <div 
                    key={date} 
                    onClick={() => setSelectedDate(dateString)}
                    className="bg-white dark:bg-slate-900 min-h-[120px] p-2 hover:bg-brand-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer relative"
                  >
                    <span className="text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full text-slate-700 dark:text-slate-300 group-hover:bg-brand-100 group-hover:text-brand-700 dark:group-hover:bg-slate-700">
                      {date}
                    </span>
                    
                    {/* Render Jadwal Items */}
                    <div className="mt-2 space-y-1">
                      {daySchedules.map(slot => {
                        const bookedCount = slot.bookings?.length || 0;
                        const isFull = bookedCount >= slot.class.max_quota;

                        let badgeColor = "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30";
                        if (slot.is_locked) badgeColor = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
                        else if (isFull) badgeColor = "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30";

                        return (
                          <div 
                            key={slot.id} 
                            className={`px-2 py-1 text-[10px] sm:text-xs font-medium rounded border truncate ${badgeColor}`}
                            title={`${slot.class.name} (${bookedCount}/${slot.class.max_quota})`}
                          >
                            {slot.time.substring(0, 5)} {slot.class.name}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              
              {/* Padding akhir bulan */}
              {Array.from({ length: (7 - ((dates.length + emptyPadding.length) % 7)) % 7 }).map((_, i) => (
                <div key={`pad-end-${i}`} className="bg-slate-50 dark:bg-slate-900 min-h-[120px]"></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedDate && (
        <ScheduleManagerDrawer 
          selectedDate={selectedDate}
          classes={classes}
          students={students}
          existingSlots={schedulesByDate[selectedDate] || []}
          onClose={() => setSelectedDate(null)}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
