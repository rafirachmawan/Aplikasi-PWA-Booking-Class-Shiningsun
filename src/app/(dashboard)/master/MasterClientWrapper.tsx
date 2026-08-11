"use client";

import { ClassManager } from "@/components/features/master/ClassManager";
import { LabelManager } from "@/components/features/master/LabelManager";
import { TeacherManager } from "@/components/features/master/TeacherManager";
import { AssessmentTemplateManager } from "@/components/features/master/AssessmentTemplateManager";

interface MasterClientWrapperProps {
  classes: any[];
  labels: any[];
  teachers?: any[];
  templates?: any[];
  activeBranchName?: string | null;
  role?: string | null;
}

export function MasterClientWrapper({
  classes,
  labels,
  teachers = [],
  templates = [],
  activeBranchName,
  role,
}: MasterClientWrapperProps) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Card - Unified Design */}
      <div className="rounded-3xl bg-brand-600 p-6 sm:p-10 shadow-lg relative overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-400 opacity-20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight flex flex-wrap items-center gap-x-2">
            <span>Konfigurasi Cabang (Master Data)</span>
            {activeBranchName && (
              <span className="text-brand-100 font-normal text-lg sm:text-xl lg:text-2xl whitespace-nowrap">
                ({activeBranchName})
              </span>
            )}
          </h2>
          <p className="text-brand-100 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
            Kelola profil cabang, ruang kelas, label kustom, daftar guru/miss, dan template penilaian.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Kolom Kiri: Ruang Kelas */}
        <div>
          <ClassManager classes={classes} role={role} />
        </div>

        {/* Kolom Kanan: Label Warna */}
        <div>
          <LabelManager labels={labels} role={role} />
        </div>
      </div>

      {/* Section Data Guru & Template Penilaian */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        <div>
          <TeacherManager teachers={teachers} />
        </div>
        <div>
          <AssessmentTemplateManager templates={templates} />
        </div>
      </div>
    </div>
  );
}

