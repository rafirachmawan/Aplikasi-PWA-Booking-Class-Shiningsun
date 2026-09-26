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
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Card - Unified Design */}
      <div className="rounded-3xl bg-brand-600 p-6 sm:p-10 shadow-lg relative overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-400 opacity-20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10">
          <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-snug flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span>Penjadwalan Siswa</span>
            {activeBranchName && (
              <span className="text-brand-100 font-normal text-base sm:text-xl lg:text-2xl">
                ({activeBranchName})
              </span>
            )}
          </h2>
          <p className="text-brand-100 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
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
      <div className="h-24 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
      <div className="h-96 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />
    </div>
  );
}
