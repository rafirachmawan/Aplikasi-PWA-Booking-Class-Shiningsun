"use client";

import { ClassManager } from "@/components/features/master/ClassManager";
import { LabelManager } from "@/components/features/master/LabelManager";

interface MasterClientWrapperProps {
  classes: any[];
  labels: any[];
}

export function MasterClientWrapper({ classes, labels }: MasterClientWrapperProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-slate-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
            Konfigurasi Cabang (Master Data)
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola profil cabang, ruang kelas, dan opsi label kustom Anda.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Kolom Kiri: Ruang Kelas */}
        <div>
          <ClassManager classes={classes} />
        </div>

        {/* Kolom Kanan: Label Warna */}
        <div>
          <LabelManager labels={labels} />
        </div>
      </div>
    </div>
  );
}
