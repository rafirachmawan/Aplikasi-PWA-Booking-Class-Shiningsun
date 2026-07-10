"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import { autoBookStudentToClass, bookStudentManual, removeStudentBooking } from "@/lib/actions";
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
  
  // Custom Student Dropdown States
  const [isOpenStudentDropdown, setIsOpenStudentDropdown] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const studentDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside for student dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target as Node)) {
        setIsOpenStudentDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Custom Modal State
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, type: 'success' | 'error' | 'warning', message: string}>({isOpen: false, type: 'success', message: ''});
  
  const showAlert = (type: 'success' | 'error' | 'warning', message: string) => {
    setModalConfig({ isOpen: true, type, message });
  };

  // Delete Booking Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{isOpen: boolean, slotId: string, studentId: string, label: string}>({isOpen: false, slotId: '', studentId: '', label: ''});
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteBooking = async () => {
    if (!deleteConfirm.slotId || !deleteConfirm.studentId) return;
    setIsDeleting(true);
    try {
      await removeStudentBooking(deleteConfirm.slotId, deleteConfirm.studentId);
      setDeleteConfirm({isOpen: false, slotId: '', studentId: '', label: ''});
      showAlert('success', 'Jadwal berhasil dihapus.');
      router.refresh();
    } catch (error: any) {
      showAlert('error', error.message);
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Auto Mode State
  const [autoSchedules, setAutoSchedules] = useState([{ startDate: new Date().toISOString().split('T')[0], time: "08:00", classId: "" }]);

  // Manual Mode State
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState("08:00");
  const [manualClassId, setManualClassId] = useState("");

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  
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

  const selectedStudent = students.find(s => s.id === studentId);
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

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
          
          {/* Custom Searchable Dropdown */}
          <div className="relative" ref={studentDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsOpenStudentDropdown(!isOpenStudentDropdown);
                setStudentSearchQuery("");
              }}
              className="flex items-center justify-between w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white text-left text-sm cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                {selectedStudent 
                  ? `${selectedStudent.name} (${selectedStudent.status === 'REGISTERED' ? 'Reguler' : selectedStudent.status === 'CG' ? 'CG' : 'Nonaktif'})` 
                  : "-- Cari dan Pilih Siswa --"
                }
              </span>
              <svg className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${isOpenStudentDropdown ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </button>

            {isOpenStudentDropdown && (
              <div className="absolute z-50 mt-1.5 w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-2 animate-in fade-in slide-in-from-top-1 duration-100">
                {/* Search Input */}
                <div className="relative mb-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icons.search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari nama siswa..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                {/* Options List (Max 5 items before scrolling) */}
                <div className="max-h-[190px] overflow-y-auto space-y-0.5">
                  {filteredStudents.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400 italic text-center">
                      Siswa tidak ditemukan
                    </div>
                  ) : (
                    filteredStudents.map((s) => {
                      const isInactive = s.status === 'INACTIVE';
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={isInactive}
                          onClick={() => {
                            if (!isInactive) {
                              setStudentId(s.id);
                              setIsOpenStudentDropdown(false);
                            }
                          }}
                          className={`w-full px-3 py-2 text-xs text-left rounded-lg transition-colors flex items-center justify-between ${
                            isInactive 
                              ? "opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-800/30" 
                              : "hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer " + (studentId === s.id ? "font-bold text-brand-600 bg-brand-50/50 dark:bg-brand-950/20" : "text-slate-700 dark:text-slate-300")
                          }`}
                        >
                          <div className="truncate pr-2 flex flex-col">
                            <span className={isInactive ? "text-slate-500 dark:text-slate-400" : ""}>{s.name}</span>
                            {isInactive && (
                              <span className="text-[9px] text-red-500 dark:text-red-400 font-medium mt-0.5">
                                *Siswa nonaktif
                              </span>
                            )}
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            s.status === 'REGISTERED' 
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' 
                              : s.status === 'CG' 
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                                : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                          }`}>
                            {s.status === 'REGISTERED' ? 'Reguler' : s.status === 'CG' ? 'CG' : 'Nonaktif'}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

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
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {studentSchedules.map(slot => {
                      const dateObj = new Date(slot.date);
                      const hari = isNaN(dateObj.getTime()) ? "" : ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][dateObj.getDay()];
                      const tgl = isNaN(dateObj.getTime()) ? "" : dateObj.getDate();
                      const jadwalLabel = `${hari}, ${tgl} ${monthNames[currentMonth - 1]} | ${slot.time.substring(0,5)} | ${slot.class?.name}`;
                      
                      return (
                        <div key={slot.id} className="group inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-brand-200 dark:border-brand-500/30 shadow-sm hover:border-red-300 dark:hover:border-red-500/30 transition-colors">
                          <Icons.calendar className="w-3 h-3 text-brand-500" />
                          <span>{hari}, {tgl} {monthNames[currentMonth - 1]}</span>
                          <span className="text-slate-300 mx-0.5">|</span>
                          <span className="text-brand-600 dark:text-brand-400">{slot.time.substring(0,5)}</span>
                          <span className="text-slate-300 mx-0.5">|</span>
                          <span className="font-semibold">{slot.class?.name}</span>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm({isOpen: true, slotId: slot.id, studentId: studentId, label: jadwalLabel})}
                            className="ml-1 p-1 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors opacity-50 group-hover:opacity-100"
                            title="Hapus jadwal ini"
                          >
                            <Icons.close className="w-3 h-3" />
                          </button>
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
                      
                      <div className="flex-1 min-w-[120px]">
                        <div className="flex items-center justify-between mb-1.5 px-1">
                          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jam Sesi</label>
                        </div>
                        <div className="relative">
                          <select
                            value={schedule.time}
                            onChange={(e) => updateAutoSchedule(index, 'time', e.target.value)}
                            className="appearance-none block w-full rounded-xl border-slate-200 bg-white pl-4 pr-10 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white cursor-pointer"
                          >
                            {timeSlots.map(t => (
                              <option key={t} value={t}>{t} - {String(parseInt(t) + 1).padStart(2, '0')}:00 WIB</option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="flex-[2] min-w-[150px]">
                        <div className="flex items-center justify-between mb-1.5 px-1">
                          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tipe Kelas</label>
                        </div>
                        <div className="relative">
                          <select
                            required
                            value={schedule.classId}
                            onChange={(e) => updateAutoSchedule(index, 'classId', e.target.value)}
                            className="appearance-none block w-full rounded-xl border-slate-200 bg-white pl-4 pr-10 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white cursor-pointer"
                          >
                            <option value="" disabled>-- Pilih Tipe Kelas --</option>
                            {classes.map(c => (
                              <option key={c.id} value={c.id}>{c.name} (Max: {c.max_quota})</option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {autoSchedules.length > 1 && (
                        <div className="self-end pb-1.5">
                          <button 
                            type="button" 
                            onClick={() => removeAutoScheduleRow(index)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full transition-colors"
                            title="Hapus Jadwal"
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
                  <div className="relative">
                    <select
                      required
                      value={manualTime}
                      onChange={(e) => setManualTime(e.target.value)}
                      className="appearance-none block w-full rounded-xl border-slate-200 bg-white pl-4 pr-10 py-3 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white cursor-pointer"
                    >
                      <option value="" disabled>-- Pilih Jam --</option>
                      {timeSlots.map(t => (
                        <option key={t} value={t}>{t} - {String(parseInt(t) + 1).padStart(2, '0')}:00 WIB</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Pilih Kelas</label>
                  <div className="relative">
                    <select
                      required
                      value={manualClassId}
                      onChange={(e) => setManualClassId(e.target.value)}
                      className="appearance-none block w-full rounded-xl border-slate-200 bg-white pl-4 pr-10 py-3 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white cursor-pointer"
                    >
                      <option value="" disabled>-- Pilih Tipe Kelas --</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name} (Max: {c.max_quota})</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
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

    {/* Delete Booking Confirmation Modal */}
    {deleteConfirm.isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
          <div className="p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10 mb-4">
              <Icons.trash className="h-7 w-7 text-red-600 dark:text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Hapus Jadwal Siswa?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
              Apakah Anda yakin ingin menghapus jadwal berikut?
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <Icons.calendar className="w-3 h-3 text-brand-500" />
              {deleteConfirm.label}
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex gap-3">
            <button
              onClick={() => setDeleteConfirm({isOpen: false, slotId: '', studentId: '', label: ''})}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm border border-slate-200 dark:border-slate-700 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleDeleteBooking}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
