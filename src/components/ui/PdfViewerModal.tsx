"use client";

import { createPortal } from "react-dom";
import { useMemo } from "react";
import { extractGDriveFileId } from "@/lib/gdriveUtils";

/**
 * Modal viewer PDF — hanya untuk melihat, tanpa tombol download.
 * - File Google Drive → embed preview Drive (tanpa tombol download).
 * - File langsung (Supabase Storage):
 *   - Mobile → Google Docs viewer embed (Chrome mobile memblokir PDF mentah di iframe).
 *   - Desktop → viewer PDF native dengan #toolbar=0 (gview menolak embed di desktop).
 * Dirender via portal ke document.body agar backdrop menyeluruh.
 */
export function PdfViewerModal({
  fileUrl,
  title,
  onClose,
}: {
  fileUrl: string;
  title: string;
  onClose: () => void;
}) {
  const fileId = extractGDriveFileId(fileUrl);

  // Deteksi mobile: gview hanya dipakai di mobile (desktop menolak embed)
  const isMobile = useMemo(
    () =>
      typeof navigator !== "undefined" &&
      /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent),
    [],
  );
  const useGview = !fileId && isMobile;

  const embedSrc = fileId
    ? `https://drive.google.com/file/d/${fileId}/preview`
    : useGview
      ? `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(fileUrl)}`
      : `${fileUrl}#toolbar=0&navpanes=0&view=FitH`;

  // Viewer Google (Drive preview & gview) punya toolbar atas ±64px yang
  // digeser keluar area pandang; viewer native desktop (#toolbar=0) tidak.
  const hideTopBar = Boolean(fileId) || useGview;

  return createPortal(
    <div className="fixed inset-0 z-100 flex flex-col bg-slate-950/95 animate-in fade-in duration-200 p-3 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-3 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 shadow-lg">
        <p className="text-sm font-bold text-white truncate">{title}</p>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Tutup
        </button>
      </div>
      {/* Toolbar atas viewer Google (±64px) digeser keluar area pandang —
          yang terlihat hanya isi dokumennya saja */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-xl bg-white">
        <iframe
          src={embedSrc}
          title={title}
          className="w-full border-0 bg-white"
          style={
            hideTopBar
              ? { height: "calc(100% + 64px)", marginTop: "-64px" }
              : { height: "100%" }
          }
        />
      </div>
    </div>,
    document.body,
  );
}
