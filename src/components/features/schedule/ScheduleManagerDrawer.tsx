"use client";

import { useState } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Icons } from "@/components/ui/icons";
import { createScheduleSlot, bookStudentToSlot, toggleSlotLock } from "@/lib/actions";
import { ChangeLabelModal } from "@/components/features/students/ChangeLabelModal";
import { formatFullIndonesianDate } from "@/lib/dateUtils";

interface ScheduleManagerDrawerProps {
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  classes: any[];
  students: any[];
  onSuccess: () => void;
  existingSlots: any[];
  defaultClassId?: string;
}

export function ScheduleManagerDrawer({ onClose, selectedDate, classes, students, onSuccess, existingSlots, defaultClassId = "" }: ScheduleManagerDrawerProps) {
  const formattedDate = formatFullIndonesianDate(selectedDate);

  // State untuk modal konfirmasi lock
  const [lockConfirm, setLockConfirm] = useState<{ slotId: string; currentStatus: boolean; className: string; time: string } | null>(null);
  const [isLocking, setIsLocking] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [labelsList, setLabelsList] = useState<any[]>([]);

  const handleStudentClick = async (student: any) => {
    setEditingStudent(student);
    if (labelsList.length === 0) {
      const { getLabels } = await import("@/lib/actions");
      const lbls = await getLabels();
      setLabelsList(lbls);
    }
  };

  const handleToggleLock = async (slotId: string, currentStatus: boolean, className: string, time: string) => {
    // Kalau mau LOCK (currentStatus = false → mau jadi true), tampilkan konfirmasi
    if (!currentStatus) {
      setLockConfirm({ slotId, currentStatus, className, time });
      return;
    }
    // Kalau UNLOCK, langsung eksekusi tanpa konfirmasi
    await executeLock(slotId, currentStatus);
  };

  const executeLock = async (slotId: string, currentStatus: boolean) => {
    setIsLocking(true);
    try {
      await toggleSlotLock(slotId, currentStatus);
      onSuccess();
    } catch (error: any) {
      alert("Gagal mengubah status lock: " + error.message);
    } finally {
      setIsLocking(false);
      setLockConfirm(null);
    }
  };

  return (
    <>
      {/* Loading overlay saat proses lock */}
      {isLocking && <LoadingSpinner usePortal={true} />}

      {/* Modal Konfirmasi Lock */}
      {lockConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
            onClick={() => !isLocking && setLockConfirm(null)}
          />
          {/* Card Modal */}
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
            {/* Icon Header */}
            <div className="flex flex-col items-center pt-8 pb-4 px-6">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-4 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">Kunci Sesi Ini?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center leading-relaxed">
                Kelas <strong className="text-slate-700 dark:text-slate-200">{lockConfirm.className}</strong> pukul{" "}
                <strong className="text-slate-700 dark:text-slate-200">{lockConfirm.time} WIB</strong> akan dikunci.
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 text-center bg-amber-50 dark:bg-amber-900/30 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
                ⚠️ Siswa baru tidak dapat melakukan booking pada sesi yang dikunci.
              </p>
            </div>
            {/* Action Buttons */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setLockConfirm(null)}
                disabled={isLocking}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={() => executeLock(lockConfirm.slotId, lockConfirm.currentStatus)}
                disabled={isLocking}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLocking ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Mengunci...
                  </>
                ) : (
                  <>Ya, Kunci Sesi</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
        </div>
        
        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 relative">
          
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
                            onClick={() => handleToggleLock(slot.id, slot.is_locked, slot.class.name, slot.time.substring(0, 5))}
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
                            <div 
                              key={b.student_id} 
                              className={`flex justify-between items-center text-xs p-2 rounded-md border-l-4 ${!b.student?.label ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600' : ''}`}
                              style={b.student?.label ? {
                                backgroundColor: `${b.student.label.hex_color}CC`,
                                borderLeftColor: b.student.label.hex_color
                              } : {}}
                            >
                              <span className="text-slate-900 dark:text-slate-100 font-extrabold truncate max-w-[200px] flex items-center gap-2">
                                {b.student?.label && (
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.student.label.hex_color }}></span>
                                )}
                                <span>
                                  {b.student?.status === 'CG' && <strong className="text-amber-600 dark:text-amber-500 mr-1">(CG)</strong>}
                                  {b.student?.nickname || b.student?.name}
                                </span>
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStudentClick({ ...b.student, id: b.student_id })}
                                  className="text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 p-1.5 rounded-md hover:bg-white/80 dark:hover:bg-slate-800 transition-colors shadow-xs"
                                  title="Ganti Level Siswa"
                                >
                                  <Icons.edit className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={async () => {
                                    if (confirm(`Keluarkan ${b.student?.nickname || b.student?.name} dari kelas ini?`)) {
                                      const { cancelBooking } = await import('@/lib/actions');
                                      await cancelBooking(slot.id, b.student_id);
                                      onSuccess(); // refresh
                                    }
                                  }}
                                  className="text-red-500 hover:bg-white dark:hover:bg-slate-800 p-1.5 rounded-md transition-colors shadow-sm"
                                  title="Keluarkan"
                                >
                                  <Icons.close className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-sm text-slate-500">
                          Kuota: <strong className="text-slate-900 dark:text-white">{bookedCount}/{slot.class.max_quota}</strong> Siswa
                        </div>
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          Sisa Kuota: <strong className="text-slate-900 dark:text-white">{slot.class.max_quota - bookedCount}</strong> kursi
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
        </div>
      </div>

      <ChangeLabelModal
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        student={editingStudent}
        labels={labelsList}
        onSuccess={() => onSuccess()}
      />
    </>
  );
}
