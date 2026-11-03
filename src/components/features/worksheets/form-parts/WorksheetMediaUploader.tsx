"use client";

// Dipisahkan dari WorksheetFormModal.tsx tanpa mengubah JSX, className, maupun logika.
// Semua state & handler tetap dimiliki komponen induk dan dioper lewat props.
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { Icons } from "@/components/ui/icons";
import { getGDriveDirectLink } from "@/lib/gdriveUtils";

export interface WorksheetMediaUploaderProps {
  fileId: string | null;
  filePreviewUrl: string | null;
  gdriveLink: any;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleUploadToGDrive: (fileToUpload?: File) => Promise<void>;
  initialData: any;
  isEditing: boolean;
  isUploadingGDrive: boolean;
  selectedFile: File | null;
  setFilePreviewUrl: Dispatch<SetStateAction<string | null>>;
  setGdriveLink: Dispatch<any>;
  setSelectedFile: Dispatch<SetStateAction<File | null>>;
  setUploadError: Dispatch<SetStateAction<string | null>>;
  uploadError: string | null;
}

export function WorksheetMediaUploader({
  fileId,
  filePreviewUrl,
  gdriveLink,
  handleFileChange,
  handleUploadToGDrive,
  initialData,
  isEditing,
  isUploadingGDrive,
  selectedFile,
  setFilePreviewUrl,
  setGdriveLink,
  setSelectedFile,
  setUploadError,
  uploadError,
}: WorksheetMediaUploaderProps) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-500 text-white text-[11px] font-extrabold shrink-0">
          4
        </span>
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            📎 Lampiran
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            Opsional
          </span>
        </div>
      </div>

      {/* Upload File Foto ke Google Drive */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          📸 Upload Foto Hasil Belajar (Otomatis ke Google Drive):
        </label>

        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Input 1: Galeri / File */}
            <input
              type="file"
              accept="image/*"
              id="gdrive-file-input-gallery"
              className="hidden"
              onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
              onChange={(e) => {
                handleFileChange(e);
                if (e.target.files?.[0]) {
                  handleUploadToGDrive(e.target.files[0]);
                }
              }}
            />

            {/* Input 2: Kamera Langsung */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              id="gdrive-file-input-camera"
              className="hidden"
              onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
              onChange={(e) => {
                handleFileChange(e);
                if (e.target.files?.[0]) {
                  handleUploadToGDrive(e.target.files[0]);
                }
              }}
            />

            {/* Tombol Kamera */}
            <label
              htmlFor="gdrive-file-input-camera"
              className="px-3.5 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-brand-200 dark:border-brand-800 shadow-xs active:scale-95 flex-1"
            >
              <span className="text-sm">📷</span>
              <span>Ambil Foto (Kamera)</span>
            </label>

            {/* Tombol Galeri */}
            <label
              htmlFor="gdrive-file-input-gallery"
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-300 dark:border-slate-700 shadow-xs active:scale-95 flex-1"
            >
              <span className="text-sm">🖼️</span>
              <span>Pilih dari Galeri</span>
            </label>
          </div>

          {isUploadingGDrive && (
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400 animate-pulse pt-1">
              <span className="w-3.5 h-3.5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></span>
              <span>Mengunggah ke Google Drive...</span>
            </div>
          )}
        </div>

        {/* Preview Image */}
        {filePreviewUrl && (
          <div className="relative inline-block mt-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm max-w-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={filePreviewUrl}
              alt="Preview Lampiran"
              className="w-full h-32 object-cover rounded-xl"
            />
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setFilePreviewUrl(null);
                // Mode edit: kembalikan link lama agar tidak ikut terhapus.
                // Mode baru: kosongkan.
                setGdriveLink(
                  isEditing ? initialData?.gdrive_link || "" : "",
                );
              }}
              className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md cursor-pointer"
              title="Hapus Foto"
            >
              <Icons.close className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {uploadError && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-xs text-red-600 dark:text-red-400 space-y-2">
            <div className="flex items-start gap-1.5 font-medium">
              <span className="shrink-0">⚠️</span>
              <span>{uploadError}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Foto gagal tidak menghalangi Simpan — laporan tetap bisa
              disimpan dulu, foto bisa diunggah ulang / paste link manual.
            </div>
            {/* Tombol Coba Lagi — hanya muncul jika tidak sedang upload & masih ada file */}
            {!isUploadingGDrive && selectedFile && (
              <button
                type="button"
                onClick={() => handleUploadToGDrive()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-[11px] transition-colors shadow-xs"
              >
                <span>🔄</span>
                <span>Coba Upload Lagi</span>
              </button>
            )}
            {(uploadError.includes("/api/auth/gdrive") ||
              uploadError.includes("Google Drive belum terhubung") ||
              uploadError.includes("kadaluarsa")) && (
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <a
                  href="/api/auth/gdrive"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] transition-colors shadow-xs"
                >
                  <span>🔗</span>
                  <span>1. Hubungkan Google Drive</span>
                </a>
                <button
                  type="button"
                  onClick={() => setUploadError("")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-bold text-[11px] transition-colors shadow-xs"
                >
                  <span>🔄</span>
                  <span>2. Coba Upload Lagi</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Google Drive Link */}
      <div>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
          <span>
            Link Google Drive (Otomatis terisi saat upload atau paste
            manual):
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
            🟢 Free Tier Safe
          </span>
        </label>
        <input
          type="url"
          value={gdriveLink}
          onChange={(e) => setGdriveLink(e.target.value)}
          placeholder="https://drive.google.com/file/d/.../view"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-400 font-mono"
        />
        {fileId ? (
          <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center justify-between gap-2">
            <span className="truncate">
              ✓ Format valid! ID: <strong>{fileId}</strong>
            </span>
            <a
              href={getGDriveDirectLink(gdriveLink)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline shrink-0 hover:text-emerald-900"
            >
              Tes Unduh
            </a>
          </div>
        ) : gdriveLink ? (
          <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
            ⚠️ Pastikan link bisa diakses publik.
          </p>
        ) : null}
      </div>
    </div>
  );
}
