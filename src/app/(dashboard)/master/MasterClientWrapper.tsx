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
    <div className="space-y-6 sm:space-y-8">
      {/* Judul halaman: hero biru solid selaras dashboard Hallo. */}
      <div className="overflow-hidden rounded-2xl bg-brand-600 border border-brand-700/30 shadow-sm">
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium text-white/85">
            {activeBranchName ? `Cabang ${activeBranchName}` : "Konfigurasi"}
          </p>
          <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Konfigurasi Cabang (Master Data)
          </h2>
          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-white/85">
            Kelola profil cabang, ruang kelas, label kustom, daftar guru/miss, dan template penilaian.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        <div>
          <TeacherManager teachers={teachers} />
        </div>
        <div>
          <AssessmentTemplateManager templates={templates} labels={labels} />
        </div>
      </div>
    </div>
  );
}

