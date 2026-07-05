"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HexColorPicker } from "react-colorful";
import { Icons } from "@/components/ui/icons";
import { createLabel, deleteLabel } from "@/lib/actions";

export function LabelManager({ labels }: { labels: any[] }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [mainLevel, setMainLevel] = useState("");
  const [subLevel, setSubLevel] = useState("");
  const [color, setColor] = useState("#3b82f6");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("main_level", mainLevel);
      formData.append("sub_level", subLevel);
      formData.append("hex_color", color);
      
      await createLabel(formData);
      setIsAdding(false);
      setMainLevel("");
      setSubLevel("");
      router.refresh();
    } catch (error) {
      alert("Gagal menyimpan label.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Yakin ingin menghapus label "${name}"? Data yang terhubung ke siswa tidak bisa dihapus.`)) {
      try {
        await deleteLabel(id);
        router.refresh();
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-900/5 sm:rounded-xl overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold leading-6 text-slate-900 dark:text-white">Tingkat Level / Label</h3>
          <p className="mt-1 text-sm text-slate-500">Atur label warna untuk pengelompokan siswa.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-x-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-100"
          >
            <Icons.add className="-ml-0.5 h-4 w-4" />
            Tambah
          </button>
        )}
      </div>
      
      {isAdding && (
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Level Utama</label>
                <input
                  required
                  type="text"
                  placeholder="Contoh: Montessori C"
                  value={mainLevel}
                  onChange={(e) => setMainLevel(e.target.value)}
                  className="mt-1 block w-full rounded-xl border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Sub Level</label>
                <input
                  required
                  type="text"
                  placeholder="Contoh: Merah"
                  value={subLevel}
                  onChange={(e) => setSubLevel(e.target.value)}
                  className="mt-1 block w-full rounded-xl border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Pilih Warna Label</label>
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <HexColorPicker color={color} onChange={setColor} />
                <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-6 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 w-full sm:w-auto">
                  <div className="text-sm font-medium text-slate-500">Preview:</div>
                  <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200 text-lg">
                    <div className="w-6 h-6 rounded-full shadow-inner" style={{ backgroundColor: color }}></div>
                    {mainLevel || "Level"} - {subLevel || "Sub"}
                  </div>
                  <div className="text-xs text-slate-400 font-mono uppercase bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{color}</div>
                </div>
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
                {isSubmitting ? "Menyimpan..." : "Simpan Label"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ul role="list" className="divide-y divide-slate-100 dark:divide-slate-800">
        {labels.map((label) => (
          <li key={label.id} className="flex items-center justify-between gap-x-6 px-4 py-5 sm:px-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex min-w-0 gap-x-4 items-center">
              <div className="h-10 w-10 flex-none rounded-full flex items-center justify-center shadow-inner" style={{ backgroundColor: label.hex_color }}>
                <span className="text-white font-bold text-xs drop-shadow-md">L</span>
              </div>
              <div className="min-w-0 flex-auto">
                <p className="text-sm font-semibold leading-6 text-slate-900 dark:text-white">
                  {label.main_level}
                </p>
                <p className="mt-1 truncate text-xs leading-5 text-slate-500">
                  Sub-Level: {label.sub_level}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-x-4">
              {label.is_system_default ? (
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Bawaan Sistem
                </span>
              ) : (
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-700/10 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-500/20">
                    Kustom Cabang
                  </span>
                  <button 
                    onClick={() => handleDelete(label.id, label.main_level)}
                    className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                    title="Hapus Label"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
