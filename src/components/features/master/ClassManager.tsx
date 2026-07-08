"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import { createClass, deleteClass } from "@/lib/actions";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export function ClassManager({ classes }: { classes: any[] }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [name, setName] = useState("");
  const [maxQuota, setMaxQuota] = useState("4");

  // Custom modal states
  const [deleteModal, setDeleteModal] = useState(false);
  const [classToDelete, setClassToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredClasses = classes;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("max_quota", maxQuota);
      
      await createClass(formData);
      setIsAdding(false);
      setName("");
      setMaxQuota("4");
      router.refresh();
    } catch (error) {
      alert("Gagal menyimpan ruang kelas.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (id: string, name: string) => {
    setClassToDelete({ id, name });
    setDeleteError("");
    setDeleteModal(true);
  };

  const handleExecuteDelete = async () => {
    if (!classToDelete) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteClass(classToDelete.id);
      setDeleteModal(false);
      setClassToDelete(null);
      router.refresh();
    } catch (error: any) {
      setDeleteError(error.message || "Gagal menghapus kelas.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-900/5 sm:rounded-xl overflow-hidden mb-8">
      {isSubmitting && <LoadingSpinner usePortal={true} />}
      
      {/* Delete Confirmation Modal */}
      {deleteModal && classToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isDeleting && setDeleteModal(false)}
          />

          {/* Modal Card */}
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Icons.trash className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">
              Hapus Ruang Kelas?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2 leading-relaxed">
              Apakah Anda yakin ingin menghapus kelas <strong className="text-slate-700 dark:text-slate-300">"{classToDelete.name}"</strong>? Data yang sudah digunakan di jadwal tidak dapat dihapus.
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
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleExecuteDelete}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-5 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-base font-semibold leading-6 text-slate-900 dark:text-white">Ruang Kelas</h3>
          <p className="mt-1 text-sm text-slate-500">Kelola daftar ruangan dan batas maksimal (kuota) siswa per sesi.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {!isAdding && (
            <button 
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center justify-center gap-x-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 whitespace-nowrap shrink-0 transition-colors"
            >
              <Icons.add className="-ml-0.5 h-4 w-4" />
              Tambah Ruangan
            </button>
          )}
        </div>
      </div>
      
      {isAdding && (
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nama Kelas / Ruangan</label>
                <input
                  required
                  type="text"
                  placeholder="Contoh: Kelas Star"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-xl border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Kuota Maksimal Siswa</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="50"
                  value={maxQuota}
                  onChange={(e) => setMaxQuota(e.target.value)}
                  className="mt-1 block w-full rounded-xl border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-full hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-full hover:bg-brand-500 disabled:opacity-50"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Ruangan"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ul role="list" className="divide-y divide-slate-100 dark:divide-slate-800">
        {filteredClasses.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Tidak ada kelas yang sesuai dengan pencarian.
          </li>
        ) : (
          filteredClasses.map((cls) => (
          <li key={cls.id} className="flex items-center justify-between gap-x-6 px-4 py-5 sm:px-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex min-w-0 gap-x-4 items-center">
              <div className="h-12 w-12 flex-none rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center dark:bg-brand-500/20 dark:text-brand-400">
                <Icons.home className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-auto">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold leading-6 text-slate-900 dark:text-white">
                    {cls.name}
                  </p>
                  {cls.branch?.name && (
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20">
                      {cls.branch.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-x-4">
              <div className="hidden sm:flex sm:flex-col sm:items-end mr-4">
                <p className="text-sm leading-6 text-slate-900 dark:text-white">Maks {cls.max_quota} Siswa</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Kuota penuh / sesi</p>
              </div>
              <button 
                onClick={() => confirmDelete(cls.id, cls.name)}
                className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                title="Hapus Kelas"
              >
                <Icons.trash className="w-5.5 h-5.5" />
              </button>
            </div>
          </li>
        )))}
      </ul>
    </div>
  );
}
