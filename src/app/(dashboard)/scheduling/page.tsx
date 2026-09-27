import { Suspense } from "react";
import { getStudents, getClasses, getMonthlySchedules, getCurrentUserRole, getBranchId, getActiveBranchName } from "@/lib/actions";
import { SchedulingClientWrapper } from "./SchedulingClientWrapper";
import { NoBranchSelected } from "@/components/ui/NoBranchSelected";

export const dynamic = 'force-dynamic';

export default async function SchedulingPage({ searchParams }: { searchParams: Promise<{ month?: string, year?: string }> }) {
  // Gate cepat & kecil (hasil sama): superadmin wajib pilih cabang dulu.
  const [role, branchId] = await Promise.all([
    getCurrentUserRole(),
    getBranchId(),
  ]);
  if (role === 'SUPERADMIN' && !branchId) {
    return <NoBranchSelected pageName="Penjadwalan Siswa" />;
  }

  const params = await searchParams;
  const currentMonth = params.month ? parseInt(params.month) : new Date().getMonth() + 1; // 1-12
  const currentYear = params.year ? parseInt(params.year) : new Date().getFullYear();

  // Nama cabang kecil & cepat (1 select) agar header langsung tampil.
  const activeBranchName = role === 'SUPERADMIN' ? await getActiveBranchName() : null;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Judul halaman: satu kartu putih seperti halaman lain.
          Tanpa blok biru penuh dan tanpa dekorasi blur. */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">
            {activeBranchName ? `Cabang ${activeBranchName}` : "Penjadwalan"}
          </p>
          <h2 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Penjadwalan Siswa
          </h2>
          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-slate-500 dark:text-zinc-400">
            Kelola jadwal pendaftaran siswa ke kelas secara manual ataupun otomatis.
          </p>
        </div>
      </div>

      {/* Tiga query berat di-streaming (hasil & props sama persis). */}
      <Suspense fallback={<SchedulingDataSkeleton />}>
        <SchedulingData currentMonth={currentMonth} currentYear={currentYear} />
      </Suspense>
    </div>
  );
}

// Query berat: students + classes + schedules bulan berjalan (paralel, sama).
async function SchedulingData({
  currentMonth,
  currentYear,
}: {
  currentMonth: number;
  currentYear: number;
}) {
  const [students, classes, schedules] = await Promise.all([
    getStudents(),
    getClasses(),
    getMonthlySchedules(currentYear, currentMonth),
  ]);

  return (
    <SchedulingClientWrapper
      students={students}
      classes={classes}
      schedules={schedules}
      currentMonth={currentMonth}
      currentYear={currentYear}
    />
  );
}

function SchedulingDataSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-24 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800" />
      <div className="h-96 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800" />
    </div>
  );
}
