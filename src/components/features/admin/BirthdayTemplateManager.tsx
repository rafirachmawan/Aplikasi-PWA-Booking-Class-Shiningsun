"use client";

import { useState, useEffect } from "react";
import { Icons } from "@/components/ui/icons";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface Template {
  id: string;
  title: string;
  greeting_text: string; // Unified greeting text (no separate upcoming)
  motivational_quote?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function BirthdayTemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    greeting_text: "",
    motivational_quote: "",
    is_active: true,
  });

  // Default template (used when DB is empty)
  const defaultTemplate: Template = {
    id: "default",
    title: "Template Standar",
    greeting_text:
      "🎉 Selamat Ulang Tahun yang ke-{age} tahun, {name}! Semoga makin hebat dan ceria selalu ya! 🎈",
    motivational_quote:
      '"Setiap bertambah usia adalah kesempatan baru untuk tumbuh, belajar, dan menjadi lebih baik. Teruslah bermimpi besar dan berjuang mewujudkan impianmu! 🌟"',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/birthday-template");
      const result = await response.json();

      if (result.success) {
        const dbTemplates = result.templates || [];
        // If no templates in DB, show default template
        if (dbTemplates.length === 0) {
          setTemplates([defaultTemplate]);
        } else {
          setTemplates(dbTemplates);
        }
      } else {
        setError(result.error || "Gagal memuat template");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingId(template.id);
    setFormData({
      title: template.title,
      greeting_text: template.greeting_text,
      motivational_quote: template.motivational_quote || "",
      is_active: template.is_active,
    });
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Jika edit default template, harus create yang baru di DB
      const isDefaultEdit = editingId === "default";

      const url = isDefaultEdit
        ? "/api/birthday-template"
        : editingId
          ? `/api/birthday-template?id=${editingId}`
          : "/api/birthday-template";

      const response = await fetch(url, {
        method: isDefaultEdit || !editingId ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        // Update templates array langsung agar UI cepat merespon
        if (isDefaultEdit) {
          // Ganti default template dengan yang baru dari DB
          const newTemplateFromDB = {
            id: result.template?.id || `temp-${Date.now()}`,
            title: result.template?.title || formData.title,
            greeting_text:
              result.template?.greeting_text || formData.greeting_text,
            motivational_quote:
              result.template?.motivational_quote ||
              formData.motivational_quote ||
              "",
            is_active:
              result.template?.is_active !== undefined
                ? result.template?.is_active
                : formData.is_active,
            created_at: result.template?.created_at || new Date().toISOString(),
            updated_at: result.template?.updated_at || new Date().toISOString(),
          } as Template;
          setTemplates([newTemplateFromDB]);
        } else if (!editingId) {
          // Mode create - tambahkan template baru ke array
          const newTemplate = {
            id: result.template?.id || `temp-${Date.now()}`,
            title: formData.title,
            greeting_text: formData.greeting_text,
            motivational_quote: formData.motivational_quote || "",
            is_active: formData.is_active,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as Template;
          setTemplates([newTemplate, ...templates]);
        }
        fetchTemplates();
        setEditingId(null);
      } else {
        alert(result.error || "Gagal menyimpan template");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan saat menyimpan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus template ini?")) return;
    if (isSaving) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/birthday-template?id=${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        fetchTemplates();
      } else {
        alert(result.error || "Gagal menghapus template");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan saat menghapus");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Use PUT with action query param
      const newStatus = !currentActive;

      const response = await fetch(
        `/api/birthday-template?action=toggle-active&id=${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_active: newStatus }),
        },
      );

      const result = await response.json();

      if (result.success) {
        fetchTemplates();
      } else {
        alert(result.error || "Gagal mengubah status");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan");
    } finally {
      setIsSaving(false);
    }
  };

  // Preview template dengan variables replaced
  const previewTemplate = (templateStr: string, variables: any) => {
    return templateStr
      .replace(/{name}/g, variables.name || "---")
      .replace(/{nickname}/g, variables.nickname || "---")
      .replace(/{age}/g, variables.age?.toString() || "---")
      .replace(/{birth_day}/g, variables.birthDay?.toString() || "---")
      .replace(/{birth_month}/g, variables.birthMonth || "---")
      .replace(
        /{days_until_birthday}/g,
        variables.daysUntilBirthday?.toString() || "---",
      );
  };

  return (
    <div className="space-y-6">
      {isSaving && <LoadingSpinner usePortal={true} />}

      {/* Info Box */}
      <div className="bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-800/50 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
            <span className="text-xs font-bold">{"{ } "}</span>
          </div>
          <div className="text-sm min-w-0">
            <p className="font-semibold text-brand-900 dark:text-brand-200 mb-1">
              Template ucapan ulang tahun untuk portal orang tua
            </p>
            <p className="text-xs text-brand-800 dark:text-brand-300 leading-relaxed">
              Gunakan variabel seperti {"{"}name{"}"}, {"{"}age{"}"}, dll dalam
              teks ucapan.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-slate-500 dark:text-zinc-400">Memuat template...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800/50 rounded-2xl p-4 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm ${
                template.is_active
                  ? "border-brand-300 dark:border-brand-800/60"
                  : "border-slate-200 dark:border-zinc-800"
              } p-5`}
            >
              {editingId === template.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      {template.id === "default"
                        ? "Edit Template Utama"
                        : "Edit Template"}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => !isSaving && setEditingId(null)}
                        disabled={isSaving}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1 rounded-xl bg-brand-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-700 active:translate-y-[1px] disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {isSaving ? "Menyimpan..." : "Simpan"}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
                        Judul Template
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 placeholder:text-slate-400"
                        placeholder="Contoh: Template Ucapan Standar"
                      />
                      {template.id === "default" && (
                        <p className="text-xs text-brand-600 dark:text-brand-400 mt-1.5">
                          Template ini adalah template utama yang digunakan
                          sistem
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
                        Teks Ucapan Ulang Tahun
                      </label>
                      <textarea
                        value={formData.greeting_text}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            greeting_text: e.target.value,
                          })
                        }
                        rows={4}
                        className="w-full rounded-xl border border-slate-300 dark:border-zinc-700 px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white dark:bg-zinc-900 placeholder:text-slate-400"
                        placeholder="Selamat Ulang Tahun yang ke-{age} tahun, {name}! ..."
                      />
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5">
                        Gunakan variabel seperti{" "}
                        <code className="bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-lg font-mono">
                          {"{name}"}
                        </code>
                        ,{" "}
                        <code className="bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-lg font-mono">
                          {"{age}"}
                        </code>
                        , dll
                      </p>
                    </div>

                    {/* Real-time Preview */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
                        Preview Real-time
                      </label>
                      <div className="rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800 p-4">
                        <p className="text-sm text-slate-700 dark:text-zinc-200 leading-relaxed">
                          {formData.greeting_text ||
                            "Preview akan muncul di sini saat Anda mengetik..."}
                        </p>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 italic">
                        *Preview ini akan ditampilkan saat siswa memiliki ulang
                        tahun
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
                        Kutipan Motivasi (Opsional)
                      </label>
                      <textarea
                        value={formData.motivational_quote}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            motivational_quote: e.target.value,
                          })
                        }
                        rows={2}
                        className="w-full rounded-xl border border-slate-300 dark:border-zinc-700 px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white dark:bg-zinc-900 placeholder:text-slate-400"
                        placeholder="Setiap bertambah usia adalah kesempatan baru untuk tumbuh..."
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            is_active: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                      <label
                        htmlFor="is_active"
                        className="text-sm font-medium text-slate-700 dark:text-zinc-300 cursor-pointer"
                      >
                        Aktifkan template ini
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                          {template.title}
                        </h3>
                        {template.is_active ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                            ✓ Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
                            Tidak Aktif
                          </span>
                        )}
                        {template.id === "default" && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 dark:bg-brand-500/15 px-2.5 py-0.5 text-xs font-bold text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/50">
                            Utama
                          </span>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1.5">
                            Preview Template
                          </p>
                          <p className="text-sm text-slate-800 dark:text-zinc-100 bg-slate-50 dark:bg-zinc-800/60 rounded-xl p-3 leading-relaxed border border-slate-200 dark:border-zinc-800">
                            {previewTemplate(template.greeting_text, {
                              name: "Ahmad Abdullah",
                              nickname: "Tom",
                              age: 7,
                              birth_day: 15,
                              birth_month: "September",
                              days_until_birthday: 0, // Since this is used on birthday day
                            })}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 italic">
                            *Preview ini akan muncul saat siswa ultah hari ini
                          </p>
                        </div>

                        {template.motivational_quote && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1.5">
                              Motivasi
                            </p>
                            <p className="text-sm text-slate-800 dark:text-zinc-100 italic bg-slate-50 dark:bg-zinc-800/60 rounded-xl p-3 border border-slate-200 dark:border-zinc-800">
                              "{template.motivational_quote}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                      <button
                        onClick={() => handleEdit(template)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:translate-y-[1px] px-4 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
                      >
                        <Icons.edit className="w-3.5 h-3.5" />
                        <span>Edit Template</span>
                      </button>

                      {/* Only allow delete if not default template */}
                      {template.id !== "default" && (
                        <button
                          onClick={() => handleDelete(template.id)}
                          disabled={isSaving}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white dark:bg-zinc-900 px-4 py-2.5 text-xs font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-500/10 active:translate-y-[1px] transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <Icons.trash className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
