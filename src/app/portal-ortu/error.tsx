"use client";

import { useEffect } from "react";
import { Icons } from "@/components/ui/icons";

/**
 * Error boundary untuk segmen /portal-ortu.
 *
 * Tujuan: kalau portal gagal render (mis. karena cache HP sudah rusak atau
 * koneksi terputus saat memuat), orang tua tetap mendapat pesan yang bisa
 * ditindaklanjuti — bukan layar putih yang tidak menjelaskan apa pun.
 *
 * Tidak mengubah alur login, query, maupun data. Hanya lapisan tampilan
 * saat terjadi error.
 */
export default function ParentPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // tetap dicatat di console supaya mudah ditelusuri saat klien melapor
    console.error("[portal-ortu] Gagal memuat halaman:", error);
  }, [error]);

  return (
    <div className="min-h-[100dvh] bg-zinc-100 font-sans text-slate-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4 py-8 min-[380px]:px-5 sm:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/15">
            <Icons.alertCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
          </div>

          <h1 className="mt-4 text-xl font-bold tracking-tight">
            Halaman belum bisa dimuat
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-zinc-400">
            Data anak Bapak/Ibu aman. Halaman ini gagal tampil, biasanya karena
            cache HP yang sudah rusak atau koneksi terputus sementara.
          </p>

          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              onClick={() => reset()}
              className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:translate-y-[1px]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
              Coba lagi
            </button>

            <a
              href="/api/clear-cache"
              className="flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-600 hover:text-brand-700 active:translate-y-[1px] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-brand-500"
            >
              Bersihkan cache HP
            </a>

            <a
              href="/portal-ortu"
              className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700 dark:text-zinc-400 dark:hover:text-brand-400"
            >
              <Icons.chevronLeft className="h-4 w-4" />
              Kembali ke halaman login
            </a>
          </div>

          <p className="mt-5 text-[11px] leading-relaxed text-slate-400 dark:text-zinc-500">
            Kalau tetap gagal: coba buka pakai Chrome, atau hubungi admin sekolah.
          </p>

          {error.digest && (
            <p className="mt-2 font-mono text-[10px] text-slate-300 dark:text-zinc-700">
              ref: {error.digest}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}