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
      
      {/* Header Card */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Konfigurasi Cabang (Master Data)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kelola profil cabang, ruang kelas, dan opsi label kustom Anda.
        </p>
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
