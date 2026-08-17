"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import {
  createAssessmentTemplate,
  updateAssessmentTemplate,
  deleteAssessmentTemplate,
} from "@/lib/actions";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type CategoryType = "materi" | "kegiatan" | "pemahaman" | "rumah" | "afirmasi";

const CATEGORIES: {
  id: CategoryType;
  label: string;
  icon: string;
  desc: string;
  placeholderTitle: string;
  placeholderDesc: string;
}[] = [
  {
    id: "materi",
    label: "Materi Yang Diajarkan",
    icon: "📚",
    desc: "Daftar topik/materi pembelajaran utama",
    placeholderTitle: "Mengenal Huruf Vokal (A, I, U, E, O)",
    placeholderDesc: "Materi dasar membaca",
  },
  {
    id: "kegiatan",
    label: "Poin 1: Kegiatan Pembelajaran",
    icon: "📘",
    desc: "Awalan kalimat kegiatan pembelajaran kelas",
    placeholderTitle: "Belajar mengenal",
    placeholderDesc: "Opsi ini digunakan untuk materi baru",
  },
  {
    id: "pemahaman",
    label: "Poin 2: Pemahaman Ananda",
    icon: "🟢",
    desc: "Tingkat pemahaman & hasil evaluasi siswa",
    placeholderTitle: "Sudah bisa secara mandiri",
    placeholderDesc: "Tingkat pemahaman 4",
  },
  {
    id: "rumah",
    label: "Poin 3: Rekomendasi di Rumah",
    icon: "🟡",
    desc: "Saran kegiatan latihan rumah untuk orang tua",
    placeholderTitle: "Mengulang materi hari ini",
    placeholderDesc: "Saran untuk orang tua di rumah",
  },
  {
    id: "afirmasi",
    label: "Poin 4: Catatan & Afirmasi Guru",
    icon: "✨",
    desc: "Kalimat motivasi hangat & catatan perkembangan",
    placeholderTitle: "Untuk Opsi Pemahaman 1 (Masih bingung)",
    placeholderDesc: "Tetap semangat ya, sedikit demi sedikit pasti bisa",
  },
];

export function AssessmentTemplateManager({
  templates,
  labels = [],
}: {
  templates: any[];
  labels?: any[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CategoryType | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [materi, setMateri] = useState("");
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [isLabelDropdownOpen, setIsLabelDropdownOpen] = useState(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Search & Level Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilterLabelId, setSelectedFilterLabelId] = useState("");
  const [isFilterLevelDropdownOpen, setIsFilterLevelDropdownOpen] =
    useState(false);

  const currentCategoryObj = activeTab
    ? CATEGORIES.find((c) => c.id === activeTab)
    : null;
  const filteredTemplates = activeTab
    ? templates.filter((t) => (t.category || "kegiatan") === activeTab)
    : [];

  // Group templates with identical title & category into 1 single item for UI & edit operations
  const groupedTemplates = useMemo(() => {
    if (!activeTab) return [];

    const groups: { [key: string]: any } = {};

    filteredTemplates.forEach((tpl) => {
      const key = `${(tpl.category || "kegiatan").toLowerCase()}::${(tpl.title || "").trim().toLowerCase()}`;
      const labelObj = Array.isArray(tpl.label) ? tpl.label[0] : tpl.label;
      const lId = tpl.label_id || labelObj?.id;

      if (!groups[key]) {
        groups[key] = {
          id: tpl.id,
          ids: [tpl.id],
          title: tpl.title,
          materi: tpl.materi,
          category: tpl.category,
          created_at: tpl.created_at,
          labels: labelObj ? [labelObj] : [],
          label_ids: lId ? [lId] : [],
        };
      } else {
        groups[key].ids.push(tpl.id);
        if (
          labelObj &&
          !groups[key].labels.some((l: any) => l.id === labelObj.id)
        ) {
          groups[key].labels.push(labelObj);
        }
        if (lId && !groups[key].label_ids.includes(lId)) {
          groups[key].label_ids.push(lId);
        }
      }
    });

    return Object.values(groups);
  }, [filteredTemplates, activeTab]);

  // Filter grouped templates by search query and level filter
  const searchedAndFilteredTemplates = useMemo(() => {
    return groupedTemplates.filter((tpl) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (tpl.title || "").toLowerCase().includes(q) ||
        (tpl.materi || "").toLowerCase().includes(q);

      let matchesLevel = true;
      if (selectedFilterLabelId === "GLOBAL") {
        matchesLevel = !tpl.labels || tpl.labels.length === 0;
      } else if (selectedFilterLabelId) {
        matchesLevel =
          tpl.label_ids && tpl.label_ids.includes(selectedFilterLabelId);
      }

      return matchesSearch && matchesLevel;
    });
  }, [groupedTemplates, searchQuery, selectedFilterLabelId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setSubmitError("");
    try {
      const formData = new FormData();
      formData.append("category", activeTab || "kegiatan");
      formData.append("title", title.trim());
      formData.append("materi", materi.trim());

      if (selectedLabelIds.length > 0) {
        selectedLabelIds.forEach((id) => {
          formData.append("label_id", id);
        });
      }

      if (editingTemplate) {
        if (editingTemplate.ids && Array.isArray(editingTemplate.ids)) {
          editingTemplate.ids.forEach((id: string) => {
            formData.append("ids", id);
          });
        }
        await updateAssessmentTemplate(editingTemplate.id, formData);
      } else {
        await createAssessmentTemplate(formData);
      }

      setIsAdding(false);
      setEditingTemplate(null);
      resetForm();
      router.refresh();
    } catch (error: any) {
      setSubmitError(error?.message || "Gagal menyimpan opsi template.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setMateri("");
    setSelectedLabelIds([]);
    setIsLabelDropdownOpen(false);
  };

  const handleEdit = (tpl: any) => {
    setEditingTemplate(tpl);
    setTitle(tpl.title || "");
    setMateri(tpl.materi || "");
    const lIds = tpl.label_ids || (tpl.label_id ? [tpl.label_id] : []);
    setSelectedLabelIds(lIds);
    setIsLabelDropdownOpen(false);
    setIsAdding(true);
    setSubmitError("");
  };

  const confirmDelete = (tpl: any) => {
    setTemplateToDelete({ id: tpl.id, title: tpl.title, ids: tpl.ids } as any);
    setDeleteError("");
    setDeleteModal(true);
  };

  const handleExecuteDelete = async () => {
    if (!templateToDelete) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      const targetIds = (templateToDelete as any).ids || templateToDelete.id;
      await deleteAssessmentTemplate(targetIds);
      setDeleteModal(false);
      setTemplateToDelete(null);
      router.refresh();
    } catch (error: any) {
      setDeleteError(error?.message || "Gagal menghapus opsi template.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-900/5 sm:rounded-2xl relative">
      {isSubmitting && <LoadingSpinner usePortal={true} />}

      {/* Delete Confirmation Modal */}
      {deleteModal && templateToDelete && (
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
              Hapus Opsi Template?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Apakah Anda yakin ingin menghapus opsi{" "}
              <strong className="text-slate-700 dark:text-slate-300">
                &quot;{templateToDelete.title}&quot;
              </strong>
              ? Opsi ini tidak akan tampil lagi di form penilaian.
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
      <div className="px-5 py-5 sm:px-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold leading-6 text-slate-900 dark:text-white flex items-center gap-2">
              <span>📝 Kelola Template Opsi Penilaian</span>
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Atur opsi pilihan per-poin untuk memudahkan Miss menilai siswa
              cukup dengan 1-klik (Format 1/2/3/4 Client).
            </p>
          </div>

          <button
            onClick={() => {
              setEditingTemplate(null);
              resetForm();
              setIsAdding(true);
              setSubmitError("");
            }}
            className="inline-flex items-center justify-center gap-x-1.5 rounded-xl bg-sky-600 text-white px-4 py-2.5 text-xs font-bold shadow-md hover:bg-sky-700 transition-all active:scale-95 cursor-pointer shrink-0 w-full sm:w-auto"
          >
            <Icons.add className="-ml-0.5 h-4 w-4" />
            Tambah Opsi Baru
          </button>
        </div>

        {/* Category Popover Dropdown Selector */}
        <div className="relative mt-4">
          <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">
            Kategori Penilaian
          </label>
          <button
            type="button"
            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-500/60 rounded-xl shadow-xs transition-all text-left cursor-pointer"
          >
            {currentCategoryObj ? (
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span className="text-lg shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300">
                  {currentCategoryObj.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentCategoryObj.label}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {currentCategoryObj.desc}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span className="text-lg shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                  📋
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">
                    Pilih Kategori Penilaian
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    Klik untuk memilih kategori template
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 shrink-0">
              {currentCategoryObj && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-100 dark:border-sky-900">
                  {filteredTemplates.length} Opsi
                </span>
              )}
              <Icons.chevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  isCategoryDropdownOpen ? "rotate-180 text-sky-600" : ""
                }`}
              />
            </div>
          </button>

          {/* Floating Dropdown Menu Card */}
          {isCategoryDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsCategoryDropdownOpen(false)}
              />
              <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150 divide-y divide-slate-100 dark:divide-slate-800/60">
                {CATEGORIES.map((cat) => {
                  const count = templates.filter(
                    (t) => (t.category || "kegiatan") === cat.id,
                  ).length;
                  const isActive = activeTab === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(cat.id);
                        setIsCategoryDropdownOpen(false);
                        setIsAdding(false);
                        setEditingTemplate(null);
                        resetForm();
                      }}
                      className={`w-full flex items-center justify-between p-3 sm:p-3.5 text-left transition-colors cursor-pointer ${
                        isActive
                          ? "bg-sky-50/80 dark:bg-sky-950/50 font-bold"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="text-base shrink-0">{cat.icon}</span>
                        <div className="min-w-0">
                          <div
                            className={`text-xs ${isActive ? "text-sky-600 dark:text-sky-400 font-bold" : "text-slate-800 dark:text-slate-200 font-medium"} truncate`}
                          >
                            {cat.label}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {cat.desc}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            isActive
                              ? "bg-sky-600 text-white"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {count} Opsi
                        </span>
                        {isActive && (
                          <span className="text-sky-600 font-bold text-xs">
                            ✓
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add / Edit Modal Popup */}
      {isAdding && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => {
              if (!isSubmitting) {
                setIsAdding(false);
                setEditingTemplate(null);
                resetForm();
              }
            }}
          />
          <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="relative flex items-center justify-between p-5 bg-linear-to-r from-sky-600 to-indigo-600 text-white rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-lg">
                  {currentCategoryObj?.icon || "📋"}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wide">
                    {editingTemplate
                      ? "Edit Opsi Template"
                      : "Tambah Opsi Template Baru"}
                  </h3>
                  <p className="text-[11px] text-sky-100 font-medium">
                    Kategori: {currentCategoryObj?.label || "-"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingTemplate(null);
                  resetForm();
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
                  Teks / Judul Opsi Pilihan{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder={
                    currentCategoryObj?.placeholderTitle ||
                    "Masukkan judul opsi"
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Label / Level Selector - Standard Worksheet Form Style */}
              {activeTab === "materi" && labels.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      🎯 Pilih Level Siswa
                    </label>
                    <span className="text-[10px] font-extrabold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                      {selectedLabelIds.length === 0
                        ? "Semua Level"
                        : `${selectedLabelIds.length} Level Dipilih`}
                    </span>
                  </div>

                  <div className="relative">
                    {/* Standard Single Row Dropdown Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setIsLabelDropdownOpen(!isLabelDropdownOpen)
                      }
                      className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold shadow-xs cursor-pointer text-left transition-all ${
                        isLabelDropdownOpen
                          ? "border-sky-500 ring-2 ring-sky-500/20 bg-white dark:bg-slate-900"
                          : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {selectedLabelIds.length === 0 ? (
                          <span className="truncate text-slate-600 dark:text-slate-300 font-semibold">
                            🌐 Semua Level (Materi Bebas / Global)
                          </span>
                        ) : selectedLabelIds.length === 1 ? (
                          (() => {
                            const lbl = labels.find(
                              (l) => l.id === selectedLabelIds[0],
                            );
                            return (
                              <span className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 truncate">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                                  style={{
                                    backgroundColor:
                                      lbl?.hex_color || "#94a3b8",
                                  }}
                                />
                                {lbl
                                  ? `${lbl.main_level} - ${lbl.sub_level}`
                                  : "1 Level Dipilih"}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="font-extrabold text-sky-600 dark:text-sky-400 truncate">
                            ✨ {selectedLabelIds.length} Level Terpilih (Klik
                            untuk ubah)
                          </span>
                        )}
                      </div>
                      <Icons.chevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                          isLabelDropdownOpen ? "rotate-180 text-sky-500" : ""
                        }`}
                      />
                    </button>

                    {/* Popover Dropdown List */}
                    {isLabelDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsLabelDropdownOpen(false)}
                        />
                        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                          {/* Quick action bar */}
                          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/80 px-1">
                            <button
                              type="button"
                              onClick={() => setSelectedLabelIds([])}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                                selectedLabelIds.length === 0
                                  ? "bg-sky-600 text-white shadow-xs"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                              }`}
                            >
                              🌐 Semua Level
                            </button>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedLabelIds(labels.map((l) => l.id))
                                }
                                className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 hover:bg-sky-100 cursor-pointer"
                              >
                                ✓ Pilih Semua
                              </button>
                              {selectedLabelIds.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedLabelIds([])}
                                  className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                          </div>

                          {/* List of selectable levels */}
                          {labels.map((lbl) => {
                            const isSel = selectedLabelIds.includes(lbl.id);
                            return (
                              <button
                                key={lbl.id}
                                type="button"
                                onClick={() => {
                                  if (isSel) {
                                    setSelectedLabelIds(
                                      selectedLabelIds.filter(
                                        (id) => id !== lbl.id,
                                      ),
                                    );
                                  } else {
                                    setSelectedLabelIds([
                                      ...selectedLabelIds,
                                      lbl.id,
                                    ]);
                                  }
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                                  isSel
                                    ? "bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 font-extrabold"
                                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                                }`}
                              >
                                <span className="flex items-center gap-2.5 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isSel}
                                    readOnly
                                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-700 cursor-pointer pointer-events-none"
                                  />
                                  <span
                                    className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                                    style={{ backgroundColor: lbl.hex_color }}
                                  />
                                  <span className="truncate">
                                    {lbl.main_level} - {lbl.sub_level}
                                  </span>
                                </span>
                                {isSel && (
                                  <span className="text-sky-600 shrink-0 text-xs font-bold">
                                    ✓
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Penjelasan Jelas Mengenai Dampak Pilihan Level */}
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                    {selectedLabelIds.length === 0 ? (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                        <span>ℹ️</span>
                        <span>
                          <strong>Materi Bebas/Global:</strong> Materi ini akan
                          langsung muncul untuk semua siswa di cabang Anda.
                        </span>
                      </p>
                    ) : (
                      <div>
                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                          <span>📌</span>
                          <span>
                            Materi ini otomatis terdaftar untuk{" "}
                            <strong>{selectedLabelIds.length} level</strong>{" "}
                            berikut:
                          </span>
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {selectedLabelIds.map((id) => {
                            const lbl = labels.find((l) => l.id === id);
                            if (!lbl) return null;
                            return (
                              <span
                                key={id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs"
                              >
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                                  style={{
                                    backgroundColor: lbl.hex_color || "#3b82f6",
                                  }}
                                />
                                <span>
                                  {lbl.main_level} - {lbl.sub_level}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingTemplate(null);
                    resetForm();
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting
                    ? "Menyimpan..."
                    : editingTemplate
                      ? "✓ Simpan Perubahan"
                      : "✓ Tambah Opsi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search & Level Filter Bar */}
      {activeTab && (
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input Box */}
            <div className="relative flex-1">
              <Icons.search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={`Cari opsi ${currentCategoryObj?.label.toLowerCase() || ""}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold w-5 h-5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center transition-all cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter by Level Custom Dropdown */}
            {activeTab === "materi" && labels.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="relative min-w-42.5 sm:w-56">
                  <button
                    type="button"
                    onClick={() =>
                      setIsFilterLevelDropdownOpen(!isFilterLevelDropdownOpen)
                    }
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-bold shadow-2xs cursor-pointer text-left transition-all ${
                      isFilterLevelDropdownOpen
                        ? "border-sky-500 ring-2 ring-sky-500/20 bg-white dark:bg-slate-900"
                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      {!selectedFilterLabelId ? (
                        <span className="truncate text-slate-700 dark:text-slate-200 font-semibold">
                          🎯 Semua Level
                        </span>
                      ) : selectedFilterLabelId === "GLOBAL" ? (
                        <span className="truncate text-slate-700 dark:text-slate-200 font-semibold">
                          🌐 Materi Bebas (Global)
                        </span>
                      ) : (
                        (() => {
                          const lbl = labels.find(
                            (l) => l.id === selectedFilterLabelId,
                          );
                          return (
                            <span className="flex items-center gap-2 truncate text-slate-800 dark:text-slate-100 font-bold">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs border border-black/10"
                                style={{
                                  backgroundColor: lbl?.hex_color || "#0ea5e9",
                                }}
                              />
                              <span className="truncate">
                                {lbl
                                  ? `${lbl.main_level} - ${lbl.sub_level}`
                                  : "Level Terpilih"}
                              </span>
                            </span>
                          );
                        })()
                      )}
                    </div>
                    <Icons.chevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                        isFilterLevelDropdownOpen
                          ? "rotate-180 text-sky-500"
                          : ""
                      }`}
                    />
                  </button>

                  {/* Custom Popover List */}
                  {isFilterLevelDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsFilterLevelDropdownOpen(false)}
                      />
                      <div className="absolute top-full left-0 mt-1.5 z-50 w-64 max-w-[calc(100vw-2.5rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 space-y-1 max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                        {/* Option: Semua Level */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFilterLabelId("");
                            setIsFilterLevelDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                            !selectedFilterLabelId
                              ? "bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <span>🎯 Semua Level</span>
                          {!selectedFilterLabelId && (
                            <span className="text-sky-600 font-bold">✓</span>
                          )}
                        </button>

                        {/* Option: Materi Bebas (Global) */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFilterLabelId("GLOBAL");
                            setIsFilterLevelDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                            selectedFilterLabelId === "GLOBAL"
                              ? "bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <span>🌐 Materi Bebas (Global)</span>
                          {selectedFilterLabelId === "GLOBAL" && (
                            <span className="text-sky-600 font-bold">✓</span>
                          )}
                        </button>

                        <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                        {/* List of Levels with Colorful Dots */}
                        {labels.map((lbl) => {
                          const isSel = selectedFilterLabelId === lbl.id;
                          return (
                            <button
                              key={lbl.id}
                              type="button"
                              onClick={() => {
                                setSelectedFilterLabelId(lbl.id);
                                setIsFilterLevelDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                                isSel
                                  ? "bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300"
                                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              <span className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className="w-3 h-3 rounded-full shrink-0 shadow-2xs border border-black/10"
                                  style={{
                                    backgroundColor: lbl.hex_color || "#0ea5e9",
                                  }}
                                />
                                <span className="truncate">
                                  {lbl.main_level} - {lbl.sub_level}
                                </span>
                              </span>
                              {isSel && (
                                <span className="text-sky-600 shrink-0 font-bold">
                                  ✓
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {(searchQuery || selectedFilterLabelId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedFilterLabelId("");
                      setIsFilterLevelDropdownOpen(false);
                    }}
                    className="px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all cursor-pointer shrink-0"
                    title="Reset Filter"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Counter & Status Info */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold px-0.5">
            <span>
              Menampilkan <strong>{searchedAndFilteredTemplates.length}</strong>{" "}
              dari {groupedTemplates.length} Opsi
            </span>
            {(searchQuery || selectedFilterLabelId) && (
              <span className="text-sky-600 dark:text-sky-400 font-bold">
                Filter Aktif
              </span>
            )}
          </div>
        </div>
      )}

      {/* Templates List per Tab */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {!activeTab ? (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-2xl">
              📋
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Pilih Kategori Penilaian
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
              Silakan pilih salah satu kategori di dropdown di atas untuk
              melihat dan mengelola opsi template penilaian.
            </p>
          </div>
        ) : searchedAndFilteredTemplates.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-2xl">
              🔍
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Tidak Ada Opsi Materi Yang Cocok
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
              {searchQuery || selectedFilterLabelId
                ? "Coba ubah kata kunci pencarian atau filter level Anda."
                : 'Klik tombol "Tambah Opsi Baru" di atas untuk menambahkan materi baru.'}
            </p>
            {(searchQuery || selectedFilterLabelId) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedFilterLabelId("");
                }}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>
        ) : (
          searchedAndFilteredTemplates.map((tpl: any, index: number) => (
            <div
              key={tpl.id}
              className="p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 border border-sky-200 dark:border-sky-800">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        {tpl.title}
                      </h4>

                      {/* Multi-Level Badges List */}
                      {activeTab === "materi" && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {tpl.labels && tpl.labels.length > 0 ? (
                            tpl.labels.map((labelObj: any) => (
                              <span
                                key={labelObj.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs"
                              >
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs border border-black/10"
                                  style={{
                                    backgroundColor:
                                      labelObj.hex_color || "#0ea5e9",
                                  }}
                                />
                                <span>
                                  {labelObj.main_level} - {labelObj.sub_level}
                                </span>
                              </span>
                            ))
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              🌐 Semua Level (Materi Bebas)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0 -mt-0.5">
                      <button
                        onClick={() => handleEdit(tpl)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/50 transition-colors cursor-pointer"
                        title="Edit Opsi"
                      >
                        <Icons.edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => confirmDelete(tpl)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                        title="Hapus Opsi"
                      >
                        <Icons.trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
