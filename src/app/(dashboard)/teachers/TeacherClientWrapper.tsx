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
      {/* Judul halaman: hero biru solid selaras dashboard Hallo. */}
      <div className="overflow-hidden rounded-2xl bg-brand-600 border border-brand-700/30 shadow-sm">
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium text-white/85">
            {activeBranchName ? `Cabang ${activeBranchName}` : "Data guru"}
          </p>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Kelola Data Guru (Miss)
          </h1>
          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-white/85">
            Daftar guru yang Anda tambahkan di sini akan otomatis menjadi opsi
            pilihan dropdown pada saat pengisian Laporan Perkembangan Siswa.
          </p>
        </div>
      </div>

      <TeacherManager teachers={teachers} />
    </div>
  );
}
