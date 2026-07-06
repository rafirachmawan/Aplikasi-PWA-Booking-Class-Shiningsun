"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ScheduleManagerDrawer } from "@/components/features/schedule/ScheduleManagerDrawer";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

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
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);

  useEffect(() => {
    setIsLoadingMonth(false);
  }, [currentMonth, currentYear]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setIsLoadingMonth(true);
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
      {isLoadingMonth && <LoadingSpinner usePortal={true} />}
      
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

      {/* Kalender Grid Wrapper untuk Mobile & Desktop */}
      <div className="bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-900/5 sm:rounded-xl overflow-hidden">
        <div className="overflow-x-auto lg:overflow-x-visible">
          <div className="min-w-full lg:min-w-[900px]">
            {/* Header Hari */}
            <div className="grid grid-cols-7 bg-slate-200 dark:bg-slate-800 gap-px border-b border-slate-200 dark:border-slate-800">
              {days.map((day) => (
                <div key={day} className="bg-slate-50 dark:bg-slate-900/50 py-2 lg:py-3 text-center text-[10px] lg:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Body Tanggal */}
            <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800">
              {/* Padding awal bulan */}
              {emptyPadding.map(pad => (
                <div key={`pad-start-${pad}`} className="bg-slate-50 dark:bg-slate-900 min-h-[60px] lg:min-h-[120px]"></div>
              ))}
              
              {dates.map((date) => {
                const dateString = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
                const daySchedules = schedulesByDate[dateString] || [];
                
                return (
                  <div 
                    key={date} 
                    onClick={() => setSelectedDate(dateString)}
                    className="bg-white dark:bg-slate-900 min-h-[60px] lg:min-h-[120px] p-1 lg:p-2 hover:bg-brand-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer relative"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-0 lg:gap-2 mb-1 lg:mb-2">
                      <span className="text-xs lg:text-sm font-bold w-6 h-6 lg:w-7 lg:h-7 flex mx-auto lg:mx-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 group-hover:bg-brand-100 group-hover:text-brand-700 dark:group-hover:bg-brand-900/30 transition-colors shrink-0">
                        {date}
                      </span>
                      <span className="block lg:inline text-[8px] lg:text-[10px] text-center lg:text-left font-medium text-slate-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors mt-0.5 lg:mt-0 leading-tight break-words">
                        {days[(firstDayOfMonth + date - 1) % 7]}, {date} {monthNames[currentMonth - 1].substring(0, 3)}
                      </span>
                    </div>

                    {/* Indikator Mobile (Hanya tampil di layar kecil) - Badge Jam & Kuota */}
                    <div className="flex lg:hidden flex-col gap-1 mt-2 w-full px-0.5 pb-1">
                      {["08:00", "09:00", "11:00", "13:00", "14:00", "16:00"].map(fixedTime => {
                        const slotsAtThisTime = daySchedules.filter(s => s.time.startsWith(fixedTime));
                        const shortTime = fixedTime === "08:00" ? "08-09" : fixedTime === "09:00" ? "09-10" : fixedTime === "11:00" ? "11-12" : fixedTime === "13:00" ? "13-14" : fixedTime === "14:00" ? "14-15" : "16-17";
                        
                        if (slotsAtThisTime.length === 0) {
                          return (
                            <div key={fixedTime} className="flex flex-col items-center justify-center w-full py-0.5 rounded-[4px] border border-b-2 shadow-sm text-[8px] font-bold leading-tight bg-slate-50 text-slate-400 border-slate-200/50 border-b-slate-200 dark:bg-slate-800/50 dark:text-slate-500 dark:border-slate-800 dark:border-b-slate-700/50 opacity-60">
                              <span>{shortTime}</span>
                              <span className="text-[7px] mt-[1px] font-medium italic opacity-70">-</span>
                            </div>
                          );
                        }

                        return slotsAtThisTime.map((slot, idx) => {
                          const bookedCount = slot.bookings?.length || 0;
                          const isFull = bookedCount >= slot.class.max_quota;
                          const isEmpty = bookedCount === 0;
                          
                          const badgeStyle = isFull 
                            ? 'bg-red-50 text-red-600 border-red-200/50 border-b-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30 dark:border-b-red-800'
                            : isEmpty
                            ? 'bg-slate-50 text-slate-400 border-slate-200/50 border-b-slate-200 dark:bg-slate-800/50 dark:text-slate-500 dark:border-slate-800 dark:border-b-slate-700/50 opacity-60'
                            : 'bg-brand-50 text-brand-700 border-brand-200/50 border-b-brand-300 dark:bg-brand-900/20 dark:text-brand-400 dark:border-brand-900/30 dark:border-b-brand-800';
                            
                          const textColor = isFull 
                            ? 'text-red-500 dark:text-red-500' 
                            : isEmpty 
                            ? 'font-medium italic opacity-70' 
                            : 'text-brand-500 dark:text-brand-500';

                          return (
                            <div key={`${fixedTime}-${idx}`} className={`flex flex-col items-center justify-center w-full py-0.5 rounded-[4px] border border-b-2 shadow-sm text-[8px] font-bold leading-tight ${badgeStyle}`}>
                              <span>{shortTime}</span>
                              <span className={`text-[7px] mt-[1px] ${textColor}`}>
                                {isEmpty ? '-' : `${bookedCount}/${slot.class.max_quota}`}
                              </span>
                            </div>
                          )
                        });
                      })}
                    </div>
                    
                    {/* Render Jadwal Items Berdasarkan Jam Paten (Hanya Desktop) */}
                    <div className="hidden lg:block mt-2 space-y-1">
                      {["08:00", "09:00", "11:00", "13:00", "14:00", "16:00"].map(fixedTime => {
                        // Cari apakah ada jadwal di jam ini (bisa lebih dari 1 jika "Semua Kelas")
                        const slotsAtThisTime = daySchedules.filter(s => s.time.startsWith(fixedTime));
                        const timeRange = fixedTime === "08:00" ? "08:00 - 09:00" : fixedTime === "09:00" ? "09:00 - 10:00" : fixedTime === "11:00" ? "11:00 - 12:00" : fixedTime === "13:00" ? "13:00 - 14:00" : fixedTime === "14:00" ? "14:00 - 15:00" : "16:00 - 17:00";
                        
                        if (slotsAtThisTime.length === 0) {
                          return (
                            <div key={fixedTime} className="flex flex-col rounded border border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900/40 overflow-hidden mb-1.5 shadow-sm group-hover:border-slate-200 dark:group-hover:border-slate-700 transition-colors">
                              <div className="px-1.5 py-1 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/60 flex justify-between items-center group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
                                 <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{timeRange}</span>
                              </div>
                              <div className="px-1.5 py-1.5 text-center text-[9px] text-slate-300 dark:text-slate-600 font-medium italic">
                                 -- Kosong --
                              </div>
                            </div>
                          );
                        }

                        return slotsAtThisTime.map(slot => {
                          const bookedCount = slot.bookings?.length || 0;
                          const isFull = bookedCount >= slot.class.max_quota;
                          const isEmpty = bookedCount === 0;
                          
                          const cardStyle = isFull 
                            ? 'border-red-200 dark:border-red-900/30' 
                            : isEmpty 
                            ? 'border-slate-100 dark:border-slate-800/60' 
                            : 'border-brand-200 dark:border-brand-900/30';
                            
                          const headerStyle = isFull 
                            ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/30' 
                            : isEmpty 
                            ? 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-800/60' 
                            : 'bg-brand-50 border-brand-100 dark:bg-brand-900/20 dark:border-brand-900/30';
                            
                          const titleStyle = isFull 
                            ? 'text-red-700 dark:text-red-500' 
                            : isEmpty 
                            ? 'text-slate-500 dark:text-slate-400' 
                            : 'text-brand-700 dark:text-brand-400';
                            
                          const quotaStyle = isFull 
                            ? 'text-red-600 dark:text-red-500' 
                            : isEmpty 
                            ? 'text-slate-400 dark:text-slate-500' 
                            : 'text-brand-600 dark:text-brand-400';

                          return (
                            <div key={slot.id} className={`flex flex-col rounded border ${cardStyle} bg-white dark:bg-slate-900/40 overflow-hidden mb-1.5 shadow-sm`}>
                              <div className={`px-1.5 py-1 flex justify-between items-center border-b ${headerStyle}`}>
                                <span className={`text-[10px] font-bold ${titleStyle}`}>
                                  {timeRange}
                                </span>
                                <span className={`text-[9px] font-semibold ${quotaStyle}`}>
                                  {isEmpty ? '-- Kosong --' : `${bookedCount}/${slot.class.max_quota}`}
                                </span>
                              </div>
                              
                              <div className="p-1 space-y-1 bg-white dark:bg-slate-900/50">
                                {bookedCount === 0 ? (
                                  <div className="text-center py-1 text-[9px] text-slate-400 font-medium italic">
                                    Belum ada siswa
                                  </div>
                                ) : (
                                  slot.bookings.map((b: any) => {
                                    const hexColor = b.student?.label?.hex_color || '#94a3b8';
                                    return (
                                      <div 
                                        key={b.student_id}
                                        className="px-1.5 py-1 text-[9px] sm:text-[10px] font-medium rounded text-slate-700 dark:text-slate-200 truncate leading-tight shadow-sm"
                                        style={{ 
                                          backgroundColor: `${hexColor}15`, 
                                          borderLeft: `2px solid ${hexColor}` 
                                        }}
                                        title={`${b.student?.status === 'CG' ? '(CG) ' : ''}${b.student?.name}`}
                                      >
                                        {b.student?.status === 'CG' && <span className="text-amber-600 dark:text-amber-500 font-bold mr-0.5">(CG)</span>}
                                        {b.student?.name}
                                      </div>
                                    )
                                  })
                                )}
                              </div>
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
                <div key={`pad-end-${i}`} className="bg-slate-50 dark:bg-slate-900 min-h-[60px] lg:min-h-[120px]"></div>
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
