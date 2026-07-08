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

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Yakin ingin menghapus kelas "${name}"? Data yang sudah dipakai di jadwal tidak bisa dihapus.`)) {
      try {
        await deleteClass(id);
        router.refresh();
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-900/5 sm:rounded-xl overflow-hidden mb-8">
      {isSubmitting && <LoadingSpinner usePortal={true} />}
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
                onClick={() => handleDelete(cls.id, cls.name)}
                className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                title="Hapus Kelas"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          </li>
        )))}
      </ul>
    </div>
  );
}
