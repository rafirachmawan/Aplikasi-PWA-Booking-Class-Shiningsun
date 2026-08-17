"use client";

import { TeacherManager } from "@/components/features/master/TeacherManager";

interface TeacherClientWrapperProps {
  teachers: any[];
  activeBranchName?: string | null;
  role?: string | null;
}

export function TeacherClientWrapper({
  teachers,
  activeBranchName,
  role,
}: TeacherClientWrapperProps) {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-brand-600 via-sky-600 to-indigo-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <span>Kelola Data Guru (Miss)</span>
            {activeBranchName && (
              <span className="text-brand-100 font-normal text-lg sm:text-xl">
                ({activeBranchName})
              </span>
            )}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-sky-100 max-w-2xl leading-relaxed">
            Daftar guru yang Anda tambahkan di sini akan otomatis menjadi opsi pilihan dropdown pada saat pengisian Laporan Perkembangan Siswa.
          </p>
        </div>
      </div>

      <TeacherManager teachers={teachers} />
    </div>
  );
}
