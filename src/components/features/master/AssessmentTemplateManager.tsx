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

type CategoryType =
  | "materi"
  | "kegiatan"
  | "pemahaman"
  | "rumah"
  | "afirmasi"
  | "ijin"
  | "sakit";

const CATEGORIES: {
  id: CategoryType;
  label: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
  desc: string;
  placeholderTitle: string;
  placeholderDesc: string;
}[] = [
  {
    id: "materi",
    label: "Materi Yang Diajarkan",
    icon: Icons.fileText,
    desc: "Daftar topik/materi pembelajaran utama",
    placeholderTitle: "Mengenal Huruf Vokal (A, I, U, E, O)",
    placeholderDesc: "Materi dasar membaca",
  },
  {
    id: "kegiatan",
    label: "Poin 1: Kegiatan Pembelajaran",
    icon: Icons.edit,
    desc: "Awalan kalimat kegiatan pembelajaran kelas",
    placeholderTitle: "Belajar mengenal",
    placeholderDesc: "Opsi ini digunakan untuk materi baru",
  },
  {
    id: "pemahaman",
    label: "Poin 2: Pemahaman Ananda",
    icon: Icons.check,
    desc: "Tingkat pemahaman & hasil evaluasi siswa",
    placeholderTitle: "Sudah bisa secara mandiri",
    placeholderDesc: "Tingkat pemahaman 4",
  },
  {
    id: "rumah",
    label: "Poin 3: Rekomendasi di Rumah",
    icon: Icons.home,
    desc: "Saran kegiatan latihan rumah untuk orang tua",
    placeholderTitle: "Mengulang materi hari ini",
    placeholderDesc: "Saran untuk orang tua di rumah",
  },
  {
    id: "afirmasi",
    label: "Poin 4: Catatan & Afirmasi Guru",
    icon: Icons.star,
    desc: "Kalimat motivasi hangat & catatan perkembangan",
    placeholderTitle: "Untuk Opsi Pemahaman 1 (Masih bingung)",
    placeholderDesc: "Tetap semangat ya, sedikit demi sedikit pasti bisa",
  },
  {
    id: "ijin",
    label: "Alasan Ijin",
    icon: Icons.calendar,
    desc: "Opsi alasan ketidakhadiran karena Ijin (dropdown di laporan)",
    placeholderTitle: "Ijin acara keluarga",
    placeholderDesc: "Opsi alasan ijin untuk Miss",
  },
  {
    id: "sakit",
    label: "Alasan Sakit",
    icon: Icons.alertCircle,
    desc: "Opsi alasan ketidakhadiran karena Sakit (dropdown di laporan)",
    placeholderTitle: "Sakit demam, istirahat di rumah",
    placeholderDesc: "Opsi alasan sakit untuk Miss",
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
    <div className="bg-white dark:bg-zinc-900 shadow-sm border border-slate-200 dark:border-zinc-800 rounded-2xl relative">
      {isSubmitting && <LoadingSpinner usePortal={true} />}

      {/* Delete Confirmation Modal */}
      {deleteModal && templateToDelete && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !isDeleting && setDeleteModal(false)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/15 flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
              <Icons.trash className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Hapus Opsi Template?
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">
              Apakah Anda yakin ingin menghapus opsi{" "}
              <strong className="text-slate-700 dark:text-zinc-200">
                &quot;{templateToDelete.title}&quot;
              </strong>
              ? Opsi ini tidak akan tampil lagi di form penilaian.
            </p>

            {deleteError && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-3 text-center font-medium bg-red-50 dark:bg-red-500/10 p-2.5 rounded-xl border border-red-200 dark:border-red-800/50">
                {deleteError}
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleExecuteDelete}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:translate-y-[1px] transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section Header */}
      <div className="px-5 py-5 sm:px-6 border-b border-slate-200 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-bold leading-6 text-slate-900 dark:text-white">
              Kelola Template Opsi Penilaian
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
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
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 text-white px-4 py-2.5 text-xs font-bold hover:bg-brand-700 active:translate-y-[1px] transition-colors cursor-pointer shrink-0 w-full sm:w-auto"
          >
            <Icons.add className="h-4 w-4" />
            Tambah Opsi Baru
          </button>
        </div>

        {/* Category Popover Dropdown Selector */}
        <div className="relative mt-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
            Kategori Penilaian
          </label>
          <button
            type="button"
            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            aria-expanded={isCategoryDropdownOpen}
            className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-600 rounded-xl transition-colors text-left cursor-pointer"
          >
            {currentCategoryObj ? (
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400">
                  <currentCategoryObj.icon className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentCategoryObj.label}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-zinc-500 truncate">
                    {currentCategoryObj.desc}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500">
                  <Icons.fileText className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-500 dark:text-zinc-400 truncate">
                    Pilih Kategori Penilaian
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-zinc-500 truncate">
                    Klik untuk memilih kategori template
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 shrink-0">
              {currentCategoryObj && (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 border border-brand-200 dark:border-brand-800/50 tabular-nums">
                  {filteredTemplates.length} Opsi
                </span>
              )}
              <Icons.chevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  isCategoryDropdownOpen ? "rotate-180 text-brand-600" : ""
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
              <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-200 dark:divide-zinc-800">
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
                          ? "bg-brand-50 dark:bg-brand-500/15 font-bold"
                          : "hover:bg-slate-50 dark:hover:bg-zinc-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span
                          className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-lg ${
                            isActive
                              ? "bg-brand-600 text-white"
                              : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400"
                          }`}
                        >
                          <cat.icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <div
                            className={`text-xs ${isActive ? "text-brand-700 dark:text-brand-300 font-bold" : "text-slate-800 dark:text-zinc-200 font-medium"} truncate`}
                          >
                            {cat.label}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-zinc-500 truncate">
                            {cat.desc}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg tabular-nums ${
                            isActive
                              ? "bg-brand-600 text-white"
                              : "bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          {count} Opsi
                        </span>
                        {isActive && (
                          <span className="text-brand-600 dark:text-brand-400 font-bold text-xs">
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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => {
              if (!isSubmitting) {
                setIsAdding(false);
                setEditingTemplate(null);
                resetForm();
              }
            }}
          />
          <div className="relative z-10 w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 p-5 border-b border-slate-200 dark:border-zinc-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                  {currentCategoryObj ? (
                    <currentCategoryObj.icon className="w-5 h-5" />
                  ) : (
                    <Icons.fileText className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {editingTemplate
                      ? "Edit Opsi Template"
                      : "Tambah Opsi Template Baru"}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium truncate">
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
                aria-label="Tutup"
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <Icons.close className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {submitError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800/50 text-xs font-semibold text-red-600 dark:text-red-400">
                  {submitError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
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
                  className="w-full rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-4 py-2.5 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Label / Level Selector - Standard Worksheet Form Style */}
              {activeTab === "materi" && labels.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300">
                      Pilih Level Siswa
                    </label>
                    <span className="text-[10px] font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-500/15 px-2.5 py-0.5 rounded-lg border border-brand-200 dark:border-brand-800/50 tabular-nums">
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
                      aria-expanded={isLabelDropdownOpen}
                      className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold cursor-pointer text-left transition-colors ${
                        isLabelDropdownOpen
                          ? "border-brand-500 ring-2 ring-brand-500/30 bg-white dark:bg-zinc-900"
                          : "border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 hover:border-slate-400 dark:hover:border-zinc-600"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {selectedLabelIds.length === 0 ? (
                          <span className="truncate text-slate-600 dark:text-zinc-300 font-semibold">
                            Semua Level (Materi Bebas / Global)
                          </span>
                        ) : selectedLabelIds.length === 1 ? (
                          (() => {
                            const lbl = labels.find(
                              (l) => l.id === selectedLabelIds[0],
                            );
                            return (
                              <span className="flex items-center gap-2 font-bold text-slate-800 dark:text-zinc-100 truncate">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
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
                          <span className="font-bold text-brand-700 dark:text-brand-300 truncate">
                            {selectedLabelIds.length} Level Terpilih (Klik
                            untuk ubah)
                          </span>
                        )}
                      </div>
                      <Icons.chevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                          isLabelDropdownOpen ? "rotate-180 text-brand-600" : ""
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
                        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 p-2 space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar">
                          {/* Quick action bar */}
                          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200 dark:border-zinc-800 px-1">
                            <button
                              type="button"
                              onClick={() => setSelectedLabelIds([])}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                                selectedLabelIds.length === 0
                                  ? "bg-brand-600 text-white"
                                  : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700"
                              }`}
                            >
                              Semua Level
                            </button>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedLabelIds(labels.map((l) => l.id))
                                }
                                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-500/25 cursor-pointer transition-colors"
                              >
                                ✓ Pilih Semua
                              </button>
                              {selectedLabelIds.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedLabelIds([])}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
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
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                  isSel
                                    ? "bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 font-bold"
                                    : "text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 font-medium"
                                }`}
                              >
                                <span className="flex items-center gap-2.5 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isSel}
                                    readOnly
                                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-zinc-700 cursor-pointer pointer-events-none"
                                  />
                                  <span
                                    className="w-3 h-3 rounded-full shrink-0"
                                    style={{ backgroundColor: lbl.hex_color }}
                                  />
                                  <span className="truncate">
                                    {lbl.main_level} - {lbl.sub_level}
                                  </span>
                                </span>
                                {isSel && (
                                  <span className="text-brand-600 dark:text-brand-400 shrink-0 text-xs font-bold">
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
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800">
                    {selectedLabelIds.length === 0 ? (
                      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-zinc-400 font-medium">
                        <strong className="text-slate-700 dark:text-zinc-200">Materi Bebas/Global:</strong>{" "}
                        Materi ini akan langsung muncul untuk semua siswa di
                        cabang Anda.
                      </p>
                    ) : (
                      <div>
                        <p className="text-[11px] font-bold text-slate-700 dark:text-zinc-200 mb-1.5">
                          Materi ini otomatis terdaftar untuk{" "}
                          <strong>{selectedLabelIds.length} level</strong>{" "}
                          berikut:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {selectedLabelIds.map((id) => {
                            const lbl = labels.find((l) => l.id === id);
                            if (!lbl) return null;
                            return (
                              <span
                                key={id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700"
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
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 active:translate-y-[1px] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting
                    ? "Menyimpan..."
                    : editingTemplate
                      ? "Simpan Perubahan"
                      : "Tambah Opsi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search & Level Filter Bar */}
      {activeTab && (
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/40 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input Box */}
            <div className="relative flex-1">
              <Icons.search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                placeholder={`Cari opsi ${currentCategoryObj?.label.toLowerCase() || ""}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Cari opsi template"
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Hapus pencarian"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 w-5 h-5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Icons.close className="w-3 h-3" />
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
                    aria-expanded={isFilterLevelDropdownOpen}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer text-left transition-colors ${
                      isFilterLevelDropdownOpen
                        ? "border-brand-500 ring-2 ring-brand-500/20 bg-white dark:bg-zinc-900"
                        : "border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-slate-400 dark:hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      {!selectedFilterLabelId ? (
                        <span className="truncate text-slate-700 dark:text-zinc-200 font-semibold">
                          Semua Level
                        </span>
                      ) : selectedFilterLabelId === "GLOBAL" ? (
                        <span className="truncate text-slate-700 dark:text-zinc-200 font-semibold">
                          Materi Bebas (Global)
                        </span>
                      ) : (
                        (() => {
                          const lbl = labels.find(
                            (l) => l.id === selectedFilterLabelId,
                          );
                          return (
                            <span className="flex items-center gap-2 truncate text-slate-800 dark:text-zinc-100 font-bold">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                                style={{
                                  backgroundColor: lbl?.hex_color || "#3b82f6",
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
                          ? "rotate-180 text-brand-600"
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
                      <div className="absolute top-full left-0 mt-1.5 z-50 w-64 max-w-[calc(100vw-2.5rem)] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 p-1.5 space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                        {/* Option: Semua Level */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFilterLabelId("");
                            setIsFilterLevelDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                            !selectedFilterLabelId
                              ? "bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300"
                              : "text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <span>Semua Level</span>
                          {!selectedFilterLabelId && (
                            <span className="text-brand-600 dark:text-brand-400 font-bold">✓</span>
                          )}
                        </button>

                        {/* Option: Materi Bebas (Global) */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFilterLabelId("GLOBAL");
                            setIsFilterLevelDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                            selectedFilterLabelId === "GLOBAL"
                              ? "bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300"
                              : "text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <span>Materi Bebas (Global)</span>
                          {selectedFilterLabelId === "GLOBAL" && (
                            <span className="text-brand-600 dark:text-brand-400 font-bold">✓</span>
                          )}
                        </button>

                        <div className="border-t border-slate-200 dark:border-zinc-800 my-1" />

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
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                                isSel
                                  ? "bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300"
                                  : "text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                              }`}
                            >
                              <span className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                                  style={{
                                    backgroundColor: lbl.hex_color || "#3b82f6",
                                  }}
                                />
                                <span className="truncate">
                                  {lbl.main_level} - {lbl.sub_level}
                                </span>
                              </span>
                              {isSel && (
                                <span className="text-brand-600 dark:text-brand-400 shrink-0 font-bold">
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
                    className="px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer shrink-0"
                    title="Reset Filter"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Counter & Status Info */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 font-semibold px-0.5">
            <span className="tabular-nums">
              Menampilkan <strong>{searchedAndFilteredTemplates.length}</strong>{" "}
              dari {groupedTemplates.length} Opsi
            </span>
            {(searchQuery || selectedFilterLabelId) && (
              <span className="text-brand-600 dark:text-brand-400 font-bold">
                Filter Aktif
              </span>
            )}
          </div>
        </div>
      )}

      {/* Templates List per Tab */}
      <div className="divide-y divide-slate-200 dark:divide-zinc-800">
        {!activeTab ? (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 flex items-center justify-center mx-auto mb-3">
              <Icons.fileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-zinc-200">
              Pilih Kategori Penilaian
            </p>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 max-w-md mx-auto leading-relaxed">
              Silakan pilih salah satu kategori di dropdown di atas untuk
              melihat dan mengelola opsi template penilaian.
            </p>
          </div>
        ) : searchedAndFilteredTemplates.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 flex items-center justify-center mx-auto mb-3">
              <Icons.search className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-zinc-200">
              Tidak Ada Opsi Materi Yang Cocok
            </p>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 max-w-md mx-auto leading-relaxed">
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
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/50 hover:bg-brand-100 dark:hover:bg-brand-500/25 cursor-pointer transition-colors"
              >
                Reset Filter
              </button>
            )}
          </div>
        ) : (
          searchedAndFilteredTemplates.map((tpl: any, index: number) => (
            <div
              key={tpl.id}
              className="p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 tabular-nums">
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
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700"
                              >
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                                  style={{
                                    backgroundColor:
                                      labelObj.hex_color || "#3b82f6",
                                  }}
                                />
                                <span>
                                  {labelObj.main_level} - {labelObj.sub_level}
                                </span>
                              </span>
                            ))
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
                              Semua Level (Materi Bebas)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0 -mt-0.5">
                      <button
                        onClick={() => handleEdit(tpl)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/15 transition-colors cursor-pointer"
                        title="Edit Opsi"
                        aria-label={`Edit ${tpl.title}`}
                      >
                        <Icons.edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => confirmDelete(tpl)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Hapus Opsi"
                        aria-label={`Hapus ${tpl.title}`}
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
