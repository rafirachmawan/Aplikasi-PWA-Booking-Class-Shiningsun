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
  const [filterClassId, setFilterClassId] = useState<string>(classes.length > 0 ? classes[0].id : "");

  const navigateMonth = (direction: 'prev' | 'next') => {
    let newMonth = direction === 'next' ? currentMonth + 1 : currentMonth - 1;
    let newYear = currentYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    router.push(`?month=${newMonth}&year=${newYear}`);
  };

  // Helper kalender dasar
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();
  
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyPadding = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  // Group schedules by date string
  const filteredSchedules = schedules.filter(s => s.class_id === filterClassId);

  const schedulesByDate: Record<string, any[]> = {};
  filteredSchedules.forEach(s => {
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
        
        <div className="flex items-center gap-3">
          <select 
            value={filterClassId} 
            onChange={(e) => setFilterClassId(e.target.value)}
            className="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="" disabled>-- Pilih Kelas --</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-4 bg-white dark:bg-slate-900 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
            <button onClick={() => navigateMonth('prev')} className="text-slate-400 hover:text-brand-600 transition-colors">&larr;</button>
            <span className="font-semibold text-slate-900 dark:text-white min-w-[120px] text-center text-sm">
              {monthNames[currentMonth - 1]} {currentYear}
            </span>
            <button onClick={() => navigateMonth('next')} className="text-slate-400 hover:text-brand-600 transition-colors">&rarr;</button>
          </div>
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
                    
                    {/* Render Jadwal Items Berdasarkan Jam Paten */}
                    <div className="mt-2 space-y-1">
                      {["08:00", "09:00", "11:00", "13:00", "15:00", "16:00"].map(fixedTime => {
                        // Cari apakah ada jadwal di jam ini (bisa lebih dari 1 jika "Semua Kelas")
                        const slotsAtThisTime = daySchedules.filter(s => s.time.startsWith(fixedTime));
                        
                        if (slotsAtThisTime.length === 0) {
                          return (
                            <div key={fixedTime} className="px-2 py-1 text-[10px] sm:text-xs font-medium rounded border border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-600 truncate">
                              {fixedTime} - Kosong
                            </div>
                          );
                        }

                        return slotsAtThisTime.map(slot => {
                          const bookedCount = slot.bookings?.length || 0;
                          const isFull = bookedCount >= slot.class.max_quota;

                          return (
                            <div key={slot.id} className="space-y-1 mb-2">
                              <div className="flex justify-between items-center px-1">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{slot.time.substring(0, 5)}</span>
                                <span className={`text-[9px] font-semibold ${isFull ? 'text-red-500' : 'text-slate-400'}`}>{bookedCount}/{slot.class.max_quota}</span>
                              </div>
                              
                              {bookedCount === 0 ? (
                                <div className="px-2 py-1 text-[10px] font-medium rounded border border-dashed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800/50 truncate text-center">
                                  Kosong
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {slot.bookings.map((b: any) => {
                                    const hexColor = b.student?.label?.hex_color || '#94a3b8'; // Default color if no label
                                    return (
                                      <div 
                                        key={b.student_id}
                                        className="px-1.5 py-1 text-[10px] font-medium rounded-r-md border-y border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 truncate shadow-sm"
                                        style={{ 
                                          backgroundColor: `${hexColor}15`, 
                                          borderLeft: `3px solid ${hexColor}` 
                                        }}
                                        title={`${b.student?.status === 'CG' ? '(CG) ' : ''}${b.student?.name}`}
                                      >
                                        {b.student?.status === 'CG' && <span className="text-amber-600 dark:text-amber-500 font-bold mr-1">(CG)</span>}
                                        {b.student?.name}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        });
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
