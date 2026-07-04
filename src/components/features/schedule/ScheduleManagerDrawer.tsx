"use client";

import { useState } from "react";
import { Icons } from "@/components/ui/icons";
import { createScheduleSlot } from "@/lib/actions";

interface ScheduleManagerDrawerProps {
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  classes: any[];
  onSuccess: () => void;
  existingSlots: any[];
}

export function ScheduleManagerDrawer({ onClose, selectedDate, classes, onSuccess, existingSlots }: ScheduleManagerDrawerProps) {
  const [activeTab, setActiveTab] = useState<"view" | "add">("view");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [classId, setClassId] = useState("");
  const [time, setTime] = useState("08:00");
  const [isRecurring, setIsRecurring] = useState(false); // Default false (Aman)

  const formattedDate = new Date(selectedDate).toLocaleDateString("id-ID", {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const handleSubmit = async (e: React.FormEvent) => {
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
      setActiveTab("view"); // kembali ke daftar setelah sukses
    } catch (error) {
      alert("Gagal membuat jadwal.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
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
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === "view" ? (
            <div className="space-y-4">
              {existingSlots.length === 0 ? (
                <div className="text-center py-10">
                  <div className="mx-auto w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                    <Icons.calendar className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">Belum ada kelas terjadwal pada hari ini.</p>
                  <button 
                    onClick={() => setActiveTab("add")}
                    className="mt-4 text-sm text-brand-600 font-medium hover:underline"
                  >
                    Buat jadwal kelas sekarang
                  </button>
                </div>
              ) : (
                existingSlots.map((slot) => {
                  const bookedCount = slot.bookings[0]?.count || 0;
                  const isFull = bookedCount >= slot.class.max_quota;
                  
                  return (
                    <div key={slot.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white">{slot.class.name}</h4>
                          <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-300 mt-1 inline-block">
                            {slot.time.substring(0, 5)} WIB
                          </span>
                        </div>
                        {slot.is_locked ? (
                          <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-1 rounded border border-red-200">
                            LOCKED
                          </span>
                        ) : isFull ? (
                          <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-1 rounded border border-amber-200">
                            PENUH
                          </span>
                        ) : (
                          <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-1 rounded border border-emerald-200">
                            TERSEDIA
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-sm text-slate-500">
                          Kuota: <strong className="text-slate-900 dark:text-white">{bookedCount}/{slot.class.max_quota}</strong> Siswa
                        </div>
                        <button 
                          disabled={slot.is_locked || isFull}
                          className="text-sm font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Booking Siswa
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <form id="schedule-form" onSubmit={handleSubmit} className="space-y-6">
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
                      (Engine Generator) Jika dicentang, jadwal ini akan otomatis dibuat untuk setiap hari yang sama (misal: setiap Selasa) hingga akhir bulan ini.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
        
        {/* Footer */}
        {activeTab === "add" && (
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
