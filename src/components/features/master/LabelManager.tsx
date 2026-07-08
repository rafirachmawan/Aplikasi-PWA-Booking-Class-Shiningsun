"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import { createLabel, deleteLabel } from "@/lib/actions";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const PREDEFINED_COLORS = [
  // Red
  { name: "Merah Paling Muda", hex: "#fca5a5" }, { name: "Merah Muda", hex: "#f87171" }, { name: "Merah", hex: "#ef4444" }, { name: "Merah Gelap", hex: "#dc2626" }, { name: "Merah Paling Gelap", hex: "#b91c1c" },
  // Rose
  { name: "Rose Paling Muda", hex: "#fda4af" }, { name: "Rose Muda", hex: "#fb7185" }, { name: "Rose", hex: "#f43f5e" }, { name: "Rose Gelap", hex: "#e11d48" }, { name: "Rose Paling Gelap", hex: "#be123c" },
  // Pink
  { name: "Pink Paling Muda", hex: "#f9a8d4" }, { name: "Pink Muda", hex: "#f472b6" }, { name: "Pink", hex: "#ec4899" }, { name: "Pink Gelap", hex: "#db2777" }, { name: "Pink Paling Gelap", hex: "#be185d" },
  // Fuchsia
  { name: "Fuchsia Paling Muda", hex: "#f0abfc" }, { name: "Fuchsia Muda", hex: "#e879f9" }, { name: "Fuchsia", hex: "#d946ef" }, { name: "Fuchsia Gelap", hex: "#c026d3" }, { name: "Fuchsia Paling Gelap", hex: "#a21caf" },
  // Purple
  { name: "Ungu Paling Muda", hex: "#d8b4fe" }, { name: "Ungu Muda", hex: "#c084fc" }, { name: "Ungu", hex: "#a855f7" }, { name: "Ungu Gelap", hex: "#9333ea" }, { name: "Ungu Paling Gelap", hex: "#7e22ce" },
  // Violet
  { name: "Violet Paling Muda", hex: "#c4b5fd" }, { name: "Violet Muda", hex: "#a78bfa" }, { name: "Violet", hex: "#8b5cf6" }, { name: "Violet Gelap", hex: "#7c3aed" }, { name: "Violet Paling Gelap", hex: "#6d28d9" },
  // Indigo
  { name: "Nila Paling Muda", hex: "#a5b4fc" }, { name: "Nila Muda", hex: "#818cf8" }, { name: "Nila", hex: "#6366f1" }, { name: "Nila Gelap", hex: "#4f46e5" }, { name: "Nila Paling Gelap", hex: "#4338ca" },
  // Blue
  { name: "Biru Paling Muda", hex: "#93c5fd" }, { name: "Biru Muda", hex: "#60a5fa" }, { name: "Biru", hex: "#3b82f6" }, { name: "Biru Gelap", hex: "#2563eb" }, { name: "Biru Paling Gelap", hex: "#1d4ed8" },
  // Sky
  { name: "Sky Paling Muda", hex: "#7dd3fc" }, { name: "Sky Muda", hex: "#38bdf8" }, { name: "Sky", hex: "#0ea5e9" }, { name: "Sky Gelap", hex: "#0284c7" }, { name: "Sky Paling Gelap", hex: "#0369a1" },
  // Cyan
  { name: "Cyan Paling Muda", hex: "#67e8f9" }, { name: "Cyan Muda", hex: "#22d3ee" }, { name: "Cyan", hex: "#06b6d4" }, { name: "Cyan Gelap", hex: "#0891b2" }, { name: "Cyan Paling Gelap", hex: "#0e7490" },
  // Teal
  { name: "Teal Paling Muda", hex: "#5eead4" }, { name: "Teal Muda", hex: "#2dd4bf" }, { name: "Teal", hex: "#14b8a6" }, { name: "Teal Gelap", hex: "#0d9488" }, { name: "Teal Paling Gelap", hex: "#0f766e" },
  // Emerald
  { name: "Zamrud Paling Muda", hex: "#6ee7b7" }, { name: "Zamrud Muda", hex: "#34d399" }, { name: "Zamrud", hex: "#10b981" }, { name: "Zamrud Gelap", hex: "#059669" }, { name: "Zamrud Paling Gelap", hex: "#047857" },
  // Green
  { name: "Hijau Paling Muda", hex: "#86efac" }, { name: "Hijau Muda", hex: "#4ade80" }, { name: "Hijau", hex: "#22c55e" }, { name: "Hijau Gelap", hex: "#16a34a" }, { name: "Hijau Paling Gelap", hex: "#15803d" },
  // Lime
  { name: "Lime Paling Muda", hex: "#bef264" }, { name: "Lime Muda", hex: "#a3e635" }, { name: "Lime", hex: "#84cc16" }, { name: "Lime Gelap", hex: "#65a30d" }, { name: "Lime Paling Gelap", hex: "#4d7c0f" },
  // Yellow
  { name: "Kuning Paling Muda", hex: "#fde047" }, { name: "Kuning Muda", hex: "#facc15" }, { name: "Kuning", hex: "#eab308" }, { name: "Kuning Gelap", hex: "#ca8a04" }, { name: "Kuning Paling Gelap", hex: "#a16207" },
  // Amber
  { name: "Amber Paling Muda", hex: "#fcd34d" }, { name: "Amber Muda", hex: "#fbbf24" }, { name: "Amber", hex: "#f59e0b" }, { name: "Amber Gelap", hex: "#d97706" }, { name: "Amber Paling Gelap", hex: "#b45309" },
  // Orange
  { name: "Oranye Paling Muda", hex: "#fdba74" }, { name: "Oranye Muda", hex: "#fb923c" }, { name: "Oranye", hex: "#f97316" }, { name: "Oranye Gelap", hex: "#ea580c" }, { name: "Oranye Paling Gelap", hex: "#c2410c" },
  // Slate
  { name: "Slate Paling Muda", hex: "#cbd5e1" }, { name: "Slate Muda", hex: "#94a3b8" }, { name: "Slate", hex: "#64748b" }, { name: "Slate Gelap", hex: "#475569" }, { name: "Slate Paling Gelap", hex: "#334155" },
  // Stone
  { name: "Stone Paling Muda", hex: "#d6d3d1" }, { name: "Stone Muda", hex: "#a8a29e" }, { name: "Stone", hex: "#78716c" }, { name: "Stone Gelap", hex: "#57534e" }, { name: "Stone Paling Gelap", hex: "#44403c" },
  // Black/White/Monochrome
  { name: "Abu-abu Pucat", hex: "#f8fafc" }, { name: "Abu-abu Terang", hex: "#e2e8f0" }, { name: "Abu-abu Tua", hex: "#0f172a" }, { name: "Hampir Hitam", hex: "#020617" }, { name: "Hitam Pekat", hex: "#000000" },
];

export function LabelManager({ labels }: { labels: any[] }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [mainLevel, setMainLevel] = useState("");
  const [subLevel, setSubLevel] = useState("");
  const [color, setColor] = useState("#3b82f6");

  // Custom modal states
  const [deleteModal, setDeleteModal] = useState(false);
  const [labelToDelete, setLabelToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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

  const confirmDelete = (id: string, name: string) => {
    setLabelToDelete({ id, name });
    setDeleteError("");
    setDeleteModal(true);
  };

  const handleExecuteDelete = async () => {
    if (!labelToDelete) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteLabel(labelToDelete.id);
      setDeleteModal(false);
      setLabelToDelete(null);
      router.refresh();
    } catch (error: any) {
      setDeleteError(error.message || "Gagal menghapus label.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-900/5 sm:rounded-xl overflow-hidden">
      {isSubmitting && <LoadingSpinner usePortal={true} />}

      {/* Delete Confirmation Modal */}
      {deleteModal && labelToDelete && (
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
              Hapus Label / Tingkat Level?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2 leading-relaxed">
              Apakah Anda yakin ingin menghapus label <strong className="text-slate-700 dark:text-slate-300">"{labelToDelete.name}"</strong>? Label yang masih digunakan oleh siswa tidak dapat dihapus.
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
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2.5">
                  {PREDEFINED_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setColor(c.hex)}
                      className={`w-8 h-8 rounded-full shadow-sm transition-transform hover:scale-110 focus:outline-none ${
                        color === c.hex ? "ring-4 ring-offset-2 ring-brand-500 dark:ring-offset-slate-900 scale-110" : "ring-1 ring-black/10 dark:ring-white/10"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
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
            <div className="flex shrink-0 items-center gap-x-3">
              <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-700/10 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-500/20">
                Global
              </span>
              <button 
                onClick={() => confirmDelete(label.id, label.main_level)}
                className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                title="Hapus Label"
              >
                <Icons.trash className="w-5.5 h-5.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
