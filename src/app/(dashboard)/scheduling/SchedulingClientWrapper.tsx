"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import { autoBookStudentToClass, bookStudentManual } from "@/lib/actions";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface SchedulingClientWrapperProps {
  students: any[];
  classes: any[];
  schedules: any[];
  currentMonth: number;
  currentYear: number;
}

export function SchedulingClientWrapper({ students, classes, schedules, currentMonth, currentYear }: SchedulingClientWrapperProps) {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<"auto" | "manual">("auto");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentId, setStudentId] = useState("");
  
  // Custom Modal State
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, type: 'success' | 'error' | 'warning', message: string}>({isOpen: false, type: 'success', message: ''});
  
  const showAlert = (type: 'success' | 'error' | 'warning', message: string) => {
    setModalConfig({ isOpen: true, type, message });
  };
  
  // Auto Mode State
  const [autoSchedules, setAutoSchedules] = useState([{ startDate: new Date().toISOString().split('T')[0], time: "08:00", classId: "" }]);

  // Manual Mode State
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState("08:00");
  const [manualClassId, setManualClassId] = useState("");

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const daysOfWeek = [
    { value: 1, label: "Senin" },
    { value: 2, label: "Selasa" },
    { value: 3, label: "Rabu" },
    { value: 4, label: "Kamis" },
    { value: 5, label: "Jumat" },
    { value: 6, label: "Sabtu" },
    { value: 0, label: "Minggu" }
  ];
  
  const timeSlots = ["08:00", "09:00", "11:00", "13:00", "15:00", "16:00"];

  const handleAutoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;
    
    // Validasi
    const isValid = autoSchedules.every(s => s.classId !== "");
    if (!isValid) {
      showAlert('warning', "Harap lengkapi pilihan kelas untuk semua jadwal.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      let totalBooked = 0;
      for (const schedule of autoSchedules) {
        const bookedCount = await autoBookStudentToClass(
          studentId, 
          schedule.classId, 
          schedule.startDate,
          schedule.time
        );
        totalBooked += bookedCount;
      }
      
      if (totalBooked === 0) {
        showAlert('warning', "Tidak ada jadwal baru yang ditambahkan (Siswa sudah terdaftar di sesi tersebut, atau kelas sudah penuh).");
      } else {
        showAlert('success', `Berhasil! Siswa telah didaftarkan ke total ${totalBooked} sesi kelas baru.`);
        setStudentId("");
        setAutoSchedules([{ startDate: new Date().toISOString().split('T')[0], time: "08:00", classId: "" }]);
      }
      router.refresh();
    } catch (error: any) {
      showAlert('error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addAutoScheduleRow = () => {
    setAutoSchedules([...autoSchedules, { startDate: new Date().toISOString().split('T')[0], time: "08:00", classId: "" }]);
  };

  const removeAutoScheduleRow = (index: number) => {
    if (autoSchedules.length > 1) {
      const newSchedules = [...autoSchedules];
      newSchedules.splice(index, 1);
      setAutoSchedules(newSchedules);
    }
  };

  const updateAutoSchedule = (index: number, field: string, value: any) => {
    const newSchedules = [...autoSchedules];
    (newSchedules[index] as any)[field] = value;
    setAutoSchedules(newSchedules);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !manualClassId || !manualDate || !manualTime) return;

    setIsSubmitting(true);
    try {
      await bookStudentManual(studentId, manualClassId, manualDate, manualTime);
      showAlert('success', "Siswa berhasil didaftarkan ke sesi tersebut!");
      setStudentId("");
      router.refresh();
    } catch (error: any) {
      showAlert('error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter schedules that are valid for manual booking (not full, not locked)
  const validSchedules = schedules.filter(slot => {
    const bookedCount = slot.bookings?.length || 0;
    const isFull = bookedCount >= (slot.class?.max_quota || 0);
    return !slot.is_locked && !isFull;
  });

  return (
    <>
    {isSubmitting && <LoadingSpinner usePortal={true} />}
    
    <div className="bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-900/5 sm:rounded-xl overflow-hidden">
      
      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex">
        <button
          onClick={() => setActiveMode("auto")}
          className={`flex-1 py-4 text-sm font-semibold transition-colors border-b-2 ${
            activeMode === "auto" 
              ? "border-brand-500 text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-900" 
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Otomatis (Bulanan)
        </button>
        <button
          onClick={() => setActiveMode("manual")}
          className={`flex-1 py-4 text-sm font-semibold transition-colors border-b-2 ${
            activeMode === "manual" 
              ? "border-brand-500 text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-900" 
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Manual (Pilih 1 Sesi)
        </button>
      </div>

      <div className="p-6">
        {/* Global Student Selector */}
        <div className="mb-8 p-4 bg-brand-50 dark:bg-brand-500/10 rounded-xl border border-brand-100 dark:border-brand-500/20">
          <label className="block text-sm font-semibold text-brand-900 dark:text-brand-100 mb-2">
            Langkah 1: Pilih Siswa
          </label>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="block w-full rounded-xl border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
          >
            <option value="" disabled>-- Cari dan Pilih Siswa --</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.status === 'REGISTERED' ? 'Reguler' : 'CG'})</option>
            ))}
          </select>

          {/* Tampilkan Jadwal Siswa yang Terdaftar */}
          {studentId && (
            <div className="mt-4 pt-4 border-t border-brand-200 dark:border-brand-500/30">
              <h4 className="text-sm font-medium text-brand-800 dark:text-brand-200 mb-2">
                Jadwal Terdaftar (Bulan {monthNames[currentMonth - 1]}):
              </h4>
              {(() => {
                const studentSchedules = schedules.filter(s => s.bookings?.some((b: any) => b.student_id === studentId));
                
                if (studentSchedules.length === 0) {
                  return <p className="text-xs text-brand-600/70 dark:text-brand-300/70 italic">Belum ada jadwal untuk siswa ini di bulan {monthNames[currentMonth - 1]}.</p>;
                }
                
                return (
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {studentSchedules.map(slot => {
                      const dateObj = new Date(slot.date);
                      const hari = isNaN(dateObj.getTime()) ? "" : ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][dateObj.getDay()];
                      const tgl = isNaN(dateObj.getTime()) ? "" : dateObj.getDate();
                      
                      return (
                        <div key={slot.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-brand-200 dark:border-brand-500/30 shadow-sm">
                          <Icons.calendar className="w-3 h-3 text-brand-500" />
                          <span>{hari}, {tgl} {monthNames[currentMonth - 1]}</span>
                          <span className="text-slate-300 mx-0.5">|</span>
                          <span className="text-brand-600 dark:text-brand-400">{slot.time.substring(0,5)}</span>
                          <span className="text-slate-300 mx-0.5">|</span>
                          <span className="font-semibold">{slot.class?.name}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {activeMode === "auto" ? (
          <form onSubmit={handleAutoSubmit} className="space-y-6 animate-in slide-in-from-left-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="space-y-3 mt-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Pilih Jadwal Rutin</label>
                {autoSchedules.map((schedule, index) => {
                  // Helper untuk menampilkan hari dari tanggal
                  const dateObj = new Date(schedule.startDate);
                  const hari = isNaN(dateObj.getTime()) ? "" : ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][dateObj.getDay()];

                  return (
                    <div key={index} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex-1 min-w-[150px]">
                        <div className="flex items-center justify-between mb-1.5 px-1">
                          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tanggal</label>
                          {hari && <span className="text-[10px] font-bold text-brand-700 dark:text-brand-400 bg-brand-100 dark:bg-brand-900/30 px-2 py-0.5 rounded shadow-sm">{hari}</span>}
                        </div>
                        <input
                          type="date"
                          required
                          value={schedule.startDate}
                          onChange={(e) => updateAutoSchedule(index, 'startDate', e.target.value)}
                          className="block w-full rounded-xl border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                        />
                      </div>
                      
                      <select
                        value={schedule.time}
                        onChange={(e) => updateAutoSchedule(index, 'time', e.target.value)}
                        className="block flex-1 min-w-[120px] rounded-xl border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                      >
                        {timeSlots.map(t => (
                          <option key={t} value={t}>{t} - {String(parseInt(t) + 1).padStart(2, '0')}:00 WIB</option>
                        ))}
                      </select>

                      <select
                        required
                        value={schedule.classId}
                        onChange={(e) => updateAutoSchedule(index, 'classId', e.target.value)}
                        className="block flex-[2] min-w-[150px] rounded-xl border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                      >
                        <option value="" disabled>-- Pilih Tipe Kelas --</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name} (Max: {c.max_quota})</option>
                        ))}
                      </select>

                      {autoSchedules.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeAutoScheduleRow(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                          title="Hapus Jadwal"
                        >
                          <Icons.close className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <button
                type="button"
                onClick={addAutoScheduleRow}
                className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <Icons.add className="w-4 h-4" /> Tambah Jadwal Lainnya
              </button>
              
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                Sistem akan secara otomatis membuatkan jadwal selama 1 bulan mulai dari setiap Tanggal yang Anda pilih pada baris di atas.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !studentId}
              className="w-full flex justify-center py-3 px-4 rounded-xl shadow-sm text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
            >
              {isSubmitting ? "Memproses Data..." : "Jalankan Auto-Booking"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-6 animate-in slide-in-from-right-4">
             <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Icons.calendar className="w-4 h-4" /> Langkah 2: Pilih Sesi Manual
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  {(() => {
                    const d = new Date(manualDate);
                    const manualHari = isNaN(d.getTime()) ? "" : ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][d.getDay()];
                    return (
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tanggal</label>
                        {manualHari && <span className="text-[11px] font-bold text-brand-700 dark:text-brand-400 bg-brand-100 dark:bg-brand-900/30 px-2.5 py-0.5 rounded-md shadow-sm">{manualHari}</span>}
                      </div>
                    );
                  })()}
                  <input
                    required
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="block w-full rounded-xl border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Pilih Jam</label>
                  <select
                    required
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="block w-full rounded-xl border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                  >
                    <option value="" disabled>-- Pilih Jam --</option>
                    {timeSlots.map(t => (
                      <option key={t} value={t}>{t} - {String(parseInt(t) + 1).padStart(2, '0')}:00 WIB</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Pilih Kelas</label>
                  <select
                    required
                    value={manualClassId}
                    onChange={(e) => setManualClassId(e.target.value)}
                    className="block w-full rounded-xl border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                  >
                    <option value="" disabled>-- Pilih Tipe Kelas --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name} (Max: {c.max_quota})</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Sistem akan secara otomatis membuatkan kotak jadwal di kalender jika belum ada, lalu mendaftarkan siswa ke kelas tersebut.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !studentId || !manualClassId}
              className="w-full flex justify-center py-3 px-4 rounded-xl shadow-sm text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              {isSubmitting ? "Memproses Data..." : "Booking Sesi Ini"}
            </button>
          </form>
        )}
      </div>
    </div>

    {/* Custom Notification Modal */}
    {modalConfig.isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
          <div className="p-6 text-center">
            {modalConfig.type === 'success' && (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/10 mb-4">
                <svg className="h-7 w-7 text-emerald-600 dark:text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            )}
            {modalConfig.type === 'warning' && (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/10 mb-4">
                <svg className="h-7 w-7 text-amber-600 dark:text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            )}
            {modalConfig.type === 'error' && (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10 mb-4">
                <svg className="h-7 w-7 text-red-600 dark:text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {modalConfig.type === 'success' ? 'Berhasil!' : modalConfig.type === 'warning' ? 'Perhatian' : 'Terjadi Kesalahan'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {modalConfig.message}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4">
            <button
              onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
              className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors shadow-sm"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
