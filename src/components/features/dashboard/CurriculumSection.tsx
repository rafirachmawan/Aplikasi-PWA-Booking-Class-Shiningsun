"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  saveCurriculumDocument,
  deleteCurriculumDocument,
  renameCurriculumDocument,
} from "@/lib/actions";
import { createBrowserClient } from "@supabase/ssr";
import { PdfViewerModal } from "@/components/ui/PdfViewerModal";
import { formatShortDate } from "@/lib/dateUtils";

interface CurriculumDocument {
  id: string;
  file_url: string;
  file_name: string;
  uploaded_at: string;
}

interface CurriculumSectionProps {
  initialDocuments: CurriculumDocument[];
  isSuperadmin: boolean;
}

const MAX_PDF_SIZE_MB = 15;

// Client browser dengan sesi cookie (pola sama seperti LoginForm) —
// agar upload Storage terbaca sebagai authenticated, bukan anon.
const supabaseBrowser = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

function friendlyError(msg: string): string {
  if (msg.includes("Could not find the table")) {
    return "Tabel curriculum_documents belum dibuat. Jalankan file supabase/curriculum_documents.sql di Supabase SQL Editor terlebih dahulu.";
  }
  if (msg.toLowerCase().includes("bucket not found")) {
    return "Bucket storage 'kurikulum' belum dibuat. Jalankan file supabase/curriculum_storage.sql di Supabase SQL Editor terlebih dahulu.";
  }
  return msg;
}

function withPdfSuffix(name: string): string {
  return name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
}

export function CurriculumSection({
  initialDocuments,
  isSuperadmin,
}: CurriculumSectionProps) {
  const [docs, setDocs] = useState<CurriculumDocument[]>(initialDocuments);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload modal state: nama diisi dulu, lalu pilih file, baru unggah
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Rename modal state
  const [renameTarget, setRenameTarget] = useState<CurriculumDocument | null>(
    null,
  );
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Viewer PDF hanya-lihat (tanpa download)
  const [previewDoc, setPreviewDoc] = useState<CurriculumDocument | null>(null);

  const openUploadModal = () => {
    setUploadName("");
    setPendingFile(null);
    setIsUploadModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setMessage({ type: "error", text: "File harus berformat PDF." });
      return;
    }
    if (file.size > MAX_PDF_SIZE_MB * 1024 * 1024) {
      setMessage({
        type: "error",
        text: `Ukuran PDF maksimal ${MAX_PDF_SIZE_MB} MB.`,
      });
      return;
    }

    setPendingFile(file);
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    const rawName = uploadName.trim();
    if (!rawName) {
      setMessage({ type: "error", text: "Nama dokumen wajib diisi." });
      return;
    }
    const fileName = withPdfSuffix(rawName);

    setIsUploading(true);
    setMessage(null);
    try {
      // Upload langsung dari browser ke Supabase Storage —
      // tidak lewat server Vercel agar tidak kena batas body 4.5 MB.
      const storagePath = `kurikulum-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`;
      const { error: uploadError } = await supabaseBrowser.storage
        .from("kurikulum")
        .upload(storagePath, pendingFile, {
          contentType: "application/pdf",
          upsert: false,
        });
      if (uploadError) {
        throw new Error(uploadError.message || "Gagal mengunggah file");
      }

      const { data: publicUrlData } = supabaseBrowser.storage
        .from("kurikulum")
        .getPublicUrl(storagePath);

      const saved = await saveCurriculumDocument(
        publicUrlData.publicUrl,
        fileName,
      );
      if (!saved.success || !saved.data) {
        throw new Error(saved.error || "Gagal menyimpan dokumen");
      }

      setDocs((prev) => [saved.data, ...prev]);
      setIsUploadModalOpen(false);
      setUploadName("");
      setPendingFile(null);
      setMessage({
        type: "success",
        text: `Dokumen "${fileName}" berhasil diunggah.`,
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: friendlyError(
          err instanceof Error ? err.message : "Gagal mengunggah dokumen",
        ),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (doc: CurriculumDocument) => {
    if (
      !window.confirm(
        `Hapus dokumen "${doc.file_name}"? Dokumen tidak akan tampil lagi di daftar kurikulum.`,
      )
    )
      return;

    setDeletingId(doc.id);
    setMessage(null);
    try {
      const res = await deleteCurriculumDocument(doc.id);
      if (!res.success) {
        throw new Error(res.error || "Gagal menghapus dokumen");
      }
      // Best-effort: hapus juga file di Supabase Storage jika URL-nya dari bucket kurikulum
      const marker = "/kurikulum/";
      const idx = doc.file_url.indexOf(marker);
      if (idx !== -1) {
        const path = decodeURIComponent(
          doc.file_url.slice(idx + marker.length).split("?")[0],
        );
        if (path) {
          await supabaseBrowser.storage
            .from("kurikulum")
            .remove([path])
            .catch(() => undefined);
        }
      }
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      setMessage({
        type: "success",
        text: "Dokumen berhasil dihapus.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: friendlyError(
          err instanceof Error ? err.message : "Gagal menghapus dokumen",
        ),
      });
    } finally {
      setDeletingId(null);
    }
  };

  const openRenameModal = (doc: CurriculumDocument) => {
    setRenameTarget(doc);
    setRenameValue(doc.file_name.replace(/\.pdf$/i, ""));
  };

  const handleRename = async () => {
    if (!renameTarget) return;
    const rawName = renameValue.trim();
    if (!rawName) {
      setMessage({ type: "error", text: "Nama dokumen tidak boleh kosong." });
      return;
    }
    const fileName = withPdfSuffix(rawName);

    setIsRenaming(true);
    setMessage(null);
    try {
      const res = await renameCurriculumDocument(renameTarget.id, fileName);
      if (!res.success || !res.data) {
        throw new Error(res.error || "Gagal mengubah nama dokumen");
      }
      setDocs((prev) =>
        prev.map((d) =>
          d.id === renameTarget.id ? { ...d, file_name: res.data.file_name } : d,
        ),
      );
      setRenameTarget(null);
      setMessage({
        type: "success",
        text: "Nama dokumen berhasil diubah.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: friendlyError(
          err instanceof Error ? err.message : "Gagal mengubah nama dokumen",
        ),
      });
    } finally {
      setIsRenaming(false);
    }
  };

  // Satu tombol upload — selalu dirender di dalam kotak dashed
  const uploadButton = (
    <button
      type="button"
      onClick={openUploadModal}
      disabled={isUploading}
      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-md shadow-emerald-500/20 cursor-pointer"
    >
      {isUploading ? (
        <>
          <svg
            className="animate-spin h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Mengunggah...
        </>
      ) : (
        <>
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Unggah PDF
        </>
      )}
    </button>
  );

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
      <div className="p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="rounded-xl p-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Kurikulum
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dokumen PDF kurikulum (bisa lebih dari satu). Upload khusus
              Superadmin — admin dapat melihat dokumen.
            </p>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`text-xs font-semibold rounded-xl px-3 py-2.5 border ${
              message.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
                : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Content */}
        {docs.length > 0 ? (
          <div className="space-y-2.5">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3.5 sm:p-4 space-y-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-lg p-2 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                      {doc.file_name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Diunggah: {formatShortDate(doc.uploaded_at)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors cursor-pointer"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    Lihat PDF
                  </button>
                  {isSuperadmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => openRenameModal(doc)}
                        disabled={isRenaming}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(doc)}
                        disabled={deletingId === doc.id}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {deletingId === doc.id ? "Menghapus..." : "Hapus"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {isSuperadmin && (
              <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-4 flex flex-col items-center justify-center text-center gap-2.5">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tambahkan dokumen kurikulum lain (PDF).
                </p>
                {uploadButton}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 flex flex-col items-center justify-center text-center gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isSuperadmin
                ? "Belum ada dokumen kurikulum. Unggah file PDF untuk membagikannya ke admin."
                : "Belum ada dokumen kurikulum. Hubungi Superadmin untuk mengunggah dokumen."}
            </p>
            {isSuperadmin && uploadButton}
          </div>
        )}

        {/* Upload modal (superadmin only): isi nama dulu, pilih file, lalu unggah */}
        {isSuperadmin &&
          isUploadModalOpen &&
          createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
              onClick={() => !isUploading && setIsUploadModalOpen(false)}
            >
            <div
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Unggah File PDF Kurikulum
              </h4>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Nama Dokumen <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="Cth: Kurikulum Bimba 2026"
                  disabled={isUploading}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-xs placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  File PDF <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                    pendingFile
                      ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:border-emerald-400 hover:text-emerald-600"
                  }`}
                >
                  <span className="truncate">
                    {pendingFile
                      ? `📄 ${pendingFile.name}`
                      : "Klik untuk pilih file PDF (maks 15 MB)"}
                  </span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={isUploading}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading || !uploadName.trim() || !pendingFile}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isUploading ? "Mengunggah..." : "Unggah"}
                </button>
              </div>
            </div>
            </div>,
            document.body,
          )}

        {/* Rename modal (superadmin only) */}
        {isSuperadmin &&
          renameTarget &&
          createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
              onClick={() => !isRenaming && setRenameTarget(null)}
            >
            <div
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Rename Dokumen
              </h4>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Nama Baru <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  disabled={isRenaming}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  disabled={isRenaming}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleRename}
                  disabled={isRenaming || !renameValue.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isRenaming ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
            </div>,
            document.body,
          )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />

      {previewDoc && (
        <PdfViewerModal
          fileUrl={previewDoc.file_url}
          title={previewDoc.file_name}
          onClose={() => setPreviewDoc(null)}
        />
      )}
      </div>
    </div>
  );
}
