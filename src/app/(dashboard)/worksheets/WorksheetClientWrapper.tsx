"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import { WorksheetFormModal } from "@/components/features/worksheets/WorksheetFormModal";
import { StudentWorksheetTable } from "@/components/features/worksheets/StudentWorksheetTable";
import { deleteWorksheet, updateStudentAccessPin } from "@/lib/actions";
import { formatNumericDate, formatShortDate } from "@/lib/dateUtils";
import { getGDrivePreviewLink, getGDriveDirectLink } from "@/lib/gdriveUtils";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface WorksheetClientWrapperProps {
  initialWorksheets: any[];
  students: any[];
  labels: any[];
  activeBranchName?: string | null;
}

export function WorksheetClientWrapper({
  initialWorksheets,
  students,
  labels,
  activeBranchName,
}: WorksheetClientWrapperProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorksheet, setEditingWorksheet] = useState<any>(null);

  // Delete confirm modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Protection state for direct URL access
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [lockChecked, setLockChecked] = useState(false);
  const [lockPassword, setLockPassword] = useState("");
  const [lockError, setLockError] = useState("");

  useEffect(() => {
    const unlocked = sessionStorage.getItem("worksheets_unlocked") === "true";
    setIsUnlocked(unlocked);
    setLockChecked(true);
  }, []);

  // PIN modal state
  const [pinModalStudent, setPinModalStudent] = useState<any>(null);
  const [newPin, setNewPin] = useState("");
  const [pinMsg, setPinMsg] = useState({ error: "", success: "" });

  // Filter worksheets
  const filteredWorksheets = useMemo(() => {
    return initialWorksheets.filter((w) => {
      const studentName = w.student?.name || "";
      const studentNickname = w.student?.nickname || "";
      const title = w.title || "";
      const desc = w.description || "";
      const materi = w.materi || "";
      const kegiatan = w.kegiatan || "";

      const matchesSearch =
        studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        studentNickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        materi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kegiatan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        desc.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStudent = !selectedStudentId || w.student_id === selectedStudentId;

      return matchesSearch && matchesStudent;
    });
  }, [initialWorksheets, searchQuery, selectedStudentId]);

  // Group worksheets by student_id
  const groupedWorksheets = useMemo(() => {
    const map = new Map<string, { student: any; worksheets: any[] }>();

    filteredWorksheets.forEach((w) => {
      const sId = w.student_id;
      if (!map.has(sId)) {
        const studentObj = w.student || students.find((s) => s.id === sId) || { id: sId, name: w.student_name || "Siswa" };
        map.set(sId, { student: studentObj, worksheets: [] });
      }
      map.get(sId)!.worksheets.push(w);
    });

    // If specific student selected in filter and has 0 filtered worksheets, still render their empty table
    if (selectedStudentId && !map.has(selectedStudentId)) {
      const studentObj = students.find((s) => s.id === selectedStudentId);
      if (studentObj) {
        map.set(selectedStudentId, { student: studentObj, worksheets: [] });
      }
    }

    return Array.from(map.values());
  }, [filteredWorksheets, selectedStudentId, students]);

  const handleUnlockPage = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockPassword === "123") {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("worksheets_unlocked", "true");
      }
      setIsUnlocked(true);
    } else {
      setLockError("Password salah! Hubungi pihak developer.");
    }
  };

  if (!lockChecked) {
    return null;
  }

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] p-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-3xl shadow-sm">
            🔒
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Modul Lembar Kerja Dikunci
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Fitur Lembar Kerja Siswa ini masih dalam tahap prarilis. Silakan masukkan password akses untuk membuka modul ini.
            </p>
          </div>

          <form onSubmit={handleUnlockPage} className="space-y-4 pt-2">
            <div>
              <input
                type="password"
                required
                value={lockPassword}
                onChange={(e) => {
                  setLockPassword(e.target.value);
                  setLockError("");
                }}
                placeholder="Masukkan password (default: 123)"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
              {lockError && (
                <p className="text-xs text-red-500 font-semibold mt-2 animate-in fade-in">{lockError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md transition-all active:scale-95"
            >
              Buka Akses Lembar Kerja
            </button>
          </form>
        </div>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    setIsProcessing(true);
    try {
      await deleteWorksheet(id);
      setDeletingId(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus lembar kerja.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdatePin = async () => {
    if (!pinModalStudent || !newPin) return;
    setPinMsg({ error: "", success: "" });
    setIsProcessing(true);
    try {
      await updateStudentAccessPin(pinModalStudent.id, newPin);
      setPinMsg({ error: "", success: "PIN Akses Orang Tua berhasil diperbarui!" });
      setTimeout(() => {
        setPinModalStudent(null);
        setNewPin("");
        setPinMsg({ error: "", success: "" });
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setPinMsg({ error: err.message || "Gagal mengubah PIN.", success: "" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {isProcessing && <LoadingSpinner usePortal={true} />}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setDeletingId(null)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Icons.trash className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Hapus Lembar Kerja?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Data lembar kerja ini akan dihapus dari sistem.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingId)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Access PIN Manager Modal */}
      {pinModalStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setPinModalStudent(null)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Kelola PIN Portal Orang Tua
              </h3>
              <button
                onClick={() => setPinModalStudent(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icons.close className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Siswa: <strong className="text-slate-800 dark:text-slate-200">{pinModalStudent.name}</strong>
            </p>

            {pinMsg.error && (
              <p className="text-xs text-red-500 mb-3 bg-red-50 p-2 rounded-lg">{pinMsg.error}</p>
            )}
            {pinMsg.success && (
              <p className="text-xs text-emerald-600 mb-3 bg-emerald-50 p-2 rounded-lg">{pinMsg.success}</p>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                PIN Akses Baru (Min. 4 Angka/Huruf)
              </label>
              <input
                type="text"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Misal: 123456"
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
            </div>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setPinModalStudent(null)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleUpdatePin}
                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-brand-600 text-white hover:bg-brand-700"
              >
                Simpan PIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-3xl bg-brand-600 p-6 sm:p-10 shadow-lg relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-400 opacity-20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight flex flex-wrap items-center gap-x-2">
              <span>Lembar Kerja Siswa</span>
              {activeBranchName && (
                <span className="text-brand-100 font-normal text-lg sm:text-xl lg:text-2xl whitespace-nowrap">
                  ({activeBranchName})
                </span>
              )}
            </h2>
            <p className="text-brand-100 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
              Catat laporan perkembangan, tugas, dan tautan file Google Drive yang dapat diakses oleh Orang Tua.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-x-2 rounded-xl bg-white text-brand-700 px-5 py-3 text-sm font-bold shadow-md hover:bg-brand-50 focus-visible:outline-none shrink-0 w-full sm:w-auto justify-center transition-all active:scale-95"
            style={{ color: '#1d4ed8', backgroundColor: 'white' }}
          >
            <Icons.add className="-ml-0.5 h-5 w-5" />
            Tambah Lembar Kerja
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Search Input */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Icons.search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul atau nama siswa..."
              className="block w-full rounded-xl border-0 py-2.5 pl-10 pr-3 text-slate-900 ring-1 ring-inset ring-slate-200 bg-slate-50 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600 sm:text-sm dark:bg-slate-800 dark:ring-slate-700 dark:text-white"
            />
          </div>

          {/* Student Select Filter */}
          <div className="relative">
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="appearance-none block w-full rounded-xl border-0 py-2.5 pl-10 pr-10 text-slate-900 ring-1 ring-inset ring-slate-200 bg-slate-50 focus:ring-2 focus:ring-brand-600 sm:text-sm dark:bg-slate-800 dark:ring-slate-700 dark:text-white font-medium cursor-pointer truncate"
            >
              <option value="">✨ Semua Siswa ({students.length})</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  👤 {s.name} {s.nickname ? `(${s.nickname})` : ''}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Icons.users className="h-5 w-5 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Worksheets Grid / List Grouped By Student Table Document */}
      <div className="space-y-6">
        {groupedWorksheets.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Icons.edit className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Belum Ada Lembar Perkembangan Siswa</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Klik tombol &quot;Tambah Lembar Kerja&quot; untuk mulai mencatat evaluasi perkembangan siswa.
            </p>
          </div>
        ) : (
          groupedWorksheets.map(({ student, worksheets: studentWsList }) => (
            <StudentWorksheetTable
              key={student.id}
              student={student}
              worksheets={studentWsList}
              onAddRow={(studentId) => {
                setEditingWorksheet({ student_id: studentId });
                setIsModalOpen(true);
              }}
              onEditRow={(ws) => {
                setEditingWorksheet(ws);
                setIsModalOpen(true);
              }}
              onDeleteRow={(wsId) => setDeletingId(wsId)}
              onSetPin={(s) => {
                setPinModalStudent(s);
                setNewPin(s.access_pin || "123456");
              }}
            />
          ))
        )}
      </div>

      {/* Form Modal */}
      {(isModalOpen || editingWorksheet) && (
        <WorksheetFormModal
          students={students}
          initialData={editingWorksheet}
          onClose={() => {
            setIsModalOpen(false);
            setEditingWorksheet(null);
          }}
          onSuccess={() => {
            setIsModalOpen(false);
            setEditingWorksheet(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
