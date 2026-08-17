"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import { createTeacher, updateTeacher, deleteTeacher } from "@/lib/actions";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export function TeacherManager({ teachers }: { teachers: any[] }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [editingTeacher, setEditingTeacher] = useState<any>(null);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setSubmitError("");
    try {
      const formData = new FormData();
      formData.append("name", name.trim());

      if (editingTeacher) {
        await updateTeacher(editingTeacher.id, formData);
      } else {
        await createTeacher(formData);
      }

      setIsAdding(false);
      setEditingTeacher(null);
      setName("");
      router.refresh();
    } catch (error: any) {
      setSubmitError(error?.message || "Gagal menyimpan data guru.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (teacher: any) => {
    setEditingTeacher(teacher);
    setName(teacher.name);
    setIsAdding(true);
    setSubmitError("");
  };

  const confirmDelete = (id: string, teacherName: string) => {
    setTeacherToDelete({ id, name: teacherName });
    setDeleteError("");
    setDeleteModal(true);
  };

  const handleExecuteDelete = async () => {
    if (!teacherToDelete) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteTeacher(teacherToDelete.id);
      setDeleteModal(false);
      setTeacherToDelete(null);
      router.refresh();
    } catch (error: any) {
      setDeleteError(error.message || "Gagal menghapus data guru.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-900/5 sm:rounded-2xl overflow-hidden">
      {isSubmitting && <LoadingSpinner usePortal={true} />}

      {/* Delete Confirmation Modal */}
      {deleteModal && teacherToDelete && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isDeleting && setDeleteModal(false)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
              <Icons.trash className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Hapus Data Guru?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Apakah Anda yakin ingin menghapus guru{" "}
              <strong className="text-slate-700 dark:text-slate-300">
                "{teacherToDelete.name}"
              </strong>
              ? Data guru ini tidak akan lagi muncul di dropdown pilihan
              laporan.
            </p>

            {deleteError && (
              <p className="text-xs text-red-500 mt-3 text-center font-medium bg-red-50 dark:bg-red-950/20 p-2.5 rounded-xl border border-red-100 dark:border-red-900/50">
                {deleteError}
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleExecuteDelete}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section Header */}
      <div className="px-5 py-5 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              👩‍🏫 Daftar Nama Guru / Miss
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/40">
              {teachers.length} Guru
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Kelola nama-nama guru/pembimbing yang nantinya dapat dipilih
            langsung melalui dropdown saat pengisian Laporan Perkembangan.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTeacher(null);
            setName("");
            setIsAdding(true);
            setSubmitError("");
          }}
          className="inline-flex items-center justify-center gap-x-1.5 rounded-xl bg-brand-600 text-white px-4 py-2.5 text-xs font-bold shadow-md hover:bg-brand-700 transition-all active:scale-95 cursor-pointer shrink-0 w-full sm:w-auto"
        >
          <Icons.add className="-ml-0.5 h-4 w-4" />
          Tambah Guru
        </button>
      </div>

      {/* Add / Edit Modal Popup */}
      {isAdding && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => {
              if (!isSubmitting) {
                setIsAdding(false);
                setEditingTeacher(null);
                setName("");
              }
            }}
          />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="relative flex items-center justify-between p-5 bg-linear-to-r from-brand-600 to-sky-600 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-lg">
                  👩‍🏫
                </div>
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wide">
                    {editingTeacher ? "Edit Data Guru" : "Tambah Guru Baru"}
                  </h3>
                  <p className="text-[11px] text-brand-100">
                    Opsi ini akan muncul di dropdown Laporan Siswa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingTeacher(null);
                  setName("");
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {submitError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-300">
                  ⚠️ {submitError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama Guru / Miss <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Contoh: Miss Sarah, Miss Rina"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingTeacher(null);
                    setName("");
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting
                    ? "Menyimpan..."
                    : editingTeacher
                      ? "✓ Simpan Perubahan"
                      : "✓ Tambah Guru"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teachers List */}
      <ul
        role="list"
        className="divide-y divide-slate-100 dark:divide-slate-800"
      >
        {teachers.length === 0 ? (
          <li className="px-6 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-2xl">
              👩‍🏫
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Belum Ada Data Guru
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Klik tombol &quot;Tambah Guru&quot; di atas untuk menambahkan
              daftar nama guru/pembimbing.
            </p>
          </li>
        ) : (
          teachers.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-x-6 px-5 py-4 sm:px-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 font-bold flex items-center justify-center text-sm shrink-0 border border-brand-200/80 dark:border-brand-800/50">
                  {t.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {t.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Aktif & Siap dipilih di dropdown
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleEdit(t)}
                  className="p-2 rounded-xl text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/50 transition-colors cursor-pointer"
                  title="Edit Nama Guru"
                >
                  <Icons.edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => confirmDelete(t.id, t.name)}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                  title="Hapus Guru"
                >
                  <Icons.trash className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
