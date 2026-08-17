"use client";

import { useRef, useState } from "react";
import {
  saveStudentRulesDocument,
  deleteStudentRulesDocument,
} from "@/lib/actions";
import { getGDrivePreviewLink } from "@/lib/gdriveUtils";
import { formatShortDate } from "@/lib/dateUtils";

interface RulesDocument {
  id: string;
  file_url: string;
  file_name: string;
  uploaded_at: string;
}

interface StudentRulesSectionProps {
  initialDocument: RulesDocument | null;
}

const MAX_PDF_SIZE_MB = 15;

function friendlyError(msg: string): string {
  if (msg.includes("Could not find the table")) {
    return "Tabel student_rules_documents belum dibuat. Jalankan file supabase/student_rules_documents.sql di Supabase SQL Editor terlebih dahulu.";
  }
  return msg;
}

export function StudentRulesSection({
  initialDocument,
}: StudentRulesSectionProps) {
  const [doc, setDoc] = useState<RulesDocument | null>(initialDocument);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setIsUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload-gdrive", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengunggah ke Google Drive");
      }

      const saved = await saveStudentRulesDocument(data.gdriveLink, file.name);
      if (!saved.success || !saved.data) {
        throw new Error(saved.error || "Gagal menyimpan dokumen");
      }

      setDoc(saved.data);
      setMessage({
        type: "success",
        text: "Dokumen Peraturan Siswa berhasil diunggah dan sudah tampil di Portal Orang Tua.",
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

  const handleDelete = async () => {
    if (!doc) return;
    if (
      !window.confirm(
        "Hapus dokumen Peraturan Siswa ini? Dokumen tidak akan tampil lagi di Portal Orang Tua.",
      )
    )
      return;

    setIsDeleting(true);
    setMessage(null);
    try {
      const res = await deleteStudentRulesDocument(doc.id);
      if (!res.success) {
        throw new Error(res.error || "Gagal menghapus dokumen");
      }
      setDoc(null);
      setMessage({
        type: "success",
        text: "Dokumen Peraturan Siswa berhasil dihapus.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: friendlyError(
          err instanceof Error ? err.message : "Gagal menghapus dokumen",
        ),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
      <div className="p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Peraturan Siswa
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Unggah dokumen peraturan siswa (PDF). Dokumen terbaru otomatis
              tampil di Portal Orang Tua — bisa diganti tiap minggu atau bulan.
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
        {doc ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-lg p-2 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 shrink-0">
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
              <a
                href={getGDrivePreviewLink(doc.file_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors"
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
              </a>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-colors cursor-pointer"
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
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Ganti PDF
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isDeleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 flex flex-col items-center justify-center text-center gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Belum ada dokumen Peraturan Siswa. Unggah file PDF untuk
              menampilkannya di Portal Orang Tua.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-colors shadow-md shadow-brand-500/20 cursor-pointer"
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
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
