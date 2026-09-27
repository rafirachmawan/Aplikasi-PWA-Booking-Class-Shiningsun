"use client";

import { AssessmentTemplateManager } from "@/components/features/master/AssessmentTemplateManager";

interface TemplateClientWrapperProps {
  templates: any[];
  labels?: any[];
  activeBranchName?: string | null;
  role?: string | null;
}

export function TemplateClientWrapper({
  templates,
  labels = [],
  activeBranchName,
  role,
}: TemplateClientWrapperProps) {
  return (
    <div className="space-y-6">
      {/* Judul halaman: satu kartu putih seperti halaman lain.
          Halaman ini sebelumnya memakai aksen sky, disatukan ke brand-600. */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">
            {activeBranchName ? `Cabang ${activeBranchName}` : "Template penilaian"}
          </p>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Template Penilaian Siswa
          </h1>
          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-slate-500 dark:text-zinc-400">
            Buat template materi &amp; hasil penilaian standar yang dapat
            di-autofill secara otomatis ketika membuat Laporan Perkembangan
            Siswa.
          </p>
        </div>
      </div>

      <AssessmentTemplateManager templates={templates} labels={labels} />
    </div>
  );
}
