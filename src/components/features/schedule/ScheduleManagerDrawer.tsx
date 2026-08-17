"use client";

import { useState } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Icons } from "@/components/ui/icons";
import { createScheduleSlot, bookStudentToSlot, toggleSlotLock, cancelBooking } from "@/lib/actions";
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
  
  // State untuk modal konfirmasi cancel booking / keluarkan siswa
  const [deleteConfirm, setDeleteConfirm] = useState<{ slotId: string; studentId: string; studentName: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [labelsList, setLabelsList] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const handleStudentClick = async (student: any) => {
    setEditingStudent(student);
    if (labelsList.length === 0) {
      const { getLabels } = await import("@/lib/actions");
      const lbls = await getLabels();
      setLabelsList(lbls);
    }
  };

  const handleToggleLock = async (slotId: string, currentStatus: boolean, className: string, time: string) => {
    if (!currentStatus) {
      setLockConfirm({ slotId, currentStatus, className, time });
      return;
    }
    await executeLock(slotId, currentStatus);
  };

  const executeLock = async (slotId: string, currentStatus: boolean) => {
    setIsLocking(true);
    setErrorMessage("");
    try {
      await toggleSlotLock(slotId, currentStatus);
      onSuccess();
    } catch (error: any) {
      setErrorMessage("Gagal mengubah status lock: " + (error.message || "Terjadi kesalahan."));
    } finally {
      setIsLocking(false);
      setLockConfirm(null);
    }
  };

  const executeCancelBooking = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    setErrorMessage("");
    try {
      await cancelBooking(deleteConfirm.slotId, deleteConfirm.studentId);
      onSuccess();
      setDeleteConfirm(null);
    } catch (error: any) {
      setErrorMessage("Gagal mengeluarkan siswa: " + (error.message || "Terjadi kesalahan."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Loading overlay saat proses */}
      {(isLocking || isDeleting) && <LoadingSpinner usePortal={true} />}

      {/* Modal Konfirmasi Lock */}
      {lockConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
            onClick={() => !isLocking && setLockConfirm(null)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
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
            <div className="flex gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={() => setLockConfirm(null)}
                disabled={isLocking}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 min-h-11"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeLock(lockConfirm.slotId, lockConfirm.currentStatus)}
                disabled={isLocking}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 min-h-11"
              >
                {isLocking ? "Mengunci..." : "Ya, Kunci Sesi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Keluarkan Siswa */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
            onClick={() => !isDeleting && setDeleteConfirm(null)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center pt-8 pb-4 px-6">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mb-4 shadow-inner">
                <Icons.trash className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">Keluarkan Siswa?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center leading-relaxed">
                Apakah Anda yakin ingin mengeluarkan <strong className="text-slate-700 dark:text-slate-200">"{deleteConfirm.studentName}"</strong> dari kelas ini?
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 min-h-11"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeCancelBooking}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 min-h-11"
              >
                {isDeleting ? "Memproses..." : "Ya, Keluarkan"}
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
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-500 p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-h-11 min-w-11 flex items-center justify-center"
            >
              <Icons.close className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 relative">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-300">
              {errorMessage}
            </div>
          )}

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
                          type="button"
                          onClick={() => handleToggleLock(slot.id, slot.is_locked, slot.class.name, slot.time.substring(0, 5))}
                          title={slot.is_locked ? "Buka Gembok Sesi" : "Kunci Sesi Ini"}
                          className={`p-2 rounded-md text-xs font-medium transition-colors min-h-9 min-w-9 flex items-center justify-center ${
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
                            <span className="text-slate-900 dark:text-slate-100 font-extrabold truncate max-w-50 flex items-center gap-2">
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
                                className="text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 p-2 rounded-md hover:bg-white/80 dark:hover:bg-slate-800 transition-colors shadow-xs min-h-9 min-w-9 flex items-center justify-center cursor-pointer"
                                title="Ganti Level Siswa"
                              >
                                <Icons.edit className="w-4 h-4" />
                              </button>
                              <button 
                                type="button"
                                onClick={() => {
                                  setDeleteConfirm({
                                    slotId: slot.id,
                                    studentId: b.student_id,
                                    studentName: b.student?.nickname || b.student?.name || "Siswa"
                                  });
                                }}
                                className="text-red-500 hover:bg-white dark:hover:bg-slate-800 p-2 rounded-md transition-colors shadow-sm min-h-9 min-w-9 flex items-center justify-center cursor-pointer"
                                title="Keluarkan"
                              >
                                <Icons.close className="w-4 h-4" />
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
