"use client";

import { AssessmentTemplateManager } from "@/components/features/master/AssessmentTemplateManager";

interface TemplateClientWrapperProps {
  templates: any[];
  activeBranchName?: string | null;
  role?: string | null;
}

export function TemplateClientWrapper({
  templates,
  activeBranchName,
  role,
}: TemplateClientWrapperProps) {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <span>Template Penilaian Siswa</span>
            {activeBranchName && (
              <span className="text-sky-100 font-normal text-lg sm:text-xl">
                ({activeBranchName})
              </span>
            )}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-sky-100 max-w-2xl leading-relaxed">
            Buat template materi &amp; hasil penilaian standar yang dapat di-autofill secara otomatis ketika membuat Laporan Perkembangan Siswa.
          </p>
        </div>
      </div>

      <AssessmentTemplateManager templates={templates} />
    </div>
  );
}
