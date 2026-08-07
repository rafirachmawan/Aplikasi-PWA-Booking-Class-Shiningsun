"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import { createLabel, deleteLabel } from "@/lib/actions";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// Setiap baris = 1 keluarga warna, urutan: paling terang (50) → paling gelap (950)
const PREDEFINED_COLORS = [
  // Merah (Red)
  { name: "Merah 50",  hex: "#fef2f2" }, { name: "Merah 100", hex: "#fee2e2" }, { name: "Merah 200", hex: "#fecaca" }, { name: "Merah 300", hex: "#fca5a5" }, { name: "Merah 400", hex: "#f87171" }, { name: "Merah 500", hex: "#ef4444" }, { name: "Merah 600", hex: "#dc2626" }, { name: "Merah 700", hex: "#b91c1c" }, { name: "Merah 800", hex: "#991b1b" }, { name: "Merah 900", hex: "#7f1d1d" }, { name: "Merah 950", hex: "#450a0a" },
  // Rose
  { name: "Rose 50",  hex: "#fff1f2" }, { name: "Rose 100", hex: "#ffe4e6" }, { name: "Rose 200", hex: "#fecdd3" }, { name: "Rose 300", hex: "#fda4af" }, { name: "Rose 400", hex: "#fb7185" }, { name: "Rose 500", hex: "#f43f5e" }, { name: "Rose 600", hex: "#e11d48" }, { name: "Rose 700", hex: "#be123c" }, { name: "Rose 800", hex: "#9f1239" }, { name: "Rose 900", hex: "#881337" }, { name: "Rose 950", hex: "#4c0519" },
  // Pink
  { name: "Pink 50",  hex: "#fdf2f8" }, { name: "Pink 100", hex: "#fce7f3" }, { name: "Pink 200", hex: "#fbcfe8" }, { name: "Pink 300", hex: "#f9a8d4" }, { name: "Pink 400", hex: "#f472b6" }, { name: "Pink 500", hex: "#ec4899" }, { name: "Pink 600", hex: "#db2777" }, { name: "Pink 700", hex: "#be185d" }, { name: "Pink 800", hex: "#9d174d" }, { name: "Pink 900", hex: "#831843" }, { name: "Pink 950", hex: "#500724" },
  // Fuchsia
  { name: "Fuchsia 50",  hex: "#fdf4ff" }, { name: "Fuchsia 100", hex: "#fae8ff" }, { name: "Fuchsia 200", hex: "#f5d0fe" }, { name: "Fuchsia 300", hex: "#f0abfc" }, { name: "Fuchsia 400", hex: "#e879f9" }, { name: "Fuchsia 500", hex: "#d946ef" }, { name: "Fuchsia 600", hex: "#c026d3" }, { name: "Fuchsia 700", hex: "#a21caf" }, { name: "Fuchsia 800", hex: "#86198f" }, { name: "Fuchsia 900", hex: "#701a75" }, { name: "Fuchsia 950", hex: "#4a044e" },
  // Ungu (Purple)
  { name: "Ungu 50",  hex: "#faf5ff" }, { name: "Ungu 100", hex: "#f3e8ff" }, { name: "Ungu 200", hex: "#e9d5ff" }, { name: "Ungu 300", hex: "#d8b4fe" }, { name: "Ungu 400", hex: "#c084fc" }, { name: "Ungu 500", hex: "#a855f7" }, { name: "Ungu 600", hex: "#9333ea" }, { name: "Ungu 700", hex: "#7e22ce" }, { name: "Ungu 800", hex: "#6b21a8" }, { name: "Ungu 900", hex: "#581c87" }, { name: "Ungu 950", hex: "#3b0764" },
  // Violet
  { name: "Violet 50",  hex: "#f5f3ff" }, { name: "Violet 100", hex: "#ede9fe" }, { name: "Violet 200", hex: "#ddd6fe" }, { name: "Violet 300", hex: "#c4b5fd" }, { name: "Violet 400", hex: "#a78bfa" }, { name: "Violet 500", hex: "#8b5cf6" }, { name: "Violet 600", hex: "#7c3aed" }, { name: "Violet 700", hex: "#6d28d9" }, { name: "Violet 800", hex: "#5b21b6" }, { name: "Violet 900", hex: "#4c1d95" }, { name: "Violet 950", hex: "#2e1065" },
  // Nila (Indigo)
  { name: "Nila 50",  hex: "#eef2ff" }, { name: "Nila 100", hex: "#e0e7ff" }, { name: "Nila 200", hex: "#c7d2fe" }, { name: "Nila 300", hex: "#a5b4fc" }, { name: "Nila 400", hex: "#818cf8" }, { name: "Nila 500", hex: "#6366f1" }, { name: "Nila 600", hex: "#4f46e5" }, { name: "Nila 700", hex: "#4338ca" }, { name: "Nila 800", hex: "#3730a3" }, { name: "Nila 900", hex: "#312e81" }, { name: "Nila 950", hex: "#1e1b4b" },
  // Biru (Blue)
  { name: "Biru 50",  hex: "#eff6ff" }, { name: "Biru 100", hex: "#dbeafe" }, { name: "Biru 200", hex: "#bfdbfe" }, { name: "Biru 300", hex: "#93c5fd" }, { name: "Biru 400", hex: "#60a5fa" }, { name: "Biru 500", hex: "#3b82f6" }, { name: "Biru 600", hex: "#2563eb" }, { name: "Biru 700", hex: "#1d4ed8" }, { name: "Biru 800", hex: "#1e40af" }, { name: "Biru 900", hex: "#1e3a8a" }, { name: "Biru 950", hex: "#172554" },
  // Sky
  { name: "Sky 50",  hex: "#f0f9ff" }, { name: "Sky 100", hex: "#e0f2fe" }, { name: "Sky 200", hex: "#bae6fd" }, { name: "Sky 300", hex: "#7dd3fc" }, { name: "Sky 400", hex: "#38bdf8" }, { name: "Sky 500", hex: "#0ea5e9" }, { name: "Sky 600", hex: "#0284c7" }, { name: "Sky 700", hex: "#0369a1" }, { name: "Sky 800", hex: "#075985" }, { name: "Sky 900", hex: "#0c4a6e" }, { name: "Sky 950", hex: "#082f49" },
  // Cyan
  { name: "Cyan 50",  hex: "#ecfeff" }, { name: "Cyan 100", hex: "#cffafe" }, { name: "Cyan 200", hex: "#a5f3fc" }, { name: "Cyan 300", hex: "#67e8f9" }, { name: "Cyan 400", hex: "#22d3ee" }, { name: "Cyan 500", hex: "#06b6d4" }, { name: "Cyan 600", hex: "#0891b2" }, { name: "Cyan 700", hex: "#0e7490" }, { name: "Cyan 800", hex: "#155e75" }, { name: "Cyan 900", hex: "#164e63" }, { name: "Cyan 950", hex: "#083344" },
  // Teal
  { name: "Teal 50",  hex: "#f0fdfa" }, { name: "Teal 100", hex: "#ccfbf1" }, { name: "Teal 200", hex: "#99f6e4" }, { name: "Teal 300", hex: "#5eead4" }, { name: "Teal 400", hex: "#2dd4bf" }, { name: "Teal 500", hex: "#14b8a6" }, { name: "Teal 600", hex: "#0d9488" }, { name: "Teal 700", hex: "#0f766e" }, { name: "Teal 800", hex: "#115e59" }, { name: "Teal 900", hex: "#134e4a" }, { name: "Teal 950", hex: "#042f2e" },
  // Zamrud (Emerald)
  { name: "Zamrud 50",  hex: "#ecfdf5" }, { name: "Zamrud 100", hex: "#d1fae5" }, { name: "Zamrud 200", hex: "#a7f3d0" }, { name: "Zamrud 300", hex: "#6ee7b7" }, { name: "Zamrud 400", hex: "#34d399" }, { name: "Zamrud 500", hex: "#10b981" }, { name: "Zamrud 600", hex: "#059669" }, { name: "Zamrud 700", hex: "#047857" }, { name: "Zamrud 800", hex: "#065f46" }, { name: "Zamrud 900", hex: "#064e3b" }, { name: "Zamrud 950", hex: "#022c22" },
  // Hijau (Green)
  { name: "Hijau 50",  hex: "#f0fdf4" }, { name: "Hijau 100", hex: "#dcfce7" }, { name: "Hijau 200", hex: "#bbf7d0" }, { name: "Hijau 300", hex: "#86efac" }, { name: "Hijau 400", hex: "#4ade80" }, { name: "Hijau 500", hex: "#22c55e" }, { name: "Hijau 600", hex: "#16a34a" }, { name: "Hijau 700", hex: "#15803d" }, { name: "Hijau 800", hex: "#166534" }, { name: "Hijau 900", hex: "#14532d" }, { name: "Hijau 950", hex: "#052e16" },
  // Lime
  { name: "Lime 50",  hex: "#f7fee7" }, { name: "Lime 100", hex: "#ecfccb" }, { name: "Lime 200", hex: "#d9f99d" }, { name: "Lime 300", hex: "#bef264" }, { name: "Lime 400", hex: "#a3e635" }, { name: "Lime 500", hex: "#84cc16" }, { name: "Lime 600", hex: "#65a30d" }, { name: "Lime 700", hex: "#4d7c0f" }, { name: "Lime 800", hex: "#3f6212" }, { name: "Lime 900", hex: "#365314" }, { name: "Lime 950", hex: "#1a2e05" },
  // Kuning (Yellow)
  { name: "Kuning 50",  hex: "#fefce8" }, { name: "Kuning 100", hex: "#fef9c3" }, { name: "Kuning 200", hex: "#fef08a" }, { name: "Kuning 300", hex: "#fde047" }, { name: "Kuning 400", hex: "#facc15" }, { name: "Kuning 500", hex: "#eab308" }, { name: "Kuning 600", hex: "#ca8a04" }, { name: "Kuning 700", hex: "#a16207" }, { name: "Kuning 800", hex: "#854d0e" }, { name: "Kuning 900", hex: "#713f12" }, { name: "Kuning 950", hex: "#422006" },
  // Amber
  { name: "Amber 50",  hex: "#fffbeb" }, { name: "Amber 100", hex: "#fef3c7" }, { name: "Amber 200", hex: "#fde68a" }, { name: "Amber 300", hex: "#fcd34d" }, { name: "Amber 400", hex: "#fbbf24" }, { name: "Amber 500", hex: "#f59e0b" }, { name: "Amber 600", hex: "#d97706" }, { name: "Amber 700", hex: "#b45309" }, { name: "Amber 800", hex: "#92400e" }, { name: "Amber 900", hex: "#78350f" }, { name: "Amber 950", hex: "#451a03" },
  // Oranye (Orange)
  { name: "Oranye 50",  hex: "#fff7ed" }, { name: "Oranye 100", hex: "#ffedd5" }, { name: "Oranye 200", hex: "#fed7aa" }, { name: "Oranye 300", hex: "#fdba74" }, { name: "Oranye 400", hex: "#fb923c" }, { name: "Oranye 500", hex: "#f97316" }, { name: "Oranye 600", hex: "#ea580c" }, { name: "Oranye 700", hex: "#c2410c" }, { name: "Oranye 800", hex: "#9a3412" }, { name: "Oranye 900", hex: "#7c2d12" }, { name: "Oranye 950", hex: "#431407" },
  // Slate (Abu-abu Kebiruan)
  { name: "Slate 50",  hex: "#f8fafc" }, { name: "Slate 100", hex: "#f1f5f9" }, { name: "Slate 200", hex: "#e2e8f0" }, { name: "Slate 300", hex: "#cbd5e1" }, { name: "Slate 400", hex: "#94a3b8" }, { name: "Slate 500", hex: "#64748b" }, { name: "Slate 600", hex: "#475569" }, { name: "Slate 700", hex: "#334155" }, { name: "Slate 800", hex: "#1e293b" }, { name: "Slate 900", hex: "#0f172a" }, { name: "Slate 950", hex: "#020617" },
  // Stone (Abu-abu Kecoklatan)
  { name: "Stone 50",  hex: "#fafaf9" }, { name: "Stone 100", hex: "#f5f5f4" }, { name: "Stone 200", hex: "#e7e5e4" }, { name: "Stone 300", hex: "#d6d3d1" }, { name: "Stone 400", hex: "#a8a29e" }, { name: "Stone 500", hex: "#78716c" }, { name: "Stone 600", hex: "#57534e" }, { name: "Stone 700", hex: "#44403c" }, { name: "Stone 800", hex: "#292524" }, { name: "Stone 900", hex: "#1c1917" }, { name: "Stone 950", hex: "#0c0a09" },
];

export function LabelManager({ labels, role }: { labels: any[], role?: string | null }) {
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

  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
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
    } catch (error: any) {
      setSubmitError(error?.message || "Gagal menyimpan label.");
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
          {submitError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-300">
              ⚠️ {submitError}
            </div>
          )}
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
                <div className="grid grid-cols-11 gap-1.5">
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
              <div className="h-10 w-10 flex-none rounded-full shadow-sm ring-1 ring-black/10 dark:ring-white/10" style={{ backgroundColor: label.hex_color }} />
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
              {role === 'SUPERADMIN' && (
                <button 
                  onClick={() => confirmDelete(label.id, label.main_level)}
                  className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                  title="Hapus Label"
                >
                  <Icons.trash className="w-5.5 h-5.5" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
