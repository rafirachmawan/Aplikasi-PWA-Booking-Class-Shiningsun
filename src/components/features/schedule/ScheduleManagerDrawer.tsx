"use client";

import { useState } from "react";
import { Icons } from "@/components/ui/icons";
import { createScheduleSlot, bookStudentToSlot, toggleSlotLock } from "@/lib/actions";

interface ScheduleManagerDrawerProps {
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  classes: any[];
  students: any[];
  onSuccess: () => void;
  existingSlots: any[];
}

export function ScheduleManagerDrawer({ onClose, selectedDate, classes, students, onSuccess, existingSlots }: ScheduleManagerDrawerProps) {
  const [activeTab, setActiveTab] = useState<"view" | "add">("view");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for Booking Modal
  const [bookingSlot, setBookingSlot] = useState<any | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  // Form State for Add Class
  const [classId, setClassId] = useState("");
  const [time, setTime] = useState("08:00");
  const [isRecurring, setIsRecurring] = useState(false);

  const formattedDate = new Date(selectedDate).toLocaleDateString("id-ID", {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append("class_id", classId);
      formData.append("date", selectedDate);
      formData.append("time", time);
      formData.append("is_recurring", isRecurring.toString());
      
      await createScheduleSlot(formData);
      onSuccess();
      setActiveTab("view");
    } catch (error: any) {
      alert("Gagal membuat jadwal: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLock = async (slotId: string, currentStatus: boolean) => {
    try {
      await toggleSlotLock(slotId, currentStatus);
      onSuccess(); // Refresh UI
    } catch (error: any) {
      alert("Gagal mengubah status lock: " + error.message);
    }
  };

  const handleBookStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingSlot || !selectedStudentId) return;
    
    setIsSubmitting(true);
    try {
      await bookStudentToSlot(selectedStudentId, bookingSlot.id);
      alert("Siswa berhasil didaftarkan ke sesi ini!");
      setBookingSlot(null);
      setSelectedStudentId("");
      onSuccess(); // Refresh UI to update quota
    } catch (error: any) {
      alert(error.message); // Pessimistic quota message
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="fixed inset-y-0 right-0 z-40 w-full sm:max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Icons.calendar className="w-5 h-5 text-brand-500" />
                Manajemen Jadwal
              </h3>
              <p className="text-sm text-slate-500 mt-1">{formattedDate}</p>
            </div>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-500 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Icons.close className="w-5 h-5" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-4 mt-4 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab("view")}
              className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "view" ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              Daftar Sesi ({existingSlots.length})
            </button>
            <button
              onClick={() => setActiveTab("add")}
              className={`pb-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "add" ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              + Buka Kelas Baru
            </button>
          </div>
        </div>
        
        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 relative">
          
          {/* Booking Modal (Option B Overlay) */}
          {bookingSlot && (
             <div className="absolute inset-0 z-50 bg-white dark:bg-slate-900 p-6 flex flex-col">
               <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
                 <h4 className="font-semibold text-lg text-slate-900 dark:text-white">Booking Siswa</h4>
                 <button onClick={() => setBookingSlot(null)} className="text-slate-400 hover:text-slate-600">
                   <Icons.close className="w-5 h-5" />
                 </button>
               </div>
               
               <div className="bg-brand-50 dark:bg-brand-500/10 p-3 rounded-xl mb-6">
                 <p className="text-sm font-medium text-brand-900 dark:text-brand-100">
                   {bookingSlot.class.name} • {bookingSlot.time.substring(0,5)} WIB
                 </p>
                 <p className="text-xs text-brand-700 dark:text-brand-300 mt-1">
                   Sisa Kuota: {bookingSlot.class.max_quota - (bookingSlot.bookings?.length || 0)} kursi
                 </p>
               </div>

               <form onSubmit={handleBookStudent} className="flex-1 flex flex-col">
                 <div className="flex-1">
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Pilih Siswa</label>
                   <select
                     required
                     value={selectedStudentId}
                     onChange={(e) => setSelectedStudentId(e.target.value)}
                     className="block w-full rounded-xl border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                   >
                     <option value="" disabled>-- Pilih Siswa Aktif --</option>
                     {students.map(s => (
                       <option key={s.id} value={s.id}>{s.name} ({s.status === 'REGISTERED' ? 'Reguler' : 'CG'})</option>
                     ))}
                   </select>
                 </div>
                 
                 <button
                   type="submit"
                   disabled={isSubmitting || !selectedStudentId}
                   className="mt-6 w-full py-3 px-4 rounded-xl shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50"
                 >
                   {isSubmitting ? "Memproses..." : "Konfirmasi Booking"}
                 </button>
               </form>
             </div>
          )}

          {activeTab === "view" && !bookingSlot ? (
            <div className="space-y-4">
              {existingSlots.length === 0 ? (
                <div className="text-center py-10">
                  <div className="mx-auto w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                    <Icons.calendar className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">Belum ada kelas terjadwal pada hari ini.</p>
                </div>
              ) : (
                existingSlots.map((slot) => {
                  const bookedCount = slot.bookings?.length || 0;
                  const isFull = bookedCount >= slot.class.max_quota;
                  
                  return (
                    <div key={slot.id} className={`p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm transition-all ${slot.is_locked ? 'border-slate-200 opacity-75' : 'border-slate-200 dark:border-slate-800'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className={`font-semibold ${slot.is_locked ? 'text-slate-500' : 'text-slate-900 dark:text-white'}`}>{slot.class.name}</h4>
                          <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-300 mt-1 inline-block">
                            {slot.time.substring(0, 5)} WIB
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleLock(slot.id, slot.is_locked)}
                            title={slot.is_locked ? "Buka Gembok Sesi" : "Kunci Sesi Ini"}
                            className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                              slot.is_locked 
                                ? "bg-red-100 text-red-700 hover:bg-red-200" 
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800"
                            }`}
                          >
                            {slot.is_locked ? (
                               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            ) : (
                               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                            )}
                          </button>
                          
                          {isFull && !slot.is_locked && (
                            <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-1 rounded border border-amber-200">
                              PENUH
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tampilkan Siswa Terdaftar */}
                      {bookedCount > 0 && (
                        <div className="mt-3 space-y-1">
                          {slot.bookings.map((b: any) => (
                            <div key={b.student_id} className="flex justify-between items-center text-xs p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-md">
                              <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                                • {b.student?.name}
                              </span>
                              <button 
                                onClick={async () => {
                                  if (confirm(`Keluarkan ${b.student?.name} dari kelas ini?`)) {
                                    const { cancelBooking } = await import('@/lib/actions');
                                    await cancelBooking(slot.id, b.student_id);
                                    onSuccess(); // refresh
                                  }
                                }}
                                className="text-red-500 hover:bg-red-100 p-1 rounded transition-colors"
                                title="Keluarkan"
                              >
                                <Icons.close className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-sm text-slate-500">
                          Kuota: <strong className="text-slate-900 dark:text-white">{bookedCount}/{slot.class.max_quota}</strong> Siswa
                        </div>
                        <button 
                          onClick={() => setBookingSlot(slot)}
                          disabled={slot.is_locked || isFull}
                          className="text-sm font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {slot.is_locked ? "Terkunci" : isFull ? "Penuh" : "+ Booking"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : !bookingSlot && (
            <form id="schedule-form" onSubmit={handleAddClass} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Ruang Kelas / Tipe</label>
                <select
                  required
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="mt-1 block w-full rounded-xl border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                >
                  <option value="" disabled>-- Pilih Kelas --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} (Max: {c.max_quota})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Waktu / Jam Mulai</label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-1 block w-full rounded-xl border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="bg-brand-50 dark:bg-brand-500/10 p-4 rounded-xl border border-brand-100 dark:border-brand-500/20">
                <div className="flex items-start">
                  <div className="flex h-6 items-center">
                    <input
                      id="recurring"
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-600 dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <div className="ml-3">
                    <label htmlFor="recurring" className="text-sm font-medium text-brand-900 dark:text-brand-100 cursor-pointer">
                      Ulangi Sepanjang Bulan
                    </label>
                    <p className="text-xs text-brand-700 dark:text-brand-300 mt-1">
                      (Engine Generator) Jika dicentang, jadwal ini akan otomatis dibuat untuk setiap hari yang sama hingga akhir bulan ini.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
        
        {/* Footer */}
        {activeTab === "add" && !bookingSlot && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
            <button
              type="submit"
              form="schedule-form"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center py-3 px-4 rounded-xl shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
            >
              {isSubmitting ? "Memproses..." : "Buat Jadwal Kelas"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
