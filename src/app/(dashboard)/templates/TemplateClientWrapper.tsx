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
      {/* Judul halaman: hero biru solid selaras dashboard Hallo. */}
      <div className="overflow-hidden rounded-2xl bg-brand-600 border border-brand-700/30 shadow-sm">
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium text-white/85">
            {activeBranchName ? `Cabang ${activeBranchName}` : "Template penilaian"}
          </p>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Template Penilaian Siswa
          </h1>
          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-white/85">
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
