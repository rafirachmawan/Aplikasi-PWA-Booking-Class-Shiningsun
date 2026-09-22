"use client";

import { useState, useEffect } from "react";

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
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus template ini?")) return;

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
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            📝 Template Ucapan Ulang Tahun
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            Kelola template ucapan ulang tahun untuk portal orang tua
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm">
            <p className="font-semibold text-blue-800 dark:text-blue-400 mb-1">
              Template ucapan ulang tahun untuk portal orang tua
            </p>
            <p className="text-blue-700 dark:text-blue-500">
              Gunakan variabel seperti {"{"}name{'}"}, {"{"}age{'}", dll dalam
              teks ucapan.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-slate-500">Memuat template...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`rounded-lg border ${
                template.is_active
                  ? "border-brand-300 dark:border-brand-700 bg-brand-50/50 dark:bg-brand-900/10"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              } p-5`}
            >
              {editingId === template.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {template.id === "default"
                        ? "Edit Template Utama"
                        : "Edit Template"}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-sm text-slate-500 hover:text-slate-700"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleSave}
                        className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Judul Template
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        placeholder="Contoh: Template Ucapan Standar"
                      />
                      {template.id === "default" && (
                        <p className="text-xs text-brand-600 dark:text-brand-400 mt-1">
                          ℹ️ Template ini adalah template utama yang digunakan
                          sistem
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
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
                        className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white dark:bg-slate-900"
                        placeholder="🎉 Selamat Ulang Tahun yang ke-{age} tahun, {name}! ..."
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Gunakan variabel seperti{" "}
                        <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">
                          {"{name}"}
                        </code>
                        ,{" "}
                        <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">
                          {"{age}"}
                        </code>
                        , dll
                      </p>
                    </div>

                    {/* Real-time Preview */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        📋 Preview Real-time:
                      </label>
                      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {formData.greeting_text ||
                            "💬 Preview akan muncul di sini saat Anda mengetik..."}
                        </p>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 italic">
                        *Preview ini akan ditampilkan saat siswa memiliki ulang
                        tahun
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
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
                        className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white dark:bg-slate-900"
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
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <label
                        htmlFor="is_active"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300"
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
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                          {template.title}
                        </h3>
                        {template.is_active && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                            ✓ Aktif
                          </span>
                        )}
                        {!template.is_active && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                            Tidak Aktif
                          </span>
                        )}
                        {template.id === "default" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 dark:bg-brand-900/40 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                            📛 Utama
                          </span>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                            Preview Template:
                          </p>
                          <p className="text-sm text-slate-800 dark:text-white bg-white dark:bg-slate-700/50 rounded p-3 leading-relaxed border border-slate-200 dark:border-slate-600">
                            {previewTemplate(template.greeting_text, {
                              name: "Ahmad Abdullah",
                              nickname: "Tom",
                              age: 7,
                              birth_day: 15,
                              birth_month: "September",
                              days_until_birthday: 0, // Since this is used on birthday day
                            })}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 italic">
                            *Preview ini akan muncul saat siswa ultah hari ini
                          </p>
                        </div>

                        {template.motivational_quote && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                              Motivasi:
                            </p>
                            <p className="text-sm text-slate-800 dark:text-white italic bg-white dark:bg-slate-700/50 rounded p-3 border border-slate-200 dark:border-slate-600">
                              "{template.motivational_quote}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => handleEdit(template)}
                        className="inline-flex items-center gap-2 rounded-md bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm sm:text-base font-semibold text-white shadow-sm hover:shadow-md transition-all"
                      >
                        <svg
                          className="w-3 h-3 sm:w-3.5 sm:h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        <span>Edit Template</span>
                      </button>

                      {/* Only allow delete if not default template */}
                      {template.id !== "default" && (
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="inline-flex items-center gap-1 sm:gap-1.5 rounded-md bg-red-50 dark:bg-red-900/20 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
                        >
                          <svg
                            className="w-3 h-3 sm:w-3.5 sm:h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
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
